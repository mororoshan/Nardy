import type { Player } from "../game/direction";
import type { NardiState } from "../game/nardiState";
import type { MatchScore } from "../stores/nardiGameStore";

export type { MatchScore };

/**
 * Public game API type. Implemented by the Zustand store (nardiGameStore);
 * there is no React Context provider — useNardiGame() returns the store typed as this.
 */
/** Hint suggestion to show on the board (from/to points). */
export interface HintMove {
  from: number;
  to: number;
}

export interface NardiGameContextValue {
  state: NardiState;
  selectedPoint: number | null;
  /** Current hint to highlight (null when no hint or after clear). */
  hintMove: HintMove | null;
  /** Match score; first to matchTarget wins the match. */
  matchScore: MatchScore;
  /** Number of games to win the match (e.g. 3). */
  matchTarget: number;
  rollDice: () => void;
  rollForFirstTurn: (player: Player) => number;
  selectPoint: (pointIndex: number | null) => void;
  moveTo: (pointIndex: number) => void;
  /** End turn when there are no legal moves (e.g. one die used, other blocked). */
  passWhenNoMoves: () => void;
  /** Show a suggested move hint; cleared after a short delay or on move. */
  showHint: () => void;
  clearHint: () => void;
  /** Reset board for next game in match; keeps match score. */
  nextGame: () => void;
  /** Reset board and match score (new match). */
  newGame: () => void;
}
