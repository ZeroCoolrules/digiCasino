import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/modules/game/slotMachine", async () => {
  const actual = await vi.importActual<typeof import("../src/modules/game/slotMachine")>(
    "../src/modules/game/slotMachine",
  );
  return {
    ...actual,
    // Overridden per-test via mockSpin(); defaults to a guaranteed loss (no matches).
    spin: vi.fn((bet: number) => ({ reels: ["CHERRY", "BELL", "BAR"], payout: 0 * bet })),
  };
});

// eslint-disable-next-line import/first
import { createApp } from "../src/app";
// eslint-disable-next-line import/first
import { spin } from "../src/modules/game/slotMachine";
// eslint-disable-next-line import/first
import { prisma } from "../src/lib/prisma";

const app = createApp();
const mockedSpin = vi.mocked(spin);

const VALID_PASSWORD = "correct-horse-battery-staple";
const DEMO_SLOTS_SLUG = "demo-slots";

function uniqueEmail(): string {
  return `game-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLogin(): Promise<{ token: string; email: string }> {
  const email = uniqueEmail();
  await request(app).post("/api/v1/auth/register").send({ email, password: VALID_PASSWORD });
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: VALID_PASSWORD });
  return { token: loginRes.body.token as string, email };
}

beforeEach(() => {
  mockedSpin.mockReset();
  mockedSpin.mockImplementation((bet: number) => ({ reels: ["CHERRY", "BELL", "BAR"], payout: 0 * bet }));
});

describe("GET /api/v1/games", () => {
  it("returns the seeded demo-slots game without requiring auth", async () => {
    const res = await request(app).get("/api/v1/games");

    expect(res.status).toBe(200);
    expect(res.body.games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: DEMO_SLOTS_SLUG, name: expect.any(String), minBet: expect.any(Number), maxBet: expect.any(Number) }),
      ]),
    );
  });
});

describe("POST /api/v1/games/:slug/sessions", () => {
  it("creates a PENDING session and debits the bet", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });

    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({ status: "PENDING", bet: 10 });

    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.wallet.balance).toBe(990); // 1000 starting - 10 bet
  });

  it("rejects a bet below the game's minimum with 400", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a bet the wallet cannot cover with 400 INSUFFICIENT_BALANCE", async () => {
    const { token, email } = await registerAndLogin();

    // Drain the wallet below the game's minBet (10) so a subsequent in-range bet is rejected
    // specifically for insufficient funds, not for being out of the game's [minBet,maxBet] range.
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.wallet.update({ where: { userId: user.id }, data: { balance: 5 } });

    const res = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("rejects an unknown game slug with 404", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post("/api/v1/games/not-a-real-game/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("GAME_NOT_FOUND");
  });

  it("requires authentication", async () => {
    const res = await request(app).post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`).send({ bet: 10 });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/games/sessions/:id/play", () => {
  it("credits the payout and completes the session on a win", async () => {
    mockedSpin.mockImplementation((bet: number) => ({ reels: ["SEVEN", "SEVEN", "SEVEN"], payout: bet * 10 }));
    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });
    const sessionId = startRes.body.session.id as string;

    const playRes = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(playRes.status).toBe(200);
    expect(playRes.body.session).toMatchObject({ status: "COMPLETED", bet: 10, payout: 100 });
    // 1000 - 10 (bet) + 100 (payout) = 1090
    expect(playRes.body.wallet.balance).toBe(1090);
  });

  it("does not credit anything on a loss", async () => {
    mockedSpin.mockImplementation((bet: number) => ({ reels: ["CHERRY", "BELL", "BAR"], payout: 0 * bet }));
    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });
    const sessionId = startRes.body.session.id as string;

    const playRes = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(playRes.status).toBe(200);
    expect(playRes.body.session).toMatchObject({ status: "COMPLETED", bet: 10, payout: 0 });
    expect(playRes.body.wallet.balance).toBe(990); // bet lost, no payout
  });

  it("rejects playing the same session twice with 409 and does not double-settle", async () => {
    mockedSpin.mockImplementation((bet: number) => ({ reels: ["SEVEN", "SEVEN", "SEVEN"], payout: bet * 10 }));
    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });
    const sessionId = startRes.body.session.id as string;

    const firstPlay = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(firstPlay.status).toBe(200);

    const secondPlay = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(secondPlay.status).toBe(409);
    expect(secondPlay.body.error.code).toBe("SESSION_ALREADY_SETTLED");

    // Balance must reflect only the FIRST settlement, not a second credit.
    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.wallet.balance).toBe(1090);
  });

  it("rejects playing another user's session with 403", async () => {
    const owner = await registerAndLogin();
    const intruder = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ bet: 10 });
    const sessionId = startRes.body.session.id as string;

    const res = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${intruder.token}`)
      .send();

    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/wallet/transactions", () => {
  it("returns the user's ledger entries newest first, including bet debit and payout credit", async () => {
    mockedSpin.mockImplementation((bet: number) => ({ reels: ["SEVEN", "SEVEN", "SEVEN"], payout: bet * 10 }));
    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DEMO_SLOTS_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });
    await request(app)
      .post(`/api/v1/games/sessions/${startRes.body.session.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    const res = await request(app)
      .get("/api/v1/wallet/transactions")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Newest first: payout credit, then bet debit, then the initial registration grant.
    expect(res.body.transactions).toHaveLength(3);
    expect(res.body.transactions[0]).toMatchObject({ type: "CREDIT", amount: 100 });
    expect(res.body.transactions[1]).toMatchObject({ type: "DEBIT", amount: 10 });
    expect(res.body.transactions[2]).toMatchObject({ type: "CREDIT", amount: 1000 });
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/wallet/transactions");
    expect(res.status).toBe(401);
  });
});

describe("Game catalog seed", () => {
  it("has the demo-slots game seeded in the test database", async () => {
    const game = await prisma.game.findUnique({ where: { slug: DEMO_SLOTS_SLUG } });
    expect(game).not.toBeNull();
    expect(game?.isActive).toBe(true);
  });
});
