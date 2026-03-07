/**
 * Format a single move for display. Same convention for both players: from→to or from→off.
 * White's wrap 24→1 is shown as "24→1 (around)" so it's clear it's the board wrap.
 */

import type { Player } from "./direction";

export function formatMove(
  m: { from: number; to: number },
  player: Player,
): string {
  if (m.to === 0) return `${m.from}→off`;
  const isWhiteWrap = player === "white" && m.from === 24 && m.to === 1;
  return isWhiteWrap ? "24→1 (around)" : `${m.from}→${m.to}`;
}
