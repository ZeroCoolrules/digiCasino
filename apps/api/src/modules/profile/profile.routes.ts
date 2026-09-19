import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { changePassword, getProfile, type ProfileResult } from "./profile.service";

const router = Router();

router.use(requireAuth);

function serializeProfile(profile: ProfileResult) {
  return {
    user: {
      id: profile.user.id,
      email: profile.user.email,
      role: profile.user.role,
      createdAt: profile.user.createdAt.toISOString(),
    },
    wallet: profile.wallet
      ? { balance: profile.wallet.balance, currency: profile.wallet.currency }
      : null,
    stats: profile.stats,
  };
}

// GET /api/v1/profile — account info, wallet balance, and lifetime play stats.
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const profile = await getProfile(userId);
    res.status(200).json(serializeProfile(profile));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/profile/password — change the current user's password.
router.patch("/password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const { currentPassword, newPassword } = (req.body ?? {}) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    await changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
