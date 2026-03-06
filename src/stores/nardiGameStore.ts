/**
 * Zustand store for Nardi game UI state and actions.
 * Game rules remain in nardiState.ts; this store holds state + selectedPoint and dispatches actions.
 */

import { create } from "zustand";
import type { Player } from "../game/direction";
import {
  createInitialState,
  applyMove,
  getLegalMoves,
  type NardiState,
  type MoveThisTurn,
} from "../game/nardiState";

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** One completed turn: who moved, dice rolled, and moves made. */
export interface GameHistoryEntry {
  turn: Player;
  dice: [number, number];
  moves: MoveThisTurn[];
}

export interface NardiGameStore {
  state: NardiState;
  selectedPoint: number | null;
  gameHistory: GameHistoryEntry[];
  rollForFirstTurn: (player: Player) => number;
  rollDice: () => void;
  selectPoint: (pointIndex: number | null) => void;
  moveTo: (pointIndex: number) => void;
  /** End turn when dice are rolled but there are no legal moves (e.g. one die used, other blocked). */
  passWhenNoMoves: () => void;
  newGame: () => void;
}

export const useNardiGameStore = create<NardiGameStore>()((set, get) => ({
  state: createInitialState(),
  selectedPoint: null,
  gameHistory: [],

  rollForFirstTurn: (player: Player) => {
    const value = rollDie();
    set((prev) => {
      if (prev.state.phase !== "firstRoll") return prev;
      const next = { ...prev.state };
      if (player === "white")
        next.firstRollDice = { ...next.firstRollDice, white: value };
      else next.firstRollDice = { ...next.firstRollDice, black: value };
      const { white, black } = next.firstRollDice;
      if (white !== null && black !== null) {
        next.phase = "playing";
        next.turn = white >= black ? "white" : "black";
        next.dice = null;
      }
      return { state: next };
    });
    return value;
  },

  rollDice: () => {
    set((prev) => {
      if (prev.state.phase !== "playing" || prev.state.dice !== null)
        return prev;
      return { state: { ...prev.state, dice: [rollDie(), rollDie()] } };
    });
  },

  selectPoint: (pointIndex: number | null) => {
    set({ selectedPoint: pointIndex });
  },

  moveTo: (pointIndex: number) => {
    const { state, selectedPoint, gameHistory } = get();
    if (selectedPoint === null) return;
    const moves = getLegalMoves(state);
    const move = moves.find(
      (m) =>
        m.from === selectedPoint &&
        (m.to === pointIndex || (m.to === 0 && pointIndex === 0)),
    );
    if (!move) return;
    const next = applyMove(state, move.from, move.to, move.usedDiceIndices);
    const movesThisTurn = [
      ...state.movesThisTurn,
      {
        from: move.from,
        to: move.to,
        usedDiceIndices: move.usedDiceIndices,
      },
    ];
    const entry: GameHistoryEntry | null =
      next.phase === "playing" && next.dice === null && state.dice !== null
        ? { turn: state.turn, dice: state.dice, moves: movesThisTurn }
        : null;
    set({
      state: next,
      selectedPoint: null,
      gameHistory: entry ? [...gameHistory, entry] : gameHistory,
    });
  },

  passWhenNoMoves: () => {
    const { state, gameHistory } = get();
    if (
      state.phase !== "playing" ||
      state.dice === null ||
      getLegalMoves(state).length > 0
    )
      return;
    const nextTurn: Player = state.turn === "white" ? "black" : "white";
    const entry: GameHistoryEntry = {
      turn: state.turn,
      dice: state.dice,
      moves: [],
    };
    set({
      state: {
        ...state,
        dice: null,
        usedDice: [false, false],
        movesThisTurn: [],
        turn: nextTurn,
      },
      selectedPoint: null,
      gameHistory: [...gameHistory, entry],
    });
  },

  newGame: () => {
    set({ state: createInitialState(), selectedPoint: null, gameHistory: [] });
  },
}));
