import type { Prisma, PrismaClient, Wallet, LedgerEntry } from "@prisma/client";
import { ApiError } from "../../lib/errors";

/**
 * Wallet module — the ONLY code in this codebase allowed to create or mutate `Wallet` and
 * `LedgerEntry` rows (see AGENTS.md / SYSTEM_ARCHITECTURE.md). Task 001 added wallet creation on
 * registration; Task 002 adds generic debit/credit settlement for game sessions, plus a
 * transaction-history query. Callers (auth, game modules) never touch these tables directly.
 */

/** Starting demo-credit balance granted to every newly registered user. */
export const STARTING_DEMO_BALANCE = 1000;
export const DEFAULT_WALLET_CURRENCY = "DEMO";

const INITIAL_GRANT_REASON = "initial_demo_grant";

type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Creates a wallet for a newly registered user and records the matching initial-grant ledger
 * entry in the same call, so the wallet balance is always backed by an append-only ledger entry
 * from the moment it is created. Intended to be called from within the same transaction that
 * creates the `User` row.
 */
export async function createWalletForUser(client: PrismaClientOrTx, userId: string): Promise<Wallet> {
  const wallet = await client.wallet.create({
    data: {
      userId,
      balance: STARTING_DEMO_BALANCE,
      currency: DEFAULT_WALLET_CURRENCY,
    },
  });

  await client.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      type: "CREDIT",
      amount: STARTING_DEMO_BALANCE,
      reason: INITIAL_GRANT_REASON,
    },
  });

  return wallet;
}

/** Fetches the wallet belonging to a given user, or `null` if none exists. */
export async function getWalletByUserId(client: PrismaClientOrTx, userId: string): Promise<Wallet | null> {
  return client.wallet.findUnique({ where: { userId } });
}

/**
 * Debits `amount` demo credits from the given user's wallet and records a matching append-only
 * DEBIT ledger entry. Throws `ApiError(400, "INSUFFICIENT_BALANCE", ...)` if the debit would take
 * the balance negative. Must be called from within an existing Prisma transaction (`client` is a
 * `Prisma.TransactionClient`) so the debit and its caller's other writes (e.g. creating a
 * GameSession) commit or roll back together.
 */
export async function debitWallet(
  client: PrismaClientOrTx,
  userId: string,
  amount: number,
  reason: string,
): Promise<Wallet> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Debit amount must be a positive integer.");
  }

  const wallet = await client.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new ApiError(404, "WALLET_NOT_FOUND", "No wallet found for this user.");
  }
  if (wallet.balance < amount) {
    throw new ApiError(400, "INSUFFICIENT_BALANCE", "Wallet balance is insufficient for this debit.");
  }

  const updated = await client.wallet.update({
    where: { id: wallet.id },
    data: { balance: { decrement: amount } },
  });

  await client.ledgerEntry.create({
    data: { walletId: wallet.id, type: "DEBIT", amount, reason },
  });

  return updated;
}

/**
 * Credits `amount` demo credits to the given user's wallet and records a matching append-only
 * CREDIT ledger entry. Must be called from within an existing Prisma transaction. Callers should
 * not call this with `amount <= 0` — skip the call entirely for zero-payout outcomes so no
 * zero-amount ledger entries are ever created.
 */
export async function creditWallet(
  client: PrismaClientOrTx,
  userId: string,
  amount: number,
  reason: string,
): Promise<Wallet> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Credit amount must be a positive integer.");
  }

  const wallet = await client.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new ApiError(404, "WALLET_NOT_FOUND", "No wallet found for this user.");
  }

  const updated = await client.wallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: amount } },
  });

  await client.ledgerEntry.create({
    data: { walletId: wallet.id, type: "CREDIT", amount, reason },
  });

  return updated;
}

/** Returns the given user's ledger entries (via their wallet), newest first. */
export async function listLedgerEntriesForUser(client: PrismaClientOrTx, userId: string): Promise<LedgerEntry[]> {
  const wallet = await client.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return [];
  }
  return client.ledgerEntry.findMany({
    where: { walletId: wallet.id },
    // Secondary sort by id (Prisma's cuid()s are monotonically increasing) guarantees a stable
    // newest-first order even when two entries land in the same millisecond.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}
