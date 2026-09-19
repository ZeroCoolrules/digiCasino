import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../lib/errors";
import { requireAuth } from "./auth.middleware";
import { getUserWithWallet, loginUser, registerUser } from "./auth.service";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function serializeUser(user: { id: string; email: string; role: string; createdAt: Date }) {
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() };
}

function serializeWallet(wallet: { balance: number; currency: string } | null) {
  return wallet ? { balance: wallet.balance, currency: wallet.currency } : null;
}

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };

    if (typeof email !== "string" || typeof password !== "string" || !EMAIL_RE.test(email)) {
      throw new ApiError(400, "VALIDATION_ERROR", "A valid email and password are required.");
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { user, wallet } = await registerUser(normalizedEmail, password);

    res.status(201).json({
      user: serializeUser(user),
      wallet: serializeWallet(wallet),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };

    if (typeof email !== "string" || typeof password !== "string") {
      throw new ApiError(400, "VALIDATION_ERROR", "Email and password are required.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { user, token } = await loginUser(normalizedEmail, password);

    res.status(200).json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const { user, wallet } = await getUserWithWallet(userId);

    res.status(200).json({
      user: serializeUser(user),
      wallet: serializeWallet(wallet),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
