import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

/**
 * Requires that the authenticated user (populated by `requireAuth`, which MUST run before this
 * middleware on every admin route) has the ADMIN role. Looks the user up fresh by `req.userId`
 * rather than trusting the JWT payload, so a role change or account deletion takes effect
 * immediately without waiting for the token to expire.
 */
export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    next(new ApiError(401, "UNAUTHORIZED", "Missing or invalid Authorization header."));
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "ADMIN") {
      next(new ApiError(403, "FORBIDDEN", "This action requires admin privileges."));
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
