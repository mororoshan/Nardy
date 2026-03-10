/**
 * Long Nardy game state and pure game logic.
 * White starts at 13, moves 13→14→…→24→1→…→12 (bear off from 7–12). Black starts at 1, moves 1→…→24 (bear off from 19–24).
 */

import type { Player } from "./direction";
import { HEAD, pointAfterSteps, isInHome, isHead } from "./direction";

/** Point counts: index 0 unused, indices 1–24 are board points. */
export type Points = number[];

export interface MoveThisTurn {
  from: number;
  to: number;
  usedDiceIndices: [number, number];
}

export interface NardiState {
  whitePoints: Points;
  blackPoints: Points;
  whiteBornOff: number;
  blackBornOff: number;
  turn: Player;
  dice: [number, number] | null;
  usedDice: [boolean, boolean];
  movesThisTurn: MoveThisTurn[];
  phase: "firstRoll" | "playing" | "gameOver";
  firstRollDice: { white: number | null; black: number | null };
  gameOverResult: { winner: Player; oynOrMars: "oyn" | "mars" } | null;
}

export interface LegalMove {
  from: number;
  to: number;
  usedDiceIndices: [number, number];
}

function makePoints(): Points {
  const p: Points = new Array(25);
  p[0] = 0;
  for (let i = 1; i <= 24; i++) p[i] = 0;
  return p;
}

export function createInitialState(): NardiState {
  const whitePoints = makePoints();
  const blackPoints = makePoints();
  whitePoints[13] = 15;
  blackPoints[1] = 15;
  return {
    whitePoints,
    blackPoints,
    whiteBornOff: 0,
    blackBornOff: 0,
    turn: "white",
    dice: null,
    usedDice: [false, false],
    movesThisTurn: [],
    phase: "firstRoll",
    firstRollDice: { white: null, black: null },
    gameOverResult: null,
  };
}

function canLandOn(
  state: NardiState,
  pointIndex: number,
  player: Player,
): boolean {
  const oppPoints = player === "white" ? state.blackPoints : state.whitePoints;
  return oppPoints[pointIndex] === 0;
}

/** Check if creating a 6-block that traps all 15 opponent would happen after this move. */
function violatesPrimeRule(
  state: NardiState,
  player: Player,
  from: number,
  to: number,
): boolean {
  const myPoints = (
    player === "white" ? state.whitePoints.slice() : state.blackPoints.slice()
  ) as Points;
  const oppPoints = player === "white" ? state.blackPoints : state.whitePoints;
  if (to >= 1 && to <= 24) {
    myPoints[from]--;
    myPoints[to]++;
  }
  const totalOpp = oppPoints.reduce((a, c) => a + c, 0);
  if (totalOpp === 0) return false;
  for (let start = 1; start <= 19; start++) {
    let allMine = true;
    for (let k = 0; k < 6; k++) {
      const pt = start + k;
      if (pt > 24 || myPoints[pt] <= 0) allMine = false;
    }
    if (!allMine) continue;
    let oppBehind = 0;
    if (player === "white") {
      for (let pt = start + 6; pt <= 24; pt++) oppBehind += oppPoints[pt];
    } else {
      for (let pt = 1; pt < start; pt++) oppBehind += oppPoints[pt];
    }
    if (oppBehind >= totalOpp) return true;
  }
  return false;
}

function getAvailableDice(
  state: NardiState,
): { value: number; dieIndex: number }[] {
  if (!state.dice) return [];
  const [a, b] = state.dice;
  const [ua, ub] = state.usedDice;
  const list: { value: number; dieIndex: number }[] = [];
  if (a === b) {
    const used = state.movesThisTurn.length;
    for (let i = used; i < 4; i++) list.push({ value: a, dieIndex: 0 });
  } else {
    if (!ua) list.push({ value: a, dieIndex: 0 });
    if (!ub) list.push({ value: b, dieIndex: 1 });
  }
  return list;
}

/** True if all 15 of the player's checkers are in home or borne off. */
function canPlayerBearOff(state: NardiState, player: Player): boolean {
  const myPoints = player === "white" ? state.whitePoints : state.blackPoints;
  const borneOff = player === "white" ? state.whiteBornOff : state.blackBornOff;
  let inHome = 0;
  for (let i = 1; i <= 24; i++) {
    if (isInHome(player, i)) inHome += myPoints[i];
  }
  return inHome + borneOff === 15;
}

/**
 * Returns the legal move from this point with this die, or null if not legal.
 * Caller is responsible for deduplication (same move via different die).
 */
