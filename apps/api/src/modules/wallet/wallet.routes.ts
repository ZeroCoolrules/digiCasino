import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { LedgerEntry } from "@prisma/client";
import { requireAuth } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";
import { listLedgerEntriesForUser } from "./wallet.service";

const router = Router();

function serializeEntry(entry: LedgerEntry) {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
  };
}

// GET /api/v1/wallet/transactions — the authenticated user's ledger, newest first.
router.get("/transactions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const entries = await listLedgerEntriesForUser(prisma, userId);
    res.status(200).json({ transactions: entries.map(serializeEntry) });
  } catch (err) {
    next(err);
  }
});

export default router;
