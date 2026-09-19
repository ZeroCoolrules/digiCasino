import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";

/** Deletes all rows in FK-safe order so each test starts from a clean database. */
export async function resetDatabase(): Promise<void> {
  await prisma.auditLogEntry.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.gameSession.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
