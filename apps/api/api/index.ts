// Vercel serverless entry point. Deploys the same Express app used locally (apps/api/src/app.ts)
// as a single function; apps/api/vercel.json rewrites every request to this function so Express's
// own router can dispatch /api/v1/* internally.
import { createApp } from "../src/app";

const app = createApp();

export default app;
