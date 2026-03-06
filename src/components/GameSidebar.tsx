import type { CSSProperties } from "react";
import { useState } from "react";
import type { Player } from "../game/direction";
import type { GameHistoryEntry } from "../stores/nardiGameStore";
import { useNardiGameStore } from "../stores/nardiGameStore";
import type { NardiGameSession } from "../session/gameSessionTypes";
import { DiceDisplay } from "./DiceDisplay";
import { GameStatus } from "./GameStatus";

const SIDEBAR_WIDTH = 300;

export interface GameSidebarProps {
  session: NardiGameSession;
  onBackToMenu: () => void;
}

const sidebarStyle: CSSProperties = {
  width: SIDEBAR_WIDTH,
  minWidth: SIDEBAR_WIDTH,
  height: "100%",
  position: "relative",
  zIndex: 1,
  backgroundColor: "rgba(26, 26, 46, 0.95)",
  borderLeft: "1px solid rgba(63, 63, 70, 0.8)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid rgba(63, 63, 70, 0.8)",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const backButtonStyle: CSSProperties = {
  padding: "8px 16px",
  fontSize: 14,
  backgroundColor: "rgba(63, 63, 70, 0.9)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  alignSelf: "flex-start",
};

const tabBarStyle: CSSProperties = {
  display: "flex",
  borderBottom: "1px solid rgba(63, 63, 70, 0.8)",
};

const tabStyle = (active: boolean): CSSProperties => ({
  flex: 1,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: active ? "#fff" : "#a1a1aa",
  backgroundColor: active ? "rgba(63, 63, 70, 0.5)" : "transparent",
  border: "none",
  cursor: "pointer",
});

const tabContentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: 12,
};

/**
 * Format a single move for display. Same convention for both players: from→to or from→off.
 * White's wrap 24→1 is shown as "24→1 (around)" so it's clear it's the board wrap.
 */
function formatMove(
  m: { from: number; to: number },
  player: Player,
): string {
  if (m.to === 0) return `${m.from}→off`;
  const isWhiteWrap = player === "white" && m.from === 24 && m.to === 1;
  return isWhiteWrap ? "24→1 (around)" : `${m.from}→${m.to}`;
}

function MovesTabContent() {
  const gameHistory = useNardiGameStore((s) => s.gameHistory);

  const diceSums = gameHistory.reduce(
    (acc, entry) => {
      const sum = entry.dice[0] + entry.dice[1];
      acc[entry.turn] += sum;
      return acc;
    },
    { white: 0, black: 0 } as Record<Player, number>,
  );

  if (gameHistory.length === 0) {
    return (
      <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13 }}>
        No moves yet. Rolls and moves will appear here as the game progresses.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "#a1a1aa",
          paddingBottom: 8,
          borderBottom: "1px solid rgba(63, 63, 70, 0.6)",
        }}
      >
        <span>White dice sum: <strong style={{ color: "#e4e4e7" }}>{diceSums.white}</strong></span>
        <span>Black dice sum: <strong style={{ color: "#e4e4e7" }}>{diceSums.black}</strong></span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, color: "#e4e4e7", fontSize: 13 }}>
        {gameHistory.map((entry: GameHistoryEntry, i: number) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <span style={{ color: "#a1a1aa" }}>
              {entry.turn === "white" ? "White" : "Black"}
            </span>{" "}
            <span style={{ fontWeight: 500 }}>
              {entry.dice[0]}–{entry.dice[1]}
            </span>
            {entry.moves.length > 0 ? (
              <>: {entry.moves.map((m) => formatMove(m, entry.turn)).join(", ")}</>
            ) : (
              " — pass"
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GameSidebar({ session, onBackToMenu }: GameSidebarProps) {
  const [activeTab, setActiveTab] = useState<"moves" | "controls">("controls");

  return (
    <aside style={sidebarStyle}>
      <div style={headerStyle}>
        <button
          type="button"
          style={backButtonStyle}
          onClick={onBackToMenu}
          title="Back to menu"
        >
          ← Menu
        </button>
        {session.connectionStatus !== "disconnected" && (
          <span style={{ fontSize: 12, color: "#a1a1aa" }}>
            {session.connectionStatus === "connecting"
              ? "Connecting…"
              : "Connected"}
          </span>
        )}
        {session.roomId && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: "#a1a1aa" }}>
              Room: <strong style={{ color: "#e4e4e7" }}>{session.roomId}</strong>
            </span>
            <button
              type="button"
              onClick={session.copyRoomCode}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                cursor: "pointer",
                backgroundColor: "#3f3f46",
                color: "#fff",
                border: "none",
                borderRadius: 4,
              }}
            >
              Copy code
            </button>
          </div>
        )}
      </div>
      <div style={tabBarStyle}>
        <button
          type="button"
          style={tabStyle(activeTab === "moves")}
          onClick={() => setActiveTab("moves")}
        >
          Moves
        </button>
        <button
          type="button"
          style={tabStyle(activeTab === "controls")}
          onClick={() => setActiveTab("controls")}
        >
          Controls
        </button>
      </div>
      <div style={tabContentStyle}>
        {activeTab === "moves" && <MovesTabContent />}
        {activeTab === "controls" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <DiceDisplay
              localPlayer={session.localPlayer}
              isMultiplayer={session.mode === "multiplayer"}
              onAfterRoll={session.onAfterRoll}
              onAfterFirstRoll={session.onAfterFirstRoll}
            />
            <GameStatus
              localPlayer={session.localPlayer}
              isMultiplayer={session.mode === "multiplayer"}
              onAfterMove={session.onAfterMove}
              onAfterPass={session.onAfterPass}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
