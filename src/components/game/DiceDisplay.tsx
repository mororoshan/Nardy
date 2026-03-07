import type { CSSProperties } from "react";
import { useNardiGame } from "../../hooks/useNardiGame";
import { useNardiGameStore } from "../../stores/nardiGameStore";
import type { Player } from "../../game/direction";
import { theme } from "../../theme";
import { Button } from "../ui";

export interface DiceDisplayProps {
  localPlayer?: Player | null;
  isMultiplayer?: boolean;
  /** Called after local player rolls (playing phase); use to sync dice to peer. */
  onAfterRoll?: (dice: [number, number]) => void;
  /** Called after local player rolls in first-roll phase; use to sync state to peer. */
  onAfterFirstRoll?: () => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: theme.spacing.sm,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  text: { margin: 0, color: theme.colors.text, fontSize: theme.fontSize.md },
  row: { display: "flex", gap: theme.spacing.lg, alignItems: "center" },
  column: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  label: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  die: { fontSize: 24, fontWeight: "bold", color: theme.colors.text },
  dice: {
    fontSize: 20,
    color: theme.colors.text,
    minWidth: 60,
    textAlign: "center",
  },
};

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
              <Button
                size="md"
                onClick={() => {
                  rollForFirstTurn("white");
                  onAfterFirstRoll?.();
                }}
              >
                Roll
              </Button>
            )}
          </div>
          <div style={styles.column}>
            <span style={styles.label}>Black</span>
            <span style={styles.die}>{state.firstRollDice.black ?? "—"}</span>
            {showBlackRoll && (
              <Button
                size="md"
                onClick={() => {
                  rollForFirstTurn("black");
                  onAfterFirstRoll?.();
                }}
              >
                Roll
              </Button>
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
          <Button
            size="md"
            onClick={() => {
              rollDice();
              if (onAfterRoll) {
                const d = useNardiGameStore.getState().state.dice;
                if (d) onAfterRoll(d);
              }
            }}
          >
            Roll dice
          </Button>
        )}
      </div>
    </div>
  );
}
