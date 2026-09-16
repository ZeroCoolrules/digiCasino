import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  DEFAULT_WALLET_CURRENCY,
  STARTING_DEMO_BALANCE,
  createWalletForUser,
  getWalletByUserId,
} from "../src/modules/wallet/wallet.service";

async function createTestUser(email: string) {
  return prisma.user.create({ data: { email, passwordHash: "not-a-real-hash" } });
}

describe("wallet.service", () => {
  it("creates a wallet with the starting demo balance and a matching ledger entry", async () => {
    const user = await createTestUser("wallet-unit-test@example.com");

    const wallet = await createWalletForUser(prisma, user.id);

    expect(wallet.balance).toBe(STARTING_DEMO_BALANCE);
    expect(wallet.currency).toBe(DEFAULT_WALLET_CURRENCY);
    expect(wallet.userId).toBe(user.id);

    const ledgerEntries = await prisma.ledgerEntry.findMany({ where: { walletId: wallet.id } });
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0]).toMatchObject({
      type: "CREDIT",
      amount: STARTING_DEMO_BALANCE,
      reason: "initial_demo_grant",
    });
  });

  it("getWalletByUserId returns the created wallet", async () => {
    const user = await createTestUser("wallet-unit-test-2@example.com");
    const created = await createWalletForUser(prisma, user.id);

    const fetched = await getWalletByUserId(prisma, user.id);

    expect(fetched?.id).toBe(created.id);
  });

  it("getWalletByUserId returns null when no wallet exists", async () => {
    const user = await createTestUser("wallet-unit-test-3@example.com");

    const fetched = await getWalletByUserId(prisma, user.id);

    expect(fetched).toBeNull();
  });
});
