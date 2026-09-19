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

async function registerAndLogin(prefix = "admin-test"): Promise<{ token: string; email: string; id: string }> {
  const email = uniqueEmail(prefix);
  await request(app).post("/api/v1/auth/register").send({ email, password: VALID_PASSWORD });
  const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password: VALID_PASSWORD });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { token: loginRes.body.token as string, email, id: user.id };
}

/** Registers a user, promotes them to ADMIN directly via Prisma, then logs in for a fresh token. */
async function registerAndLoginAsAdmin(): Promise<{ token: string; email: string; id: string }> {
  const { email, id } = await registerAndLogin("admin");
  await prisma.user.update({ where: { id }, data: { role: "ADMIN" } });
  const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password: VALID_PASSWORD });
  return { token: loginRes.body.token as string, email, id };
}

describe("Admin route authorization", () => {
  it("rejects an unauthenticated request with 401 on every admin route", async () => {
    const routes: Array<[string, string]> = [
      ["get", "/api/v1/admin/games"],
      ["patch", `/api/v1/admin/games/${DEMO_SLOTS_SLUG}`],
      ["get", "/api/v1/admin/players"],
      ["post", "/api/v1/admin/players/some-id/credit-adjustments"],
      ["get", "/api/v1/admin/audit-log"],
      ["get", "/api/v1/admin/reports/summary"],
    ];

    for (const [method, path] of routes) {
      const res = await (request(app) as unknown as Record<string, (p: string) => request.Test>)[method](path);
      expect(res.status).toBe(401);
    }
  });

  it("rejects a non-admin (regular player) with 403 on every admin route", async () => {
    const { token, id } = await registerAndLogin("player");

    const routes: Array<[string, string]> = [
      ["get", "/api/v1/admin/games"],
      ["patch", `/api/v1/admin/games/${DEMO_SLOTS_SLUG}`],
      ["get", "/api/v1/admin/players"],
      ["post", `/api/v1/admin/players/${id}/credit-adjustments`],
      ["get", "/api/v1/admin/audit-log"],
      ["get", "/api/v1/admin/reports/summary"],
    ];

    for (const [method, path] of routes) {
      const res = await (request(app) as unknown as Record<string, (p: string) => request.Test>)
        [method](path)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
  });
});

describe("GET /api/v1/admin/games", () => {
  it("returns the seeded demo-slots game, including inactive games", async () => {
    const { token } = await registerAndLoginAsAdmin();

    await prisma.game.update({ where: { slug: DEMO_SLOTS_SLUG }, data: { isActive: false } });

    try {
      const res = await request(app).get("/api/v1/admin/games").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.games).toEqual(
        expect.arrayContaining([expect.objectContaining({ slug: DEMO_SLOTS_SLUG, isActive: false })]),
      );
    } finally {
      // The Game table is seed data, not reset between tests/files (see tests/setup.ts) — restore
      // the shared demo-slots game's active state so other test files relying on it still pass.
      await prisma.game.update({ where: { slug: DEMO_SLOTS_SLUG }, data: { isActive: true } });
    }
  });
});

