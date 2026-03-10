/**
 * Zustand store for Nardi game UI state and actions.
 * This is the single source of truth for game state; sync and UI read/write only through here.
 * Game rules remain in nardiState.ts; this store holds state + selectedPoint + gameHistory and dispatches actions.
 */

import { create } from "zustand";
import type { Player } from "../game/direction";
import {
  createInitialState,
  applyMove,
  getLegalMoves,
  pickHintMove,
  type NardiState,
  type LegalMove,
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

/** Last move applied (for animation and highlight). Cleared after animation. */
export interface LastMove {
  from: number;
  to: number;
  player: Player;
}

/** Match score (first to matchTarget wins the match). */
export interface MatchScore {
  white: number;
  black: number;
}

const HINT_DURATION_MS = 2000;
const DEFAULT_MATCH_TARGET = 3;

let hintTimeoutId: ReturnType<typeof setTimeout> | null = null;

export interface NardiGameStore {
  state: NardiState;
  selectedPoint: number | null;
  gameHistory: GameHistoryEntry[];
  /** Last move applied; used for move animation and last-move highlight. */
  lastMove: LastMove | null;
  /** Hint suggestion to show on board (from/to); cleared after delay or on move. */
  hintMove: { from: number; to: number } | null;
  /** Match score; first to matchTarget wins the match. */
  matchScore: MatchScore;
  /** Number of games to win the match (e.g. 3). */
  matchTarget: number;
  rollForFirstTurn: (player: Player) => number;
  rollDice: () => void;
  selectPoint: (pointIndex: number | null) => void;
  moveTo: (pointIndex: number) => void;
  /** End turn when dice are rolled but there are no legal moves (e.g. one die used, other blocked). */
  passWhenNoMoves: () => void;
  /** Apply a legal move directly (used by opponent AI). */
  applyMoveFromLegalMove: (move: LegalMove) => void;
  showHint: () => void;
  clearHint: () => void;
  /** Reset board for next game in match; keeps match score. */
  nextGame: () => void;
  /** Reset board and match score (new match). */
  newGame: () => void;
  /** Set last move (called after applyMove for animation). */
  setLastMove: (from: number, to: number, player: Player) => void;
  /** Clear last move (e.g. after animation ends). */
  clearLastMove: () => void;
}

const initialMatchScore: MatchScore = { white: 0, black: 0 };

export const useNardiGameStore = create<NardiGameStore>()((set, get) => ({
  state: createInitialState(),
  selectedPoint: null,
  gameHistory: [],
  lastMove: null,
  hintMove: null,
  matchScore: initialMatchScore,
  matchTarget: DEFAULT_MATCH_TARGET,

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
    const prev = get();
    const matchScore =
      next.phase === "gameOver" && next.gameOverResult
        ? {
            ...prev.matchScore,
            [next.gameOverResult.winner]:
              prev.matchScore[next.gameOverResult.winner] + 1,
          }
        : prev.matchScore;
    set({
      state: next,
      selectedPoint: null,
      gameHistory: entry ? [...gameHistory, entry] : gameHistory,
      lastMove: { from: move.from, to: move.to, player: state.turn },
      hintMove: null,
      matchScore,
    });
  },

  applyMoveFromLegalMove: (move: LegalMove) => {
    const { state, gameHistory } = get();
    const moves = getLegalMoves(state);
    const valid = moves.find(
      (m) =>
        m.from === move.from &&
        m.to === move.to &&
        m.usedDiceIndices[0] === move.usedDiceIndices[0] &&
        m.usedDiceIndices[1] === move.usedDiceIndices[1],
    );
    if (!valid) return;
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
    const prev = get();
    const matchScore =
      next.phase === "gameOver" && next.gameOverResult
        ? {
            ...prev.matchScore,
            [next.gameOverResult.winner]:
              prev.matchScore[next.gameOverResult.winner] + 1,
          }
        : prev.matchScore;
    set({
      state: next,
      selectedPoint: null,
      gameHistory: entry ? [...gameHistory, entry] : gameHistory,
      lastMove: { from: move.from, to: move.to, player: state.turn },
      hintMove: null,
      matchScore,
    });
  },

  showHint: () => {
    if (hintTimeoutId != null) {
      clearTimeout(hintTimeoutId);
      hintTimeoutId = null;
    }
    const { state } = get();
    const move = pickHintMove(state);
    if (!move) return;
    set({ hintMove: { from: move.from, to: move.to } });
    hintTimeoutId = setTimeout(() => {
      get().clearHint();
      hintTimeoutId = null;
    }, HINT_DURATION_MS);
  },

  clearHint: () => {
    if (hintTimeoutId != null) {
      clearTimeout(hintTimeoutId);
      hintTimeoutId = null;
    }
    set({ hintMove: null });
  },

  setLastMove: (from, to, player) => {
    set({ lastMove: { from, to, player } });
  },

  clearLastMove: () => {
    set({ lastMove: null });
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
      hintMove: null,
    });
  },

  nextGame: () => {
    if (hintTimeoutId != null) {
      clearTimeout(hintTimeoutId);
      hintTimeoutId = null;
    }
    set({
      state: createInitialState(),
      selectedPoint: null,
      gameHistory: [],
      lastMove: null,
      hintMove: null,
    });
  },

  newGame: () => {
    if (hintTimeoutId != null) {
      clearTimeout(hintTimeoutId);
      hintTimeoutId = null;
    }
    set({
      state: createInitialState(),
      selectedPoint: null,
      gameHistory: [],
      lastMove: null,
      hintMove: null,
      matchScore: initialMatchScore,
    });
  },
}));
