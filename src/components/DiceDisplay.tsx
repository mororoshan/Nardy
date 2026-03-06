import type { CSSProperties } from "react";
import { useNardiGame } from "../hooks/useNardiGame";
import { useNardiGameStore } from "../stores/nardiGameStore";
import type { Player } from "../game/direction";

export interface DiceDisplayProps {
  localPlayer?: Player | null;
  isMultiplayer?: boolean;
  /** Called after local player rolls (playing phase); use to sync dice to peer. */
  onAfterRoll?: (dice: [number, number]) => void;
  /** Called after local player rolls in first-roll phase; use to sync state to peer. */
  onAfterFirstRoll?: () => void;
}

export function DiceDisplay({
  localPlayer = null,
  isMultiplayer = false,
  onAfterRoll,
  onAfterFirstRoll,
}: DiceDisplayProps = {}) {
  const { state, rollDice, rollForFirstTurn } = useNardiGame();

  if (state.phase === "firstRoll") {
    const showWhiteRoll =
      !isMultiplayer || localPlayer === null || localPlayer === "white";
    const showBlackRoll =
      (!isMultiplayer || localPlayer === null || localPlayer === "black") &&
      (state.firstRollDice.white !== null || !isMultiplayer);
    return (
      <div style={styles.container}>
        <p style={styles.text}>
          Roll to determine who starts (higher = White, plays first)
        </p>
        <div style={styles.row}>
          <div style={styles.column}>
            <span style={styles.label}>White</span>
            <span style={styles.die}>{state.firstRollDice.white ?? "—"}</span>
            {showWhiteRoll && (
              <button
                type="button"
                style={styles.button}
                onClick={() => {
                  rollForFirstTurn("white");
                  onAfterFirstRoll?.();
                }}
              >
                Roll
              </button>
            )}
          </div>
          <div style={styles.column}>
            <span style={styles.label}>Black</span>
            <span style={styles.die}>{state.firstRollDice.black ?? "—"}</span>
            {showBlackRoll && (
              <button
                type="button"
                style={styles.button}
                onClick={() => {
                  rollForFirstTurn("black");
                  onAfterFirstRoll?.();
                }}
              >
                Roll
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.phase !== "playing") return null;

  const needsRoll = state.dice === null;
  const isMyTurn =
    !isMultiplayer || localPlayer === null || state.turn === localPlayer;

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.dice}>
          {state.dice ? `${state.dice[0]} – ${state.dice[1]}` : "—"}
        </span>
        {needsRoll && isMyTurn && (
          <button
            type="button"
            style={styles.button}
            onClick={() => {
              rollDice();
              if (onAfterRoll) {
                const d = useNardiGameStore.getState().state.dice;
                if (d) onAfterRoll(d);
              }
            }}
          >
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
