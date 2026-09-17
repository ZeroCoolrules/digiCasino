import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { errorHandler } from "./middleware/errorHandler";
import { ApiError } from "./lib/errors";
import authRoutes from "./modules/auth/auth.routes";
import healthRoutes from "./modules/health/health.routes";
import gameRoutes from "./modules/game/game.routes";
import walletRoutes from "./modules/wallet/wallet.routes";

const API_BASE_PATH = "/api/v1";

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use(API_BASE_PATH, healthRoutes);
  app.use(`${API_BASE_PATH}/auth`, authRoutes);
  app.use(`${API_BASE_PATH}/games`, gameRoutes);
  app.use(`${API_BASE_PATH}/wallet`, walletRoutes);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new ApiError(404, "NOT_FOUND", "The requested route does not exist."));
  });

  app.use(errorHandler);

  return app;
}
