import type { Player } from "../game/direction";
import type { NardiState } from "../game/nardiState";

export interface NardiGameContextValue {
  state: NardiState;
  selectedPoint: number | null;
  rollDice: () => void;
  rollForFirstTurn: (player: Player) => number;
  selectPoint: (pointIndex: number | null) => void;
  moveTo: (pointIndex: number) => void;
  newGame: () => void;
}
