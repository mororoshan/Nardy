import { createContext, useCallback, useState, type ReactNode } from "react";
import type { NardiGameContextValue } from "./nardiGameContextValue";
import type { Player } from "../game/direction";
import {
  createInitialState,
  applyMove,
  getLegalMoves,
  type NardiState,
} from "../game/nardiState";

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export const NardiGameContext = createContext<NardiGameContextValue | null>(
  null,
);

interface NardiGameProviderProps {
  children: ReactNode;
}

export function NardiGameProvider({ children }: NardiGameProviderProps) {
  const [state, setState] = useState<NardiState>(createInitialState);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  const rollForFirstTurn = useCallback((player: Player): number => {
    const value = rollDie();
    setState((prev) => {
      if (prev.phase !== "firstRoll") return prev;
      const next = { ...prev };
      if (player === "white")
        next.firstRollDice = { ...next.firstRollDice, white: value };
      else next.firstRollDice = { ...next.firstRollDice, black: value };
      const { white, black } = next.firstRollDice;
      if (white !== null && black !== null) {
        next.phase = "playing";
        next.turn = white >= black ? "white" : "black";
        next.dice = null;
      }
      return next;
    });
    return value;
  }, []);

  const rollDice = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== "playing" || prev.dice !== null) return prev;
      return { ...prev, dice: [rollDie(), rollDie()] };
    });
  }, []);

  const selectPoint = useCallback((pointIndex: number | null) => {
    setSelectedPoint(pointIndex);
  }, []);

  const moveTo = useCallback(
    (pointIndex: number) => {
      if (selectedPoint === null) return;
      const moves = getLegalMoves(state);
      const move = moves.find(
        (m) =>
          m.from === selectedPoint &&
          (m.to === pointIndex || (m.to === 0 && pointIndex === 0)),
      );
      if (!move) return;
      const next = applyMove(state, move.from, move.to, move.usedDiceIndices);
      setState(next);
      setSelectedPoint(null);
    },
    [state, selectedPoint],
  );

  const newGame = useCallback(() => {
    setState(createInitialState());
    setSelectedPoint(null);
  }, []);

  const value: NardiGameContextValue = {
    state,
    selectedPoint,
    rollDice,
    rollForFirstTurn,
    selectPoint,
    moveTo,
    newGame,
  };

  return (
    <NardiGameContext.Provider value={value}>
      {children}
    </NardiGameContext.Provider>
  );
}
