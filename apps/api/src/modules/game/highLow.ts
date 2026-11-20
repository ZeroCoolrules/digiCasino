import { randomInt } from "node:crypto";

/**
 * High-Low Cards game engine (bob/digicasino-games).
 *
 * Rules (shown to player before they bet):
 *   - A starting card is revealed. Guess whether the NEXT card will be HIGHER or LOWER.
 *   - Cards are Ace (1) through King (13). Suit is irrelevant.
 *   - TIE RULE: If the next card equals the starting card, it is a PUSH — the bet is
 *     returned (payout = bet, net result = 0). This rule is displayed in the game UI.
 *   - WIN payout: 1.9× bet (rounded down).
 *   - LOSS payout: 0.
 *   - PUSH payout: bet (1× — money back).
 *
 * The `result` JSON stored in GameSession for a high-low session:
 *   { startCard: number, nextCard: number, direction: "HIGHER"|"LOWER",
 *     outcome: "WIN"|"LOSS"|"PUSH", payout: number }
 */

export type HighLowDirection = "HIGHER" | "LOWER";
export type HighLowOutcome = "WIN" | "LOSS" | "PUSH";

export interface HighLowInput {
  direction: HighLowDirection;
}

export interface HighLowResult {
  startCard: number;
  nextCard: number;
  direction: HighLowDirection;
  outcome: HighLowOutcome;
  payout: number;
}

export const CARD_MIN = 1;  // Ace
export const CARD_MAX = 13; // King
export const HIGHLOW_WIN_MULTIPLIER = 1.9;

/** Card labels for display (index 0 unused). */
export const CARD_LABELS: Record<number, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
};

/** Draws a single card value (1–13) using CSPRNG. Exported for test injection. */
export function drawCard(): number {
  return randomInt(CARD_MIN, CARD_MAX + 1);
}

/**
 * Resolves a full High-Low round.
 * `draw` defaults to the real CSPRNG-backed `drawCard`; tests may inject a stub.
 */
export function playHighLow(
  bet: number,
  input: HighLowInput,
  draw: () => number = drawCard,
): HighLowResult {
  const startCard = draw();
  const nextCard = draw();
  const { direction } = input;

  let outcome: HighLowOutcome;
  if (nextCard === startCard) {
    outcome = "PUSH";
  } else if (direction === "HIGHER" && nextCard > startCard) {
    outcome = "WIN";
  } else if (direction === "LOWER" && nextCard < startCard) {
    outcome = "WIN";
  } else {
    outcome = "LOSS";
  }

  let payout: number;
  if (outcome === "WIN") {
    payout = Math.floor(bet * HIGHLOW_WIN_MULTIPLIER);
  } else if (outcome === "PUSH") {
    payout = bet;
  } else {
    payout = 0;
  }

  return { startCard, nextCard, direction, outcome, payout };
}

/**
 * Parses and validates the high-low game move from an arbitrary JSON object.
 * Throws if the move is invalid.
 */
export function parseHighLowInput(raw: unknown): HighLowInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("move must be an object with a direction.");
  }
  const { direction } = raw as Record<string, unknown>;
  if (direction !== "HIGHER" && direction !== "LOWER") {
    throw new Error('direction must be "HIGHER" or "LOWER".');
  }
  return { direction };
}
