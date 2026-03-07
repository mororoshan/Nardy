import type { CSSProperties } from "react";
import type { Player } from "../../game/direction";
import { useNardiGame } from "../../hooks/useNardiGame";
import { theme } from "../../theme";
import { Button } from "../ui";
import {
  getLegalDestinationsFromPoint,
  getLegalMoves,
} from "../../game/nardiState";
import { buildMovePayload } from "../../sync/webrtcSyncTypes";
import type { MovePayload } from "../../hooks/useWebRtcSync";

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
        <Button onClick={newGame}>New game</Button>
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
        <Button
          onClick={() => {
            const moves = getLegalMoves(state);
            const move = moves.find(
              (m) => m.from === selectedPoint && m.to === 0,
            );
            if (move) {
              const payload = buildMovePayload(
                state,
                move.from,
                move.to,
                move.usedDiceIndices,
              );
              moveTo(0);
              onAfterMove?.(payload);
            } else {
              moveTo(0);
            }
          }}
        >
          Bear off
        </Button>
      )}
      {isMyTurn && hasNoLegalMoves && (
        <Button
          onClick={() => {
            passWhenNoMoves();
            onAfterPass?.();
          }}
          title="No legal moves with remaining die(s); end turn"
        >
          No moves — pass
        </Button>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: theme.spacing.sm,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  turn: {
    margin: 0,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
  },
  result: {
    margin: 0,
    color: theme.colors.warning,
    fontSize: theme.fontSize.lg,
    fontWeight: "bold",
  },
};
