import type { CSSProperties } from "react";
import type { Player } from "../../game/direction";
import { theme } from "../../theme";
import { Button } from "../ui";

export interface GameEndScreenProps {
  winner: Player;
  oynOrMars: "oyn" | "mars";
  onBackToMenu: () => void;
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  zIndex: 10,
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing.lg,
  padding: theme.spacing.xl,
  backgroundColor: theme.colors.surface,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.sidebarBorder}`,
  maxWidth: 320,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  color: theme.colors.text,
};

const resultStyle: CSSProperties = {
  margin: 0,
  fontSize: theme.fontSize.lg,
  color: theme.colors.warning,
  fontWeight: 600,
};

/**
 * Full-screen overlay shown when the game ends. Shows winner, oyn/mars, and Back to menu.
 */
export function GameEndScreen({
  winner,
  oynOrMars,
  onBackToMenu,
}: GameEndScreenProps) {
  const winnerLabel = winner === "white" ? "White" : "Black";
  const resultLabel =
    oynOrMars === "mars" ? "Mars (2 points)" : "Oyn (1 point)";

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
    >
      <div style={cardStyle}>
        <h2 style={titleStyle}>Game over</h2>
        <p style={resultStyle}>
          {winnerLabel} wins — {resultLabel}
        </p>
        <Button onClick={onBackToMenu}>Back to menu</Button>
      </div>
    </div>
  );
}
