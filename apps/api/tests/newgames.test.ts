/**
 * API integration tests for Dice Roll and High-Low Cards games.
 * bob/digicasino-games branch.
 *
 * These tests run against the same test database as the existing game.test.ts suite.
 * The two new game engines (diceRoll.ts, highLow.ts) are mocked so outcomes are
 * deterministic, following the same pattern as the slots mock in game.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Mock the new engine modules before importing anything that transitively requires them.
vi.mock("../src/modules/game/diceRoll", async () => {
  const actual = await vi.importActual<typeof import("../src/modules/game/diceRoll")>(
    "../src/modules/game/diceRoll",
  );
  return {
    ...actual,
    rollDice: vi.fn((bet: number, input: { target: number; direction: string }) => ({
      dice: [3, 3] as [number, number],
      total: 6,
      direction: input.direction,
      target: input.target,
      payout: 0, // default: loss — overridden per-test via mockRollDice()
    })),
  };
});

vi.mock("../src/modules/game/highLow", async () => {
  const actual = await vi.importActual<typeof import("../src/modules/game/highLow")>(
    "../src/modules/game/highLow",
  );
  return {
    ...actual,
    playHighLow: vi.fn((bet: number, input: { direction: string }) => ({
      startCard: 7,
      nextCard: 7,
      direction: input.direction,
      outcome: "PUSH",
      payout: bet, // default: push — overridden per-test
    })),
  };
});

// eslint-disable-next-line import/first
import { createApp } from "../src/app";
// eslint-disable-next-line import/first
import { rollDice } from "../src/modules/game/diceRoll";
// eslint-disable-next-line import/first
import { playHighLow } from "../src/modules/game/highLow";

const app = createApp();
const mockedRollDice = vi.mocked(rollDice);
const mockedPlayHighLow = vi.mocked(playHighLow);

const VALID_PASSWORD = "correct-horse-battery-staple";
const DICE_SLUG = "dice-roll";
const HIGHLOW_SLUG = "high-low";

function uniqueEmail(): string {
  return `newgame-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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
  mockedRollDice.mockReset();
  mockedRollDice.mockImplementation((bet, input) => ({
    dice: [3, 3],
    total: 6,
    direction: input.direction,
    target: input.target,
    payout: 0,
  }));

  mockedPlayHighLow.mockReset();
  mockedPlayHighLow.mockImplementation((bet, input) => ({
    startCard: 7,
    nextCard: 7,
    direction: input.direction,
    outcome: "PUSH",
    payout: bet,
  }));
});

// ---------------------------------------------------------------------------
// Dice Roll — catalog
// ---------------------------------------------------------------------------
describe("GET /api/v1/games — includes dice-roll and high-low", () => {
  it("lists dice-roll and high-low in the active catalog", async () => {
    const res = await request(app).get("/api/v1/games");
    expect(res.status).toBe(200);
    const slugs = (res.body.games as Array<{ slug: string }>).map((g) => g.slug);
    expect(slugs).toContain(DICE_SLUG);
    expect(slugs).toContain(HIGHLOW_SLUG);
  });

  it("includes gameType field for dice-roll and high-low", async () => {
    const res = await request(app).get("/api/v1/games");
    const diceGame = (res.body.games as Array<{ slug: string; gameType: string }>).find(
      (g) => g.slug === DICE_SLUG,
    );
    const hlGame = (res.body.games as Array<{ slug: string; gameType: string }>).find(
      (g) => g.slug === HIGHLOW_SLUG,
    );
    expect(diceGame?.gameType).toBe("dice-roll");
    expect(hlGame?.gameType).toBe("high-low");
  });
});

// ---------------------------------------------------------------------------
// Dice Roll — session lifecycle
// ---------------------------------------------------------------------------
describe("Dice Roll — POST /api/v1/games/dice-roll/sessions", () => {
  it("creates a PENDING session, debits the bet, requires move", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { target: 7, direction: "OVER" } });

    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({ status: "PENDING", bet: 10 });

    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.wallet.balance).toBe(990); // 1000 - 10
  });

  it("rejects a missing move with 400 VALIDATION_ERROR", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid direction with 400 VALIDATION_ERROR", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { target: 7, direction: "SIDEWAYS" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an out-of-range target with 400 VALIDATION_ERROR", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { target: 1, direction: "OVER" } }); // 1 is below min 2

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a bet below minBet with 400 VALIDATION_ERROR", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 1, move: { target: 7, direction: "OVER" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a bet above the wallet balance with 400 INSUFFICIENT_BALANCE", async () => {
    const { token, email } = await registerAndLogin();

    // Import prisma lazily to avoid circular issues in mock resolution.
    const { prisma } = await import("../src/lib/prisma");
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.wallet.update({ where: { userId: user.id }, data: { balance: 5 } });

    const res = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { target: 7, direction: "OVER" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });
});

describe("Dice Roll — POST /api/v1/games/sessions/:id/play", () => {
  it("credits the payout on a win", async () => {
    mockedRollDice.mockImplementation((bet, input) => ({
      dice: [4, 4],
      total: 8,
      direction: input.direction,
      target: 7,
      payout: Math.floor(bet * 1.9),
    }));

    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { target: 7, direction: "OVER" } });
    const sessionId = startRes.body.session.id as string;

    const playRes = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);

    expect(playRes.status).toBe(200);
    expect(playRes.body.session).toMatchObject({ status: "COMPLETED", bet: 10, payout: 19 });
    // 1000 - 10 + 19 = 1009
    expect(playRes.body.wallet.balance).toBe(1009);
  });

  it("does not credit anything on a loss", async () => {
    mockedRollDice.mockImplementation((bet, input) => ({
      dice: [3, 3],
      total: 6,
      direction: input.direction,
      target: 7,
      payout: 0,
    }));

    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { target: 7, direction: "OVER" } });
    const sessionId = startRes.body.session.id as string;

    const playRes = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);

    expect(playRes.status).toBe(200);
    expect(playRes.body.session).toMatchObject({ status: "COMPLETED", payout: 0 });
    expect(playRes.body.wallet.balance).toBe(990);
  });

  it("prevents double-settlement with 409", async () => {
    mockedRollDice.mockImplementation((bet, input) => ({
      dice: [4, 4],
      total: 8,
      direction: input.direction,
      target: 7,
      payout: Math.floor(bet * 1.9),
    }));

    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${DICE_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { target: 7, direction: "OVER" } });
    const sessionId = startRes.body.session.id as string;

    const first = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("SESSION_ALREADY_SETTLED");

    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.wallet.balance).toBe(1009); // settled exactly once
  });
});

// ---------------------------------------------------------------------------
// High-Low Cards — session lifecycle
// ---------------------------------------------------------------------------
describe("High-Low Cards — POST /api/v1/games/high-low/sessions", () => {
  it("creates a PENDING session, debits the bet", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${HIGHLOW_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { direction: "HIGHER" } });

    expect(res.status).toBe(201);
    expect(res.body.session).toMatchObject({ status: "PENDING", bet: 10 });

    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.wallet.balance).toBe(990);
  });

  it("rejects a missing direction with 400 VALIDATION_ERROR", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${HIGHLOW_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an invalid direction with 400 VALIDATION_ERROR", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .post(`/api/v1/games/${HIGHLOW_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { direction: "SAME" } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("High-Low Cards — POST /api/v1/games/sessions/:id/play", () => {
  it("credits payout on a WIN", async () => {
    mockedPlayHighLow.mockImplementation((bet, input) => ({
      startCard: 5,
      nextCard: 9,
      direction: input.direction,
      outcome: "WIN",
      payout: Math.floor(bet * 1.9),
    }));

    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${HIGHLOW_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { direction: "HIGHER" } });
    const sessionId = startRes.body.session.id as string;

    const playRes = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);

    expect(playRes.status).toBe(200);
    expect(playRes.body.session).toMatchObject({ status: "COMPLETED", payout: 19 });
    expect(playRes.body.wallet.balance).toBe(1009);
  });

  it("returns bet on a PUSH (tie)", async () => {
    mockedPlayHighLow.mockImplementation((bet, input) => ({
      startCard: 7,
      nextCard: 7,
      direction: input.direction,
      outcome: "PUSH",
      payout: bet, // money back
    }));

    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${HIGHLOW_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { direction: "HIGHER" } });
    const sessionId = startRes.body.session.id as string;

    const playRes = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);

    expect(playRes.status).toBe(200);
    expect(playRes.body.session).toMatchObject({ status: "COMPLETED", payout: 10 });
    // 1000 - 10 (bet debit) + 10 (push credit) = 1000 — net zero
    expect(playRes.body.wallet.balance).toBe(1000);
  });

  it("does not credit anything on a LOSS", async () => {
    mockedPlayHighLow.mockImplementation((bet, input) => ({
      startCard: 9,
      nextCard: 3,
      direction: input.direction,
      outcome: "LOSS",
      payout: 0,
    }));

    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${HIGHLOW_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { direction: "HIGHER" } });
    const sessionId = startRes.body.session.id as string;

    const playRes = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);

    expect(playRes.status).toBe(200);
    expect(playRes.body.session).toMatchObject({ status: "COMPLETED", payout: 0 });
    expect(playRes.body.wallet.balance).toBe(990);
  });

  it("prevents double-settlement with 409", async () => {
    mockedPlayHighLow.mockImplementation((bet, input) => ({
      startCard: 5,
      nextCard: 9,
      direction: input.direction,
      outcome: "WIN",
      payout: Math.floor(bet * 1.9),
    }));

    const { token } = await registerAndLogin();

    const startRes = await request(app)
      .post(`/api/v1/games/${HIGHLOW_SLUG}/sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ bet: 10, move: { direction: "HIGHER" } });
    const sessionId = startRes.body.session.id as string;

    const first = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/games/sessions/${sessionId}/play`)
      .set("Authorization", `Bearer ${token}`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("SESSION_ALREADY_SETTLED");

    const meRes = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.wallet.balance).toBe(1009); // settled once only
  });
});

// ---------------------------------------------------------------------------
// Game engine unit tests (no HTTP layer)
// ---------------------------------------------------------------------------
describe("diceRoll engine unit tests", async () => {
  // vi.mock above intercepts a plain `import()` of this module for the whole file, so a dynamic
  // import here would return the mocked `rollDice`, not the real engine. vi.importActual bypasses
  // the mock registry entirely and gives us the unmocked implementation.
  const { rollDice: actualRollDice, parseDiceInput } = await vi.importActual<
    typeof import("../src/modules/game/diceRoll")
  >("../src/modules/game/diceRoll");

  it("parseDiceInput rejects missing object", () => {
    expect(() => parseDiceInput(null)).toThrow();
    expect(() => parseDiceInput("OVER")).toThrow();
  });

  it("parseDiceInput rejects out-of-range target", () => {
    expect(() => parseDiceInput({ target: 1, direction: "OVER" })).toThrow();
    expect(() => parseDiceInput({ target: 12, direction: "OVER" })).toThrow();
  });

  it("parseDiceInput rejects invalid direction", () => {
    expect(() => parseDiceInput({ target: 7, direction: "SAME" })).toThrow();
  });

  it("wins when total is OVER target", () => {
    // Stub rolls that always return 4 → total 8, target 7, direction OVER
    const result = actualRollDice(100, { target: 7, direction: "OVER" }, () => 4);
    expect(result.total).toBe(8);
    expect(result.payout).toBe(190); // floor(100 * 1.9)
  });

  it("loses when total equals target (exact match)", () => {
    const result = actualRollDice(100, { target: 8, direction: "OVER" }, () => 4);
    expect(result.total).toBe(8);
    expect(result.payout).toBe(0);
  });

  it("wins when total is UNDER target", () => {
    const result = actualRollDice(100, { target: 9, direction: "UNDER" }, () => 4);
    expect(result.payout).toBe(190);
  });
});

describe("highLow engine unit tests", async () => {
  // Same reasoning as diceRoll above: vi.importActual bypasses the vi.mock interception.
  const { playHighLow: actualPlayHighLow, parseHighLowInput } = await vi.importActual<
    typeof import("../src/modules/game/highLow")
  >("../src/modules/game/highLow");

  it("parseHighLowInput rejects missing object", () => {
    expect(() => parseHighLowInput(null)).toThrow();
  });

  it("parseHighLowInput rejects invalid direction", () => {
    expect(() => parseHighLowInput({ direction: "SAME" })).toThrow();
  });

  it("WIN when direction=HIGHER and nextCard > startCard", () => {
    let call = 0;
    const draw = () => (call++ === 0 ? 5 : 9);
    const result = actualPlayHighLow(100, { direction: "HIGHER" }, draw);
    expect(result.outcome).toBe("WIN");
    expect(result.payout).toBe(190);
  });

  it("LOSS when direction=HIGHER and nextCard < startCard", () => {
    let call = 0;
    const draw = () => (call++ === 0 ? 9 : 3);
    const result = actualPlayHighLow(100, { direction: "HIGHER" }, draw);
    expect(result.outcome).toBe("LOSS");
    expect(result.payout).toBe(0);
  });

  it("PUSH when cards are equal", () => {
    const result = actualPlayHighLow(100, { direction: "HIGHER" }, () => 7);
    expect(result.outcome).toBe("PUSH");
    expect(result.payout).toBe(100); // bet returned
  });

  it("LOSS when direction=LOWER and nextCard > startCard", () => {
    let call = 0;
    const draw = () => (call++ === 0 ? 3 : 9);
    const result = actualPlayHighLow(100, { direction: "LOWER" }, draw);
    expect(result.outcome).toBe("LOSS");
    expect(result.payout).toBe(0);
  });
});
