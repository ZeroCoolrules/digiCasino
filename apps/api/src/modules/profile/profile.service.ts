import bcrypt from "bcryptjs";
import type { User, Wallet } from "@prisma/client";
import { ApiError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { getWalletByUserId } from "../wallet/wallet.service";

/**
 * Profile module (Task 004) — purely additive read/aggregate + password-change functionality.
 * No new tables (see ADR-006): account info comes from `User`, balance from `Wallet` (via the
 * wallet module), and lifetime play stats are computed on-demand from the user's `COMPLETED`
 * `GameSession` rows. Password changes reuse the same bcrypt compare/hash pattern as
 * `auth.service.ts`, keeping `passwordHash` reads/writes limited to auth-adjacent code.
 */

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

export interface ProfileStats {
  totalSessions: number;
  totalWagered: number;
  totalPayout: number;
  netResult: number;
}

export interface ProfileResult {
  user: User;
  wallet: Wallet | null;
  stats: ProfileStats;
}

/**
 * Computes lifetime play stats for a user from their `COMPLETED` `GameSession` rows via a
 * Prisma aggregate query (never loads all rows into memory). Prisma returns `null` sums when
 * there are no matching rows, which are normalized to 0 here.
 */
async function computeProfileStats(userId: string): Promise<ProfileStats> {
  const aggregate = await prisma.gameSession.aggregate({
    where: { userId, status: "COMPLETED" },
    _count: true,
    _sum: { bet: true, payout: true },
  });

  const totalSessions = aggregate._count;
  const totalWagered = aggregate._sum.bet ?? 0;
  const totalPayout = aggregate._sum.payout ?? 0;

  return {
    totalSessions,
    totalWagered,
    totalPayout,
    netResult: totalPayout - totalWagered,
  };
}

/** Loads a user's account info, wallet, and lifetime play stats for the profile page. */
export async function getProfile(userId: string): Promise<ProfileResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  }

  const [wallet, stats] = await Promise.all([
    getWalletByUserId(prisma, userId),
    computeProfileStats(userId),
  ]);

  return { user, wallet, stats };
}

/**
 * Changes a user's password after verifying `currentPassword` against the stored hash (bcrypt,
 * same as `auth.service.ts`'s `loginUser`). Validates `newPassword` length before hashing and
 * persisting it.
 */
export async function changePassword(
  userId: string,
  currentPassword: unknown,
  newPassword: unknown,
): Promise<void> {
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw new ApiError(400, "VALIDATION_ERROR", "currentPassword and newPassword are required.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid current password.");
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
