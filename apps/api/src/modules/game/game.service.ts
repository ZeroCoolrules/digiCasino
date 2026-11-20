import type { Game, GameSession } from "@prisma/client";
import { ApiError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { creditWallet, debitWallet } from "../wallet/wallet.service";
import { spin } from "./slotMachine";
import { parseDiceInput, rollDice } from "./diceRoll";
import { parseHighLowInput, playHighLow } from "./highLow";

const SESSION_DEBIT_REASON_PREFIX = "game_session_bet:";
const SESSION_CREDIT_REASON_PREFIX = "game_session_payout:";

/** Returns all active (isActive=true) catalog games. */
export async function listActiveGames(): Promise<Game[]> {
  return prisma.game.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
}

/**
 * Starts a new game session: validates the bet against the game's min/max, debits the bet from
 * the player's wallet, and creates a PENDING session — all in one transaction, so a rejected
 * debit (insufficient balance) never leaves an orphaned session behind.
 *
 * For games that require a pre-bet move (dice-roll, high-low), the `move` parameter
 * carries the player's choice. It is validated here before money moves so invalid inputs
 * are rejected cheaply (before a DB transaction).
 */
export async function startGameSession(
  userId: string,
  slug: string,
  bet: unknown,
  move?: unknown,
): Promise<GameSession> {
  if (typeof bet !== "number" || !Number.isInteger(bet)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Bet must be an integer.");
  }

  const game = await prisma.game.findUnique({ where: { slug } });
  if (!game || !game.isActive) {
    throw new ApiError(404, "GAME_NOT_FOUND", "No active game found with this slug.");
  }

  if (bet < game.minBet || bet > game.maxBet) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `Bet must be between ${game.minBet} and ${game.maxBet} for this game.`,
    );
  }

  // Validate move for games that need it before opening a transaction.
  const gameType: string = (game as unknown as { gameType: string }).gameType ?? "slots";
  if (gameType === "dice-roll") {
    try {
      parseDiceInput(move);
    } catch (err) {
      throw new ApiError(400, "VALIDATION_ERROR", (err as Error).message);
    }
  } else if (gameType === "high-low") {
    try {
      parseHighLowInput(move);
    } catch (err) {
      throw new ApiError(400, "VALIDATION_ERROR", (err as Error).message);
    }
  }

  return prisma.$transaction(async (tx) => {
    // Serialise the validated move into the session so playGameSession can read it back.
    const moveJson = move !== undefined ? JSON.stringify(move) : null;

    const session = await tx.gameSession.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { userId, gameId: game.id, bet, status: "PENDING", move: moveJson } as any,
    });

    // debitWallet throws ApiError(400, INSUFFICIENT_BALANCE, ...) if funds are short, which
    // rolls back this entire transaction (including the session row created above).
    await debitWallet(tx, userId, bet, `${SESSION_DEBIT_REASON_PREFIX}${session.id}`);

    return session;
  });
}

export interface PlaySessionResult {
  session: GameSession;
  balance: number;
  currency: string;
}

/**
 * Resolves ("plays") a PENDING session server-side.
 *
 * Dispatches to the appropriate game engine based on the game's `gameType` field:
 *   - "slots"     → 3-reel slot machine (original ADR-004 engine)
 *   - "dice-roll" → Dice Roll (rollDice, bob/digicasino-games)
 *   - "high-low"  → High-Low Cards (playHighLow, bob/digicasino-games)
 *
 * Idempotent against double-settlement: the status transition uses a conditional
 * `updateMany` (`where: { id, status: 'PENDING' }`) so a second concurrent or
 * sequential call sees `count === 0` and is rejected with 409.
 */
export async function playGameSession(userId: string, sessionId: string): Promise<PlaySessionResult> {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { game: true },
  });
  if (!session) {
    throw new ApiError(404, "SESSION_NOT_FOUND", "No game session found with this id.");
  }
  if (session.userId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "This game session does not belong to you.");
  }
  if (session.status !== "PENDING") {
    throw new ApiError(409, "SESSION_ALREADY_SETTLED", "This game session has already been settled.");
  }

  const game = session.game;
  const gameType: string = (game as unknown as { gameType: string }).gameType ?? "slots";
  const move = (session as unknown as { move: string | null }).move;
  const parsedMove = move ? (JSON.parse(move) as unknown) : undefined;

  // Resolve the outcome via the appropriate engine.
  let outcomeResult: { payout: number; result: unknown };
  if (gameType === "dice-roll") {
    const input = parseDiceInput(parsedMove);
    const r = rollDice(session.bet, input);
    outcomeResult = { payout: r.payout, result: r };
  } else if (gameType === "high-low") {
    const input = parseHighLowInput(parsedMove);
    const r = playHighLow(session.bet, input);
    outcomeResult = { payout: r.payout, result: r };
  } else {
    // Default: slots
    const r = spin(session.bet);
    outcomeResult = { payout: r.payout, result: r };
  }

  const { payout } = outcomeResult;
  const resultJson = JSON.stringify(outcomeResult.result);

  const result = await prisma.$transaction(async (tx) => {
    // Conditional update is the actual idempotency guarantee: if another request already
    // settled this session between our read above and now, `count` will be 0 here.
    const { count } = await tx.gameSession.updateMany({
      where: { id: sessionId, status: "PENDING" },
      data: {
        status: "COMPLETED",
        payout,
        result: resultJson,
        settledAt: new Date(),
      },
    });

    if (count === 0) {
      throw new ApiError(409, "SESSION_ALREADY_SETTLED", "This game session has already been settled.");
    }

    if (payout > 0) {
      await creditWallet(tx, userId, payout, `${SESSION_CREDIT_REASON_PREFIX}${sessionId}`);
    }

    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new ApiError(404, "WALLET_NOT_FOUND", "No wallet found for this user.");
    }

    const settledSession = await tx.gameSession.findUniqueOrThrow({ where: { id: sessionId } });

    return { session: settledSession, balance: wallet.balance, currency: wallet.currency };
  });

  return result;
}
