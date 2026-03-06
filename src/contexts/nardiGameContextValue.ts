import type { Player } from "../game/direction";
import type { NardiState } from "../game/nardiState";

/**
 * Public game API type. Implemented by the Zustand store (nardiGameStore);
 * there is no React Context provider — useNardiGame() returns the store typed as this.
 */
export interface NardiGameContextValue {
  state: NardiState;
  selectedPoint: number | null;
  rollDice: () => void;
  rollForFirstTurn: (player: Player) => number;
  selectPoint: (pointIndex: number | null) => void;
  moveTo: (pointIndex: number) => void;
  /** End turn when there are no legal moves (e.g. one die used, other blocked). */
  passWhenNoMoves: () => void;
  newGame: () => void;
}
