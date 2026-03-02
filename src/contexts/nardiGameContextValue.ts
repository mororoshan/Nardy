import type { NardiState } from "../game/nardiState";

export interface NardiGameContextValue {
  state: NardiState;
  selectedPoint: number | null;
  rollDice: () => void;
  rollForFirstTurn: (player: "white" | "black") => number;
  selectPoint: (pointIndex: number | null) => void;
  moveTo: (pointIndex: number) => void;
  newGame: () => void;
}
