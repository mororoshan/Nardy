import { describe, it, expect } from "vitest";
import {
  createInitialState,
  getLegalMoves,
  pickHintMove,
  type NardiState,
} from "../../src/game/nardiState";

function playingState(overrides: Partial<NardiState> = {}): NardiState {
  const s = createInitialState();
  return {
    ...s,
    phase: "playing",
    dice: [3, 4],
    usedDice: [false, false],
    movesThisTurn: [],
    ...overrides,
  };
}

describe("pickHintMove", () => {
  it("returns null when phase is not playing", () => {
    const state = createInitialState();
    expect(pickHintMove(state)).toBeNull();
  });

  it("returns null when there are no legal moves", () => {
    const state = playingState({ dice: null });
    expect(pickHintMove(state)).toBeNull();
  });

  it("returns one legal move when moves exist", () => {
    const state = playingState();
    const hint = pickHintMove(state);
    expect(hint).not.toBeNull();
    const moves = getLegalMoves(state);
    expect(moves.some((m) => m.from === hint!.from && m.to === hint!.to)).toBe(
      true,
    );
  });

  it("prefers bear-off when available (white)", () => {
    const s = createInitialState();
    const whitePoints = s.whitePoints.slice();
    const blackPoints = s.blackPoints.slice();
    whitePoints[13] = 0;
    whitePoints[7] = 2;
    whitePoints[8] = 13;
    const state: NardiState = {
      ...s,
      phase: "playing",
      turn: "white",
      whitePoints,
      blackPoints,
      dice: [1, 1],
      usedDice: [false, false],
      movesThisTurn: [],
    };
    const moves = getLegalMoves(state);
    const bearOff = moves.filter((m) => m.to === 0);
    if (bearOff.length > 0) {
      const hint = pickHintMove(state);
      expect(hint).not.toBeNull();
      expect(hint!.to).toBe(0);
    }
  });

  it("prefers advancing furthest piece when no bear-off (white = smallest from)", () => {
    const state = playingState();
    const moves = getLegalMoves(state);
    const nonBearOff = moves.filter((m) => m.to !== 0);
    if (nonBearOff.length > 0) {
      const hint = pickHintMove(state);
      expect(hint).not.toBeNull();
      const minFrom = Math.min(...nonBearOff.map((m) => m.from));
      expect(hint!.from).toBe(minFrom);
    }
  });
});
