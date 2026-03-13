import type { Player } from "../../game/direction";
import type { MatchScore } from "../../contexts/nardiGameContextValue";
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
      className="absolute inset-0 flex items-center justify-center bg-black/75 z-10"
      role="dialog"
      aria-modal="true"
      aria-label="Game over"
    >
      <div className="flex flex-col items-center gap-lg p-xl bg-surface rounded-md border border-sidebar-border max-w-[320px]">
        <h2 className="m-0 text-[20px] font-semibold text-text">Game over</h2>
        <p className="m-0 text-lg text-warning font-semibold">
          {winnerLabel} wins — {resultLabel}
        </p>
        <p className="m-0 text-md text-text-muted">
          Match: White {matchScore.white} – {matchScore.black} Black
        </p>
        {matchOver ? (
          <>
            <p className="m-0 text-lg text-warning font-semibold">
              Match over: {matchWinnerLabel} wins
            </p>
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
