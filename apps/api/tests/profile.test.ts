import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

const VALID_PASSWORD = "correct-horse-battery-staple";
const DEMO_SLOTS_SLUG = "demo-slots";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(prefix = "profile-test"): Promise<{ token: string; email: string; id: string }> {
  const email = uniqueEmail(prefix);
  await request(app).post("/api/v1/auth/register").send({ email, password: VALID_PASSWORD });
  const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password: VALID_PASSWORD });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { token: loginRes.body.token as string, email, id: user.id };
}

describe("GET /api/v1/profile", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/profile");
    expect(res.status).toBe(401);
  });

  it("returns zeroed stats and the starting balance for a brand-new user", async () => {
    const { token, email, id } = await registerAndLogin();

    const res = await request(app).get("/api/v1/profile").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id, email, role: "PLAYER" });
    expect(res.body.wallet).toMatchObject({ balance: 1000, currency: "DEMO" });
    expect(res.body.stats).toEqual({
      totalSessions: 0,
      totalWagered: 0,
      totalPayout: 0,
      netResult: 0,
    });
  });

  it("returns correctly summed aggregated totals after multiple completed sessions", async () => {
    const { token, id } = await registerAndLogin();
    const game = await prisma.game.findUniqueOrThrow({ where: { slug: DEMO_SLOTS_SLUG } });

    // Insert several COMPLETED sessions directly, with distinct bet/payout amounts, to confirm
    // the aggregate query actually sums rather than just counting.
    await prisma.gameSession.createMany({
      data: [
        { userId: id, gameId: game.id, status: "COMPLETED", bet: 10, payout: 0 },
        { userId: id, gameId: game.id, status: "COMPLETED", bet: 20, payout: 200 },
        { userId: id, gameId: game.id, status: "COMPLETED", bet: 15, payout: 5 },
        // A PENDING session must be excluded from the aggregate.
        { userId: id, gameId: game.id, status: "PENDING", bet: 1000, payout: null },
      ],
    });

    const res = await request(app).get("/api/v1/profile").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({
      totalSessions: 3,
      totalWagered: 45, // 10 + 20 + 15
      totalPayout: 205, // 0 + 200 + 5
      netResult: 160, // 205 - 45
    });
  });
});

describe("PATCH /api/v1/profile/password", () => {
  it("changes the password so the new one works and the old one no longer does", async () => {
    const { token, email } = await registerAndLogin();
    const newPassword = "a-brand-new-password";

    const res = await request(app)
      .patch("/api/v1/profile/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: VALID_PASSWORD, newPassword });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const oldLogin = await request(app).post("/api/v1/auth/login").send({ email, password: VALID_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/api/v1/auth/login").send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toEqual(expect.any(String));
  });

  it("returns 401 INVALID_CREDENTIALS for a wrong current password and does not change it", async () => {
    const { token, email } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/profile/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "totally-wrong-password", newPassword: "another-new-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");

    const stillWorks = await request(app).post("/api/v1/auth/login").send({ email, password: VALID_PASSWORD });
    expect(stillWorks.status).toBe(200);
  });

  it("returns 400 VALIDATION_ERROR for a too-short new password", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .patch("/api/v1/profile/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: VALID_PASSWORD, newPassword: "abcd" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/v1/profile/password")
      .send({ currentPassword: VALID_PASSWORD, newPassword: "another-new-password" });
    expect(res.status).toBe(401);
  });
});
