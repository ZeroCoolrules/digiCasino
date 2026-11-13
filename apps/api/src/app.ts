import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { errorHandler } from "./middleware/errorHandler";
import { ApiError } from "./lib/errors";
import authRoutes from "./modules/auth/auth.routes";
import healthRoutes from "./modules/health/health.routes";
import gameRoutes from "./modules/game/game.routes";
import walletRoutes from "./modules/wallet/wallet.routes";
import adminRoutes from "./modules/admin/admin.routes";
import profileRoutes from "./modules/profile/profile.routes";

const API_BASE_PATH = "/api/v1";

export function createApp(): Express {
  const app = express();

  // CORS: the web app is deployed as a separate origin from this API (e.g. a Vercel
  // static site calling a Vercel serverless function), so every response needs these
  // headers. Reflecting the request's Origin (rather than a hardcoded "*") keeps this
  // correct for local dev, preview deployments, and production without configuration.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  app.use(API_BASE_PATH, healthRoutes);
  app.use(`${API_BASE_PATH}/auth`, authRoutes);
  app.use(`${API_BASE_PATH}/games`, gameRoutes);
  app.use(`${API_BASE_PATH}/wallet`, walletRoutes);
  app.use(`${API_BASE_PATH}/admin`, adminRoutes);
  app.use(`${API_BASE_PATH}/profile`, profileRoutes);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new ApiError(404, "NOT_FOUND", "The requested route does not exist."));
  });

  app.use(errorHandler);

  return app;
}
