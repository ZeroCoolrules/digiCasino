import { randomInt } from "node:crypto";

/**
 * Demo Slots (ADR-004): a 3-reel slot machine. Each reel independently lands on one of
 * SYMBOLS via a CSPRNG (`crypto.randomInt`) roll — never client-influenced. The payout is a
 * multiple of the bet, determined purely by how many reels match:
 *   - All 3 reels match: PAYOUT_MULTIPLIERS[symbol] * bet (varies by symbol — see below)
 *   - Exactly 2 reels match: 1x bet (a small consolation payout)
 *   - No match: 0 (bet is lost)
 * This keeps the game clearly server-authoritative and easy to test deterministically by
 * stubbing `rollReel`.
 */
export const SYMBOLS = ["CHERRY", "BELL", "BAR", "SEVEN"] as const;
export type Symbol = (typeof SYMBOLS)[number];

/** Multiplier applied to the bet when all 3 reels match this symbol. */
const TRIPLE_MATCH_MULTIPLIER: Record<Symbol, number> = {
  CHERRY: 2,
  BELL: 3,
  BAR: 5,
  SEVEN: 10,
};

/** Flat multiplier applied to the bet when exactly 2 of the 3 reels match. */
const DOUBLE_MATCH_MULTIPLIER = 1;

export interface SpinResult {
  reels: [Symbol, Symbol, Symbol];
  payout: number;
}

/** Rolls a single reel. Exported separately so tests can stub it for deterministic outcomes. */
export function rollReel(): Symbol {
  return SYMBOLS[randomInt(0, SYMBOLS.length)];
}

/**
 * Resolves a full spin (3 reels) and computes the payout for a given bet.
 * `roll` defaults to the real CSPRNG-backed `rollReel`; tests may inject a stub for
 * deterministic outcomes without mocking the module system.
 */
export function spin(bet: number, roll: () => Symbol = rollReel): SpinResult {
  const reels: [Symbol, Symbol, Symbol] = [roll(), roll(), roll()];
  const [a, b, c] = reels;

  let payout = 0;
  if (a === b && b === c) {
    payout = bet * TRIPLE_MATCH_MULTIPLIER[a];
  } else if (a === b || b === c || a === c) {
    payout = bet * DOUBLE_MATCH_MULTIPLIER;
  }

  return { reels, payout };
}
