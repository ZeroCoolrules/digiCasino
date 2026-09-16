import type { ErrorRequestHandler } from "express";
import { ApiError } from "../lib/errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: { message: "Internal server error.", code: "INTERNAL_ERROR" } });
};
