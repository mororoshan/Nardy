import type { CSSProperties } from "react";
import type { Player } from "../../game/direction";
import type { MatchScore } from "../../contexts/nardiGameContextValue";
import { theme } from "../../theme";
import { Button } from "../ui";

export interface GameEndScreenProps {
  winner: Player;
  oynOrMars: "oyn" | "mars";
  matchScore: MatchScore;
  matchTarget: number;
  onNextGame: () => void;
  onNewMatch: () => void;
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

const scoreStyle: CSSProperties = {
  margin: 0,
  fontSize: theme.fontSize.md,
  color: theme.colors.textMuted,
};

/**
 * Full-screen overlay shown when the game ends. Shows winner, oyn/mars, match score,
 * and actions: Next game (same match), New match (reset score), Back to menu.
 */
export function GameEndScreen({
  winner,
  oynOrMars,
  matchScore,
  matchTarget,
  onNextGame,
  onNewMatch,
  onBackToMenu,
}: GameEndScreenProps) {
  const winnerLabel = winner === "white" ? "White" : "Black";
  const resultLabel =
    oynOrMars === "mars" ? "Mars (2 points)" : "Oyn (1 point)";
  const matchOver =
    matchTarget > 0 &&
    (matchScore.white >= matchTarget || matchScore.black >= matchTarget);
  const matchWinner: Player =
    matchScore.white >= matchTarget ? "white" : "black";
  const matchWinnerLabel = matchWinner === "white" ? "White" : "Black";

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
        <p style={scoreStyle}>
          Match: White {matchScore.white} – {matchScore.black} Black
        </p>
        {matchOver ? (
          <>
            <p style={resultStyle}>Match over: {matchWinnerLabel} wins</p>
            <Button onClick={onNewMatch}>New match</Button>
          </>
        ) : (
          <Button onClick={onNextGame}>Next game</Button>
        )}
        <Button onClick={onBackToMenu}>Back to menu</Button>
      </div>
    </div>
  );
}
