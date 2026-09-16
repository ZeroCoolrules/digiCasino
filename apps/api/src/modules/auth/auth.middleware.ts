import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../lib/errors";
import { verifyToken } from "./auth.service";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const BEARER_PREFIX = "Bearer ";

/** Requires a valid `Authorization: Bearer <token>` header, populating `req.userId`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(new ApiError(401, "UNAUTHORIZED", "Missing or invalid Authorization header."));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new ApiError(401, "UNAUTHORIZED", "Invalid or expired token."));
  }
}
