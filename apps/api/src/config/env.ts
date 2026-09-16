import path from "node:path";
import dotenv from "dotenv";

// Load the shared, repo-root .env file if present (see .env.example at the repo root).
// This is optional: sensible defaults below let `dev`/`test` work out of the box even without
// a .env file, which keeps the sandboxed/CI experience simple.
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const DEFAULT_DATABASE_URL = "file:./dev.db";
const DEFAULT_JWT_SECRET = "dev-insecure-secret-change-me";
const DEFAULT_PORT = 4000;

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
}

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    "[digiCasino-api] JWT_SECRET is not set; using an insecure development default. " +
      "Set JWT_SECRET in your .env file before deploying anywhere real.",
  );
  process.env.JWT_SECRET = DEFAULT_JWT_SECRET;
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT ?? DEFAULT_PORT),
};
