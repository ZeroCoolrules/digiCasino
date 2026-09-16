import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { STARTING_DEMO_BALANCE } from "../src/modules/wallet/wallet.service";

const app = createApp();

const VALID_PASSWORD = "correct-horse-battery-staple";

function uniqueEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe("POST /api/v1/auth/register", () => {
  it("creates a user and a wallet with the starting demo balance", async () => {
    const email = uniqueEmail();

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: VALID_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email });
    expect(res.body.user.id).toEqual(expect.any(String));
    expect(res.body.wallet).toEqual({ balance: STARTING_DEMO_BALANCE, currency: "DEMO" });
  });

  it("rejects a duplicate email with 409", async () => {
    const email = uniqueEmail();

    await request(app).post("/api/v1/auth/register").send({ email, password: VALID_PASSWORD });

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: VALID_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("rejects an invalid email / short password with 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with correct credentials and returns a token", async () => {
    const email = uniqueEmail();
    await request(app).post("/api/v1/auth/register").send({ email, password: VALID_PASSWORD });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: VALID_PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user).toMatchObject({ email });
  });

  it("rejects an incorrect password with 401", async () => {
    const email = uniqueEmail();
    await request(app).post("/api/v1/auth/register").send({ email, password: VALID_PASSWORD });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the current user and wallet when authorized", async () => {
    const email = uniqueEmail();
    await request(app).post("/api/v1/auth/register").send({ email, password: VALID_PASSWORD });
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: VALID_PASSWORD });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email });
    expect(res.body.wallet).toEqual({ balance: STARTING_DEMO_BALANCE, currency: "DEMO" });
  });

  it("rejects requests without a token with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects requests with an invalid token with 401", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});
