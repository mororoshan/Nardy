/**
 * Opponent AI for single-player (local) mode.
 * When it is black's turn, rolls dice if needed and applies a random legal move after a short delay.
 */

import { useEffect, useRef } from "react";
import { getLegalMoves } from "../game/nardiState";
import { useNardiGameStore } from "../stores/nardiGameStore";
import type { NardiGameSession } from "../session/gameSessionTypes";

const AI_ROLL_DELAY_MS = 600;
const AI_MOVE_DELAY_MS = 500;

export function useOpponentAi(
  session: NardiGameSession | null,
  isInGame: boolean,
): void {
  const phase = useNardiGameStore((s) => s.state.phase);
  const turn = useNardiGameStore((s) => s.state.turn);
  const dice = useNardiGameStore((s) => s.state.dice);
  const firstRollWhite = useNardiGameStore((s) => s.state.firstRollDice.white);
  const firstRollBlack = useNardiGameStore((s) => s.state.firstRollDice.black);
  const movesThisTurnLength = useNardiGameStore(
    (s) => s.state.movesThisTurn.length,
  );
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (
      !isInGame ||
      !session ||
      session.mode !== "local" ||
      session.localPlayMode !== "vsBot"
    ) {
      scheduledRef.current = false;
      return;
    }

    if (
      phase === "firstRoll" &&
      firstRollWhite !== null &&
      firstRollBlack === null
    ) {
      if (scheduledRef.current) return;
      scheduledRef.current = true;
      const t = setTimeout(() => {
        useNardiGameStore.getState().rollForFirstTurn("black");
        scheduledRef.current = false;
      }, AI_ROLL_DELAY_MS);
      return () => {
        clearTimeout(t);
        scheduledRef.current = false;
      };
    }

    if (phase !== "playing" || turn !== "black") {
      scheduledRef.current = false;
      return;
    }

    if (dice === null) {
      if (scheduledRef.current) return;
      scheduledRef.current = true;
      const t = setTimeout(() => {
        useNardiGameStore.getState().rollDice();
        scheduledRef.current = false;
      }, AI_ROLL_DELAY_MS);
      return () => {
        clearTimeout(t);
        scheduledRef.current = false;
      };
    }

    if (scheduledRef.current) return;
    scheduledRef.current = true;
    const t = setTimeout(() => {
      const store = useNardiGameStore.getState();
      const currentState = store.state;
      const moves = getLegalMoves(currentState);
      if (moves.length === 0) {
        store.passWhenNoMoves();
      } else {
        const move = moves[Math.floor(Math.random() * moves.length)];
        store.applyMoveFromLegalMove(move);
      }
      scheduledRef.current = false;
    }, AI_MOVE_DELAY_MS);
    return () => {
      clearTimeout(t);
      scheduledRef.current = false;
    };
  }, [
    isInGame,
    session,
    phase,
    turn,
    dice,
    firstRollWhite,
    firstRollBlack,
    movesThisTurnLength,
  ]);
}
