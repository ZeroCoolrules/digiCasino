import type { Prisma, PrismaClient, Wallet } from "@prisma/client";

/**
 * Wallet module — the ONLY code in this codebase allowed to create or mutate `Wallet` and
 * `LedgerEntry` rows (see AGENTS.md / SYSTEM_ARCHITECTURE.md). Task 001 only needs wallet
 * creation on registration; settlement logic (debits/credits from gameplay) is Task 002 scope
 * and will be added here without requiring callers (e.g. the auth module) to change.
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
