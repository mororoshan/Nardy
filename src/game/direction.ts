/**
 * Long Nardy direction and home board helpers.
 * White starts at 13, moves 13→14→…→24→1→…→6→7→…→12 (then bear off from 7–12).
 * Black starts at 1, moves 1→2→…→24 (bear off from 19–24).
 */

export type Player = "white" | "black";

/** White head = 13, Black head = 1 */
export const HEAD: Record<Player, number> = {
  white: 13,
  black: 1,
};

/** Home (bear off): White 7–12, Black 19–24 */
export const HOME_START: Record<Player, number> = {
  white: 7,
  black: 19,
};

export const HOME_END: Record<Player, number> = {
  white: 12,
  black: 24,
};

/** Step direction: both +1 (increasing). */
export function step(): number {
  return 1;
}

/** Destination point after moving `steps` from `from` (1–24). Returns 0 for bear off. */
export function pointAfterSteps(
  player: Player,
  from: number,
  steps: number,
): number {
  if (player === "white") {
    if (from >= 7 && from <= 12 && from + steps > 12) return 0;
    return ((from - 1 + steps) % 24) + 1;
  } else {
    const to = from + steps;
    return to > 24 ? 0 : to;
  }
}

export function isInHome(player: Player, pointIndex: number): boolean {
  if (player === "white") return pointIndex >= 7 && pointIndex <= 12;
  return pointIndex >= 19 && pointIndex <= 24;
}

export function isHead(player: Player, pointIndex: number): boolean {
  return pointIndex === HEAD[player];
}
