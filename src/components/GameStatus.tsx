import type { CSSProperties } from "react";
import { useNardiGame } from "../hooks/useNardiGame";
import { getLegalDestinationsFromPoint } from "../game/nardiState";

export function GameStatus() {
  const { state, selectedPoint, moveTo, newGame } = useNardiGame();
  const legalDests =
    selectedPoint !== null
      ? getLegalDestinationsFromPoint(state, selectedPoint)
      : [];
  const canBearOff = legalDests.includes(0);

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
        {state.turn === "white" ? "White" : "Black"}&apos;s turn
      </p>
      {selectedPoint !== null && canBearOff && (
        <button type="button" style={styles.button} onClick={() => moveTo(0)}>
          Bear off
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