describe("PATCH /api/v1/admin/games/:slug", () => {
  it("updates fields and creates an audit log entry", async () => {
    const { token } = await registerAndLoginAsAdmin();
    const original = await prisma.game.findUniqueOrThrow({ where: { slug: DEMO_SLOTS_SLUG } });

    try {
      const res = await request(app)
        .patch(`/api/v1/admin/games/${DEMO_SLOTS_SLUG}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Demo Slots Deluxe", maxBet: 500 });

      expect(res.status).toBe(200);
      expect(res.body.game).toMatchObject({ slug: DEMO_SLOTS_SLUG, name: "Demo Slots Deluxe", maxBet: 500 });

      const entries = await prisma.auditLogEntry.findMany({ where: { action: "GAME_UPDATED" } });
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ targetUserId: null, amount: null });
    } finally {
      // The Game table is seed data, not reset between tests/files (see tests/setup.ts) — restore
      // the shared demo-slots game's original fields so other test files relying on it still pass.
      await prisma.game.update({
        where: { slug: DEMO_SLOTS_SLUG },
        data: { name: original.name, maxBet: original.maxBet },
      });
    }
  });

  it("returns 404 GAME_NOT_FOUND for an unknown slug", async () => {
    const { token } = await registerAndLoginAsAdmin();

    const res = await request(app)
      .patch("/api/v1/admin/games/not-a-real-game")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nope" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("GAME_NOT_FOUND");
  });
});

describe("GET /api/v1/admin/players", () => {
  it("lists players with wallet info", async () => {
    const { token } = await registerAndLoginAsAdmin();
    const { email } = await registerAndLogin("player");

    const res = await request(app).get("/api/v1/admin/players").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email, role: "PLAYER", wallet: expect.objectContaining({ balance: 1000 }) }),
      ]),
    );
  });
});

describe("POST /api/v1/admin/players/:userId/credit-adjustments", () => {
  it("CREDIT increases balance and logs an audit entry", async () => {
    const { token } = await registerAndLoginAsAdmin();
    const { id: targetId } = await registerAndLogin("player");

    const res = await request(app)
      .post(`/api/v1/admin/players/${targetId}/credit-adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "CREDIT", amount: 250, reason: "promo bonus" });

    expect(res.status).toBe(201);
    expect(res.body.wallet.balance).toBe(1250);
    expect(res.body.auditLogEntry).toMatchObject({
      action: "CREDIT_ADJUSTMENT",
      targetUserId: targetId,
      amount: 250,
      reason: "promo bonus",
    });

    const wallet = await prisma.wallet.findUnique({ where: { userId: targetId } });
    expect(wallet?.balance).toBe(1250);
  });

  it("DEBIT decreases balance and logs an audit entry", async () => {
    const { token } = await registerAndLoginAsAdmin();
    const { id: targetId } = await registerAndLogin("player");

    const res = await request(app)
      .post(`/api/v1/admin/players/${targetId}/credit-adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "DEBIT", amount: 100, reason: "correction" });

    expect(res.status).toBe(201);
    expect(res.body.wallet.balance).toBe(900);
    expect(res.body.auditLogEntry).toMatchObject({ action: "DEBIT_ADJUSTMENT", targetUserId: targetId, amount: 100 });
  });

  it("a DEBIT exceeding balance returns 400 INSUFFICIENT_BALANCE and rolls back (no balance/ledger/audit change)", async () => {
    const { token } = await registerAndLoginAsAdmin();
    const { id: targetId } = await registerAndLogin("player");

    const res = await request(app)
      .post(`/api/v1/admin/players/${targetId}/credit-adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "DEBIT", amount: 100000, reason: "too much" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");

    const wallet = await prisma.wallet.findUnique({ where: { userId: targetId } });
    expect(wallet?.balance).toBe(1000);

    const ledgerEntries = await prisma.ledgerEntry.findMany({ where: { walletId: wallet?.id } });
    expect(ledgerEntries).toHaveLength(1); // only the initial demo grant, no DEBIT entry added

    const auditEntries = await prisma.auditLogEntry.findMany({ where: { targetUserId: targetId } });
    expect(auditEntries).toHaveLength(0);
  });

  it("returns 400 VALIDATION_ERROR for a non-positive amount or invalid type", async () => {
    const { token } = await registerAndLoginAsAdmin();
    const { id: targetId } = await registerAndLogin("player");

    const badAmount = await request(app)
      .post(`/api/v1/admin/players/${targetId}/credit-adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "CREDIT", amount: -5, reason: "bad" });
    expect(badAmount.status).toBe(400);
    expect(badAmount.body.error.code).toBe("VALIDATION_ERROR");

    const badType = await request(app)
      .post(`/api/v1/admin/players/${targetId}/credit-adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "GIFT", amount: 5, reason: "bad" });
    expect(badType.status).toBe(400);
    expect(badType.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 USER_NOT_FOUND for an unknown player", async () => {
    const { token } = await registerAndLoginAsAdmin();

    const res = await request(app)
      .post("/api/v1/admin/players/not-a-real-user/credit-adjustments")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "CREDIT", amount: 10, reason: "test" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });
});

describe("GET /api/v1/admin/audit-log", () => {
  it("returns entries newest first with adminEmail/targetEmail populated", async () => {
    const { token, email: adminEmail } = await registerAndLoginAsAdmin();
    const { id: targetId, email: targetEmail } = await registerAndLogin("player");

    await request(app)
      .post(`/api/v1/admin/players/${targetId}/credit-adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "CREDIT", amount: 50, reason: "first" });
    await request(app)
      .patch(`/api/v1/admin/games/${DEMO_SLOTS_SLUG}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "Updated description" });

    const res = await request(app).get("/api/v1/admin/audit-log").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    // Newest first: the game update happened after the credit adjustment.
    expect(res.body.entries[0]).toMatchObject({ action: "GAME_UPDATED", adminEmail, targetUserId: null, targetEmail: null });
    expect(res.body.entries[1]).toMatchObject({
      action: "CREDIT_ADJUSTMENT",
      adminEmail,
      targetUserId: targetId,
      targetEmail,
      amount: 50,
    });
  });
});

describe("GET /api/v1/admin/reports/summary", () => {
  it("returns sane counts after creating some test data", async () => {
    const { token, id: adminId } = await registerAndLoginAsAdmin();
    const { id: playerId } = await registerAndLogin("player");

    await request(app)
      .post(`/api/v1/admin/players/${playerId}/credit-adjustments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "CREDIT", amount: 50, reason: "bonus" });

    const res = await request(app).get("/api/v1/admin/reports/summary").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.playerCount).toBe(2); // admin + player
    expect(res.body.totalGameCount).toBeGreaterThanOrEqual(1);
    expect(res.body.activeGameCount).toBeGreaterThanOrEqual(1);
    expect(res.body.sessionCount).toBe(0);
    expect(res.body.completedSessionCount).toBe(0);
    // Each user gets a 1000 initial-grant ledger entry (2 users) + the 1 admin credit adjustment.
    expect(res.body.ledgerEntryCount).toBe(3);
    // 1000 (admin) + 1000 (player) + 50 (adjustment) = 2050.
    expect(res.body.totalCreditsInCirculation).toBe(2050);

    // Sanity: the admin id used above is a real admin user, not incidentally counted twice.
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
    expect(adminUser.role).toBe("ADMIN");
  });
});
