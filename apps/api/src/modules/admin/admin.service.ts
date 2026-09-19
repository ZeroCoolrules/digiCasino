import type { AuditLogEntry, Game, User, Wallet } from "@prisma/client";
import { ApiError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { creditWallet, debitWallet } from "../wallet/wallet.service";

const CREDIT_ADJUSTMENT_REASON_PREFIX = "admin_adjustment:";

/** Returns every game in the catalog (active and inactive), oldest first. */
export async function listAllGames(): Promise<Game[]> {
  return prisma.game.findMany({ orderBy: { createdAt: "asc" } });
}

export interface UpdateGamePatch {
  name?: string;
  description?: string;
  minBet?: number;
  maxBet?: number;
  isActive?: boolean;
}

/**
 * Partially updates a game's catalog fields and records a `GAME_UPDATED` audit log entry
 * describing what changed, in the same transaction as the update.
 */
export async function updateGame(adminUserId: string, slug: string, patch: UpdateGamePatch): Promise<Game> {
  const existing = await prisma.game.findUnique({ where: { slug } });
  if (!existing) {
    throw new ApiError(404, "GAME_NOT_FOUND", "No game found with this slug.");
  }

  const changedFields = Object.keys(patch).filter((key) => patch[key as keyof UpdateGamePatch] !== undefined);
  const reason =
    changedFields.length > 0
      ? `Updated ${slug}: ${changedFields.join(", ")}`
      : `Updated ${slug}: no fields changed`;

  return prisma.$transaction(async (tx) => {
    const game = await tx.game.update({
      where: { slug },
      data: {
        name: patch.name,
        description: patch.description,
        minBet: patch.minBet,
        maxBet: patch.maxBet,
        isActive: patch.isActive,
      },
    });

    await tx.auditLogEntry.create({
      data: {
        adminUserId,
        action: "GAME_UPDATED",
        targetUserId: null,
        amount: null,
        reason,
      },
    });

    return game;
  });
}

export interface PlayerWithWallet extends User {
  wallet: Wallet | null;
}

/** Returns every player (User) row with their wallet joined, oldest first. */
export async function listAllPlayers(): Promise<PlayerWithWallet[]> {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" }, include: { wallet: true } });
}

export type CreditAdjustmentType = "CREDIT" | "DEBIT";

export interface CreditAdjustmentResult {
  wallet: Wallet;
  auditLogEntry: AuditLogEntry;
}

/**
 * Applies an admin-initiated demo-credit adjustment to a player's wallet, via the wallet module's
 * `debitWallet`/`creditWallet` (never direct Prisma writes), and records a matching audit log
 * entry in the same transaction. Never mutates `Wallet`/`LedgerEntry` directly.
 */
export async function adjustPlayerCredits(
  adminUserId: string,
  targetUserId: string,
  type: unknown,
  amount: unknown,
  reason: unknown,
): Promise<CreditAdjustmentResult> {
  if (type !== "CREDIT" && type !== "DEBIT") {
    throw new ApiError(400, "VALIDATION_ERROR", "type must be 'CREDIT' or 'DEBIT'.");
  }
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "amount must be a positive integer.");
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "reason is required.");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new ApiError(404, "USER_NOT_FOUND", "No user found with this id.");
  }

  const ledgerReason = `${CREDIT_ADJUSTMENT_REASON_PREFIX}${adminUserId}`;

  return prisma.$transaction(async (tx) => {
    const wallet =
      type === "CREDIT"
        ? await creditWallet(tx, targetUserId, amount, ledgerReason)
        : await debitWallet(tx, targetUserId, amount, ledgerReason);

    const auditLogEntry = await tx.auditLogEntry.create({
      data: {
        adminUserId,
        action: type === "CREDIT" ? "CREDIT_ADJUSTMENT" : "DEBIT_ADJUSTMENT",
        targetUserId,
        amount,
        reason,
      },
    });

    return { wallet, auditLogEntry };
  });
}

export interface AuditLogEntryWithEmails {
  id: string;
  adminUserId: string;
  adminEmail: string | null;
  action: string;
  targetUserId: string | null;
  targetEmail: string | null;
  amount: number | null;
  reason: string;
  createdAt: Date;
}

/** Returns every audit log entry, newest first, joined with admin/target user emails. */
export async function listAuditLog(): Promise<AuditLogEntryWithEmails[]> {
  const entries = await prisma.auditLogEntry.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { adminUser: true },
  });

  const targetUserIds = Array.from(
    new Set(entries.map((entry) => entry.targetUserId).filter((id): id is string => id !== null)),
  );
  const targetUsers =
    targetUserIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: targetUserIds } } })
      : [];
  const targetEmailById = new Map(targetUsers.map((user) => [user.id, user.email]));

  return entries.map((entry) => ({
    id: entry.id,
    adminUserId: entry.adminUserId,
    adminEmail: entry.adminUser.email,
    action: entry.action,
    targetUserId: entry.targetUserId,
    targetEmail: entry.targetUserId ? targetEmailById.get(entry.targetUserId) ?? null : null,
    amount: entry.amount,
    reason: entry.reason,
    createdAt: entry.createdAt,
  }));
}

export interface OperationalSummary {
  playerCount: number;
  activeGameCount: number;
  totalGameCount: number;
  sessionCount: number;
  completedSessionCount: number;
  ledgerEntryCount: number;
  totalCreditsInCirculation: number;
}

/** Computes basic operational reporting figures via aggregate queries. */
export async function getOperationalSummary(): Promise<OperationalSummary> {
  const [
    playerCount,
    activeGameCount,
    totalGameCount,
    sessionCount,
    completedSessionCount,
    ledgerEntryCount,
    balanceAggregate,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.game.count({ where: { isActive: true } }),
    prisma.game.count(),
    prisma.gameSession.count(),
    prisma.gameSession.count({ where: { status: "COMPLETED" } }),
    prisma.ledgerEntry.count(),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
  ]);

  return {
    playerCount,
    activeGameCount,
    totalGameCount,
    sessionCount,
    completedSessionCount,
    ledgerEntryCount,
    totalCreditsInCirculation: balanceAggregate._sum.balance ?? 0,
  };
}
