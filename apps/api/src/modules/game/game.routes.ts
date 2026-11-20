import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { Game, GameSession } from "@prisma/client";
import { requireAuth } from "../auth/auth.middleware";
import { listActiveGames, playGameSession, startGameSession } from "./game.service";

const router = Router();

function serializeGame(game: Game) {
  return {
    slug: game.slug,
    name: game.name,
    description: game.description,
    minBet: game.minBet,
    maxBet: game.maxBet,
    gameType: (game as unknown as { gameType: string }).gameType ?? "slots",
  };
}

function serializeSession(session: GameSession) {
  return {
    id: session.id,
    gameId: session.gameId,
    status: session.status,
    bet: session.bet,
    payout: session.payout,
    result: session.result ? JSON.parse(session.result) : null,
  };
}

// GET /api/v1/games — public catalog listing, no auth required.
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const games = await listActiveGames();
    res.status(200).json({ games: games.map(serializeGame) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/games/:slug/sessions — start a new session, debiting the bet.
// Body: { bet: number, move?: unknown }
// `move` is required for dice-roll (target + direction) and high-low (direction).
router.post("/:slug/sessions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const { slug } = req.params;
    const { bet, move } = (req.body ?? {}) as { bet?: unknown; move?: unknown };

    const session = await startGameSession(userId, slug, bet, move);
    res.status(201).json({ session: serializeSession(session) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/games/sessions/:id/play — resolve a PENDING session.
router.post("/sessions/:id/play", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    const { session, balance, currency } = await playGameSession(userId, id);
    res.status(200).json({ session: serializeSession(session), wallet: { balance, currency } });
  } catch (err) {
    next(err);
  }
});

export default router;
