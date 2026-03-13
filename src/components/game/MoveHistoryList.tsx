import type { GameHistoryEntry } from "../../stores/nardiGameStore";
import { useNardiGameStore } from "../../stores/nardiGameStore";
import { formatMove } from "../../game/formatMove";

export function MoveHistoryList() {
  const gameHistory = useNardiGameStore((s) => s.gameHistory);

  const diceSums = gameHistory.reduce<Record<"white" | "black", number>>(
    (acc, entry) => {
      const sum = entry.dice[0] + entry.dice[1];
      return { ...acc, [entry.turn]: acc[entry.turn] + sum };
    },
    { white: 0, black: 0 },
  );

  if (gameHistory.length === 0) {
    return (
      <p className="m-0 text-text-muted text-sm">
        No moves yet. Rolls and moves will appear here as the game progresses.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex justify-between text-sm text-text-muted pb-sm border-b border-sidebar-border">
        <span>
          White dice sum:{" "}
          <strong className="text-text">{diceSums.white}</strong>
        </span>
        <span>
          Black dice sum:{" "}
          <strong className="text-text">{diceSums.black}</strong>
        </span>
      </div>
      <ul className="m-0 pl-5 text-text text-sm list-none">
        {gameHistory.map((entry: GameHistoryEntry, i: number) => (
          <li key={i} className="mb-sm">
            <span className="text-text-muted">
              {entry.turn === "white" ? "White" : "Black"}
            </span>{" "}
            <span className="font-medium">
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
