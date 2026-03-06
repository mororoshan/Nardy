import type { CSSProperties } from "react";
import type { Player } from "../game/direction";
import { useNardiGame } from "../hooks/useNardiGame";
import {
  getLegalDestinationsFromPoint,
  getLegalMoves,
  applyMove,
} from "../game/nardiState";
import type { MovePayload } from "../hooks/useWebRtcSync";

export interface GameStatusProps {
  localPlayer?: Player | null;
  isMultiplayer?: boolean;
  /** Called after a move (e.g. bear off) with the applied move payload. */
  onAfterMove?: (move: MovePayload) => void;
  /** Called after user passes (no legal moves). */
  onAfterPass?: () => void;
}

export function GameStatus({
  localPlayer = null,
  isMultiplayer = false,
  onAfterMove,
  onAfterPass,
}: GameStatusProps = {}) {
  const { state, selectedPoint, moveTo, passWhenNoMoves, newGame } =
    useNardiGame();
  const legalDests =
    selectedPoint !== null
      ? getLegalDestinationsFromPoint(state, selectedPoint)
      : [];
  const canBearOff = legalDests.includes(0);
  const hasNoLegalMoves =
    state.phase === "playing" &&
    state.dice !== null &&
    getLegalMoves(state).length === 0;
  const isMyTurn =
    !isMultiplayer || localPlayer === null || state.turn === localPlayer;

  if (state.phase === "gameOver" && state.gameOverResult) {
    const { winner, oynOrMars } = state.gameOverResult;
    return (
      <div style={styles.container}>
        <p style={styles.result}>
          {winner === "white" ? "White" : "Black"} wins —{" "}
          {oynOrMars === "mars" ? "Mars (2)" : "Oyn (1)"}
        </p>
        <button type="button" style={styles.button} onClick={newGame}>
          New game
        </button>
      </div>
    );
  }

  if (state.phase !== "playing") return null;

  return (
    <div style={styles.container}>
      <p style={styles.turn}>
        {isMultiplayer && localPlayer !== null
          ? state.turn === localPlayer
            ? "Your turn"
            : "Opponent's turn"
          : `${state.turn === "white" ? "White" : "Black"}'s turn`}
      </p>
      {isMyTurn && selectedPoint !== null && canBearOff && (
        <button
          type="button"
          style={styles.button}
          onClick={() => {
            const moves = getLegalMoves(state);
            const move = moves.find(
              (m) => m.from === selectedPoint && m.to === 0,
            );
            if (move) {
              const next = applyMove(
                state,
                move.from,
                move.to,
                move.usedDiceIndices,
              );
              const payload: MovePayload = {
                from: move.from,
                to: move.to,
                usedDiceIndices: move.usedDiceIndices,
                isLastMoveOfTurn: next.dice === null,
              };
              moveTo(0);
              onAfterMove?.(payload);
            } else {
              moveTo(0);
            }
          }}
        >
          Bear off
        </button>
      )}
      {isMyTurn && hasNoLegalMoves && (
        <button
          type="button"
          style={styles.button}
          onClick={() => {
            passWhenNoMoves();
            onAfterPass?.();
          }}
          title="No legal moves with remaining die(s); end turn"
        >
          No moves — pass
        </button>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  turn: { margin: 0, color: "#ddd", fontSize: 14 },
  result: { margin: 0, color: "#fbbf24", fontSize: 16, fontWeight: "bold" },
  button: {
    padding: "6px 12px",
    cursor: "pointer",
    backgroundColor: "#4a5568",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 14,
  },
};
