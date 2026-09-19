import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { Game } from "@prisma/client";
import { requireAuth } from "../auth/auth.middleware";
import { requireAdmin } from "./admin.middleware";
import {
  adjustPlayerCredits,
  getOperationalSummary,
  listAllGames,
  listAllPlayers,
  listAuditLog,
  updateGame,
  type AuditLogEntryWithEmails,
  type CreditAdjustmentResult,
  type PlayerWithWallet,
  type UpdateGamePatch,
} from "./admin.service";

const router = Router();

router.use(requireAuth, requireAdmin);

function serializeGame(game: Game) {
  return {
    id: game.id,
    slug: game.slug,
    name: game.name,
    description: game.description,
    minBet: game.minBet,
    maxBet: game.maxBet,
    isActive: game.isActive,
  };
}

function serializePlayer(player: PlayerWithWallet) {
  return {
    id: player.id,
    email: player.email,
    role: player.role,
    createdAt: player.createdAt.toISOString(),
    wallet: player.wallet ? { balance: player.wallet.balance, currency: player.wallet.currency } : null,
  };
}

function serializeAuditLogEntry(entry: AuditLogEntryWithEmails) {
  return {
    id: entry.id,
    adminUserId: entry.adminUserId,
    adminEmail: entry.adminEmail,
    action: entry.action,
    targetUserId: entry.targetUserId,
    targetEmail: entry.targetEmail,
    amount: entry.amount,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
  };
}

function serializeCreditAdjustment(result: CreditAdjustmentResult) {
  return {
    wallet: { balance: result.wallet.balance, currency: result.wallet.currency },
    auditLogEntry: {
      id: result.auditLogEntry.id,
      action: result.auditLogEntry.action,
      targetUserId: result.auditLogEntry.targetUserId,
      amount: result.auditLogEntry.amount,
      reason: result.auditLogEntry.reason,
      createdAt: result.auditLogEntry.createdAt.toISOString(),
    },
  };
}

// GET /api/v1/admin/games — all games, including inactive.
router.get("/games", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const games = await listAllGames();
    res.status(200).json({ games: games.map(serializeGame) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/games/:slug — partial update of a game's catalog fields.
router.patch("/games/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminUserId = req.userId as string;
    const { slug } = req.params;
    const { name, description, minBet, maxBet, isActive } = (req.body ?? {}) as UpdateGamePatch;

    const game = await updateGame(adminUserId, slug, { name, description, minBet, maxBet, isActive });
    res.status(200).json({ game: serializeGame(game) });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/players — all players with wallet info.
router.get("/players", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const players = await listAllPlayers();
    res.status(200).json({ players: players.map(serializePlayer) });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/players/:userId/credit-adjustments — admin-initiated demo-credit adjustment.
router.post("/players/:userId/credit-adjustments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminUserId = req.userId as string;
    const { userId: targetUserId } = req.params;
    const { type, amount, reason } = (req.body ?? {}) as { type?: unknown; amount?: unknown; reason?: unknown };

    const result = await adjustPlayerCredits(adminUserId, targetUserId, type, amount, reason);
    res.status(201).json(serializeCreditAdjustment(result));
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/audit-log — newest first, with admin/target emails joined in.
router.get("/audit-log", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await listAuditLog();
    res.status(200).json({ entries: entries.map(serializeAuditLogEntry) });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/reports/summary — basic operational reporting.
router.get("/reports/summary", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await getOperationalSummary();
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

export default router;
