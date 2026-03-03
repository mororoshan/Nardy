import type { CSSProperties } from "react";
import { useNardiGame } from "../hooks/useNardiGame";

export function DiceDisplay() {
  const { state, rollDice, rollForFirstTurn } = useNardiGame();

  if (state.phase === "firstRoll") {
    return (
      <div style={styles.container}>
        <p style={styles.text}>
          Roll to determine who starts (higher = White, plays first)
        </p>
        <div style={styles.row}>
          <div style={styles.column}>
            <span style={styles.label}>White</span>
            <span style={styles.die}>{state.firstRollDice.white ?? "—"}</span>
            <button
              type="button"
              style={styles.button}
              onClick={() => rollForFirstTurn("white")}
            >
              Roll
            </button>
          </div>
          <div style={styles.column}>
            <span style={styles.label}>Black</span>
            <span style={styles.die}>{state.firstRollDice.black ?? "—"}</span>
            <button
              type="button"
              style={styles.button}
              onClick={() => rollForFirstTurn("black")}
            >
              Roll
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase !== "playing") return null;

  const needsRoll = state.dice === null;

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.dice}>
          {state.dice ? `${state.dice[0]} – ${state.dice[1]}` : "—"}
        </span>
        {needsRoll && (
          <button type="button" style={styles.button} onClick={rollDice}>
            Roll dice
          </button>
        )}
      </div>
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
  text: { margin: 0, color: "#eee", fontSize: 14 },
  row: { display: "flex", gap: 16, alignItems: "center" },
  column: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  label: { color: "#aaa", fontSize: 12 },
  die: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  dice: {
    fontSize: 20,
    color: "#fff",
    minWidth: 60,
    textAlign: "center" as const,
  },
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
