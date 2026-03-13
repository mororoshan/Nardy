import { useNardiGame } from "../../hooks/useNardiGame";
import { useNardiGameStore } from "../../stores/nardiGameStore";
import type { Player } from "../../game/direction";
import { Button } from "../ui";

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
      <div className="p-sm flex flex-col items-center gap-sm">
        <p className="m-0 text-text text-md">
          Roll to determine who starts (higher = White, plays first)
        </p>
        <div className="flex gap-lg items-center">
          <div className="flex flex-col items-center gap-xs">
            <span className="text-text-muted text-xs">White</span>
            <span className="text-[24px] font-bold text-text">
              {state.firstRollDice.white ?? "—"}
            </span>
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
          <div className="flex flex-col items-center gap-xs">
            <span className="text-text-muted text-xs">Black</span>
            <span className="text-[24px] font-bold text-text">
              {state.firstRollDice.black ?? "—"}
            </span>
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
    <div className="p-sm flex flex-col items-center gap-sm">
      <div className="flex gap-lg items-center">
        <span className="text-[20px] text-text min-w-[60px] text-center">
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