function getMoveFromPointWithDie(
  state: NardiState,
  player: Player,
  from: number,
  dieValue: number,
  dieIndex: number,
  canBearOff: boolean,
  leftHead: boolean,
): LegalMove | null {
  const myPoints = player === "white" ? state.whitePoints : state.blackPoints;
  if (myPoints[from] === 0) return null;
  if (isHead(player, from) && leftHead) return null;

  const to = pointAfterSteps(player, from, dieValue);

  if (to === 0) {
    if (canBearOff && isInHome(player, from)) {
      return {
        from,
        to: 0,
        usedDiceIndices: [dieIndex as 0 | 1, dieIndex as 0 | 1],
      };
    }
    return null;
  }

  if (
    to >= 1 &&
    to <= 24 &&
    canLandOn(state, to, player) &&
    !violatesPrimeRule(state, player, from, to)
  ) {
    return {
      from,
      to,
      usedDiceIndices: dieIndex === 0 ? [0, 0] : [1, 1],
    };
  }
  return null;
}

function dedupeKey(move: LegalMove): string {
  return move.to === 0
    ? `b-${move.from}-${move.usedDiceIndices[0]}`
    : `${move.from}-${move.to}-${move.usedDiceIndices[0]}`;
}

export function getLegalMoves(state: NardiState): LegalMove[] {
  if (state.phase !== "playing" || state.dice === null) return [];
  const player = state.turn;
  const leftHead = state.movesThisTurn.some((m) => m.from === HEAD[player]);
  const available = getAvailableDice(state);
  if (available.length === 0) return [];

  const canBearOff = canPlayerBearOff(state, player);
  const moves: LegalMove[] = [];
  const seen = new Set<string>();

  for (let from = 1; from <= 24; from++) {
    for (const { value: die, dieIndex } of available) {
      const move = getMoveFromPointWithDie(
        state,
        player,
        from,
        die,
        dieIndex,
        canBearOff,
        leftHead,
      );
      if (!move) continue;
      const key = dedupeKey(move);
      if (seen.has(key)) continue;
      seen.add(key);
      moves.push(move);
    }
  }
  return moves;
}

/**
 * Pick one suggested move for a hint: prefer bear-off, then advance furthest piece.
 * Returns null if there are no legal moves.
 */
export function pickHintMove(state: NardiState): LegalMove | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  const bearOff = moves.find((m) => m.to === 0);
  if (bearOff) return bearOff;
  const player = state.turn;
  if (player === "white") {
    return moves.reduce((a, b) => (a.from <= b.from ? a : b));
  }
  return moves.reduce((a, b) => (a.from >= b.from ? a : b));
}

export function getPointsWithMovableChips(state: NardiState): number[] {
  const moves = getLegalMoves(state);
  const set = new Set<number>();
  for (const m of moves) set.add(m.from);
  return Array.from(set);
}

export function getLegalDestinationsFromPoint(
  state: NardiState,
  from: number,
): number[] {
  const moves = getLegalMoves(state).filter((m) => m.from === from);
  const set = new Set<number>();
  for (const m of moves) set.add(m.to);
  return Array.from(set);
}

export function applyMove(
  state: NardiState,
  from: number,
  to: number,
  usedDiceIndices: [number, number],
): NardiState {
  const player = state.turn;
  const whitePoints = state.whitePoints.slice();
  const blackPoints = state.blackPoints.slice();
  let whiteBornOff = state.whiteBornOff;
  let blackBornOff = state.blackBornOff;
  const usedDice: [boolean, boolean] = [state.usedDice[0], state.usedDice[1]];
  for (const idx of usedDiceIndices) usedDice[idx] = true;

  if (to === 0) {
    if (player === "white") {
      whitePoints[from]--;
      whiteBornOff++;
    } else {
      blackPoints[from]--;
      blackBornOff++;
    }
  } else {
    if (player === "white") {
      whitePoints[from]--;
      whitePoints[to]++;
    } else {
      blackPoints[from]--;
      blackPoints[to]++;
    }
  }

  const movesThisTurn = [...state.movesThisTurn, { from, to, usedDiceIndices }];
  const isDouble = state.dice && state.dice[0] === state.dice[1];
  const allUsed = isDouble
    ? movesThisTurn.length >= 4
    : usedDice[0] && usedDice[1];

  const nextState: NardiState = {
    ...state,
    whitePoints,
    blackPoints,
    whiteBornOff,
    blackBornOff,
    usedDice: allUsed ? [false, false] : usedDice,
    movesThisTurn: allUsed ? [] : movesThisTurn,
    turn: allUsed ? (player === "white" ? "black" : "white") : state.turn,
    dice: allUsed ? null : state.dice,
  };

  if (whiteBornOff === 15 || blackBornOff === 15) {
    const winner: Player = whiteBornOff === 15 ? "white" : "black";
    const loserBornOff = winner === "white" ? blackBornOff : whiteBornOff;
    nextState.phase = "gameOver";
    nextState.gameOverResult = {
      winner,
      oynOrMars: loserBornOff > 0 ? "oyn" : "mars",
    };
  }

  return nextState;
}
