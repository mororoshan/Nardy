import type { CSSProperties } from "react";
import type { GameHistoryEntry } from "../../stores/nardiGameStore";
import { useNardiGameStore } from "../../stores/nardiGameStore";
import { theme } from "../../theme";
import { formatMove } from "../../game/formatMove";

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.md,
};

const summaryStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: theme.fontSize.sm,
  color: theme.colors.textMuted,
  paddingBottom: theme.spacing.sm,
  borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
};

const LIST_INDENT = 20;

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: LIST_INDENT,
  color: theme.colors.text,
  fontSize: theme.fontSize.sm,
};

const emptyStyle: CSSProperties = {
  margin: 0,
  color: theme.colors.textMuted,
  fontSize: theme.fontSize.sm,
};

export function MoveHistoryList() {
  const gameHistory = useNardiGameStore((s) => s.gameHistory);

  const diceSums = gameHistory.reduce(
    (acc, entry) => {
      const sum = entry.dice[0] + entry.dice[1];
      acc[entry.turn] += sum;
      return acc;
    },
    { white: 0, black: 0 } as Record<"white" | "black", number>,
  );

  if (gameHistory.length === 0) {
    return (
      <p style={emptyStyle}>
        No moves yet. Rolls and moves will appear here as the game progresses.
      </p>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={summaryStyle}>
        <span>
          White dice sum:{" "}
          <strong style={{ color: theme.colors.text }}>{diceSums.white}</strong>
        </span>
        <span>
          Black dice sum:{" "}
          <strong style={{ color: theme.colors.text }}>{diceSums.black}</strong>
        </span>
      </div>
      <ul style={listStyle}>
        {gameHistory.map((entry: GameHistoryEntry, i: number) => (
          <li key={i} style={{ marginBottom: theme.spacing.sm }}>
            <span style={{ color: theme.colors.textMuted }}>
              {entry.turn === "white" ? "White" : "Black"}
            </span>{" "}
            <span style={{ fontWeight: 500 }}>
              {entry.dice[0]}–{entry.dice[1]}
            </span>
            {entry.moves.length > 0 ? (
              <>
                : {entry.moves.map((m) => formatMove(m, entry.turn)).join(", ")}
              </>
            ) : (
              " — pass"
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
