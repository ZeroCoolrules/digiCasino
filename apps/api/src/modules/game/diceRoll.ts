import { randomInt } from "node:crypto";

/**
 * Dice Roll game engine (bob/digicasino-games).
 *
 * Rules (shown to player before they bet):
 *   - Choose a target number 2–11 and a direction: UNDER or OVER.
 *   - Two six-sided dice are rolled server-side (CSPRNG).
 *   - UNDER wins when roll total < target; OVER wins when roll total > target.
 *   - Exact match always loses (no tie payout).
 *   - Win payout: 1.9× bet (rounded down). Loss: 0.
 *
 * The `result` JSON stored in GameSession for a dice-roll session:
 *   { dice: [d1, d2], total: number, direction: "UNDER"|"OVER", target: number, payout: number }
 */

export type DiceDirection = "UNDER" | "OVER";

export interface DiceRollInput {
  target: number;
  direction: DiceDirection;
}

export interface DiceRollResult {
  dice: [number, number];
  total: number;
  direction: DiceDirection;
  target: number;
  payout: number;
}

export const DICE_WIN_MULTIPLIER = 1.9;
export const DICE_MIN_TARGET = 2;
export const DICE_MAX_TARGET = 11;

/** Rolls a single six-sided die using CSPRNG. Exported for test injection. */
export function rollDie(): number {
  return randomInt(1, 7); // 1–6 inclusive
}

/**
 * Resolves a full dice-roll and returns the outcome.
 * `roll` defaults to the real CSPRNG-backed `rollDie`; tests may inject a stub.
 */
export function rollDice(
  bet: number,
  input: DiceRollInput,
  roll: () => number = rollDie,
): DiceRollResult {
  const d1 = roll();
  const d2 = roll();
  const total = d1 + d2;

  const { target, direction } = input;

  const won =
    (direction === "UNDER" && total < target) ||
    (direction === "OVER" && total > target);

  const payout = won ? Math.floor(bet * DICE_WIN_MULTIPLIER) : 0;

  return { dice: [d1, d2], total, direction, target, payout };
}

/**
 * Parses and validates the dice-roll game move from an arbitrary JSON object.
 * Throws if the move is invalid.
 */
export function parseDiceInput(raw: unknown): DiceRollInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("move must be an object with target and direction.");
  }
  const { target, direction } = raw as Record<string, unknown>;
  if (typeof target !== "number" || !Number.isInteger(target) || target < DICE_MIN_TARGET || target > DICE_MAX_TARGET) {
    throw new Error(`target must be an integer between ${DICE_MIN_TARGET} and ${DICE_MAX_TARGET}.`);
  }
  if (direction !== "UNDER" && direction !== "OVER") {
    throw new Error('direction must be "UNDER" or "OVER".');
  }
  return { target, direction };
}
