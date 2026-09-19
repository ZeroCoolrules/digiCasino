import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User, Wallet } from "@prisma/client";
import { env } from "../../config/env";
import { ApiError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { createWalletForUser, getWalletByUserId } from "../wallet/wallet.service";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

export interface AuthTokenPayload {
  sub: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AuthTokenPayload, env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

/** True if `email` (already normalized/lowercased) is configured as an admin via ADMIN_EMAILS. */
function isConfiguredAdminEmail(email: string): boolean {
  return env.ADMIN_EMAILS.has(email);
}

/**
 * Registers a new user and provisions their wallet (via the wallet module) atomically. Never
 * mutates wallet/ledger fields directly — delegates to `createWalletForUser`. Users whose email
 * matches `ADMIN_EMAILS` are created with the ADMIN role directly (see `config/env.ts`).
 */
export async function registerUser(email: string, password: string): Promise<{ user: User; wallet: Wallet }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const role = isConfiguredAdminEmail(email) ? "ADMIN" : "PLAYER";

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, passwordHash, role } });
    const wallet = await createWalletForUser(tx, user.id);
    return { user, wallet };
  });
}

/**
 * Logs a user in. If their email is in `ADMIN_EMAILS` but their existing account is still a
 * PLAYER (e.g. they registered before being added to the list, or before this feature existed),
 * they are promoted to ADMIN here so operators never need direct database access to bootstrap
 * the first admin account.
 */
export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  if (user.role !== "ADMIN" && isConfiguredAdminEmail(email)) {
    user = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  return { user, token: signToken(user.id) };
}

export async function getUserWithWallet(userId: string): Promise<{ user: User; wallet: Wallet | null }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  }

  const wallet = await getWalletByUserId(prisma, userId);
  return { user, wallet };
}
