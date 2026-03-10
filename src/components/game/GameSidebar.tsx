import type { CSSProperties } from "react";
import { useState } from "react";
import type { NardiGameSession } from "../../session/gameSessionTypes";
import { theme } from "../../theme";
import { Button, TabBar } from "../ui";
import { MoveHistoryList } from "./MoveHistoryList";
import { DiceDisplay } from "./DiceDisplay";
import { GameStatus } from "./GameStatus";

const SIDEBAR_WIDTH = 300;

export interface GameSidebarProps {
  session: NardiGameSession;
  onBackToMenu: () => void;
  isNarrow?: boolean;
}

const sidebarStyle: CSSProperties = {
  width: SIDEBAR_WIDTH,
  minWidth: SIDEBAR_WIDTH,
  position: "relative",
  zIndex: 1,
  backgroundColor: theme.colors.sidebarBg,
  borderLeft: `1px solid ${theme.colors.sidebarBorder}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const sidebarStyleNarrow: CSSProperties = {
  width: "100%",
  minWidth: 0,
  flexShrink: 0,
  position: "relative",
  zIndex: 1,
  backgroundColor: theme.colors.sidebarBg,
  borderTop: `1px solid ${theme.colors.sidebarBorder}`,
  borderLeft: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  overflow: "auto",
};

const headerStyle: CSSProperties = {
  padding: theme.spacing.md,
  borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.sm,
};

const connectionStyle: CSSProperties = {
  fontSize: theme.fontSize.xs,
  color: theme.colors.textMuted,
};

const roomRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  flexWrap: "wrap",
};

const roomLabelStyle: CSSProperties = {
  fontSize: theme.fontSize.xs,
  color: theme.colors.textMuted,
};

export function GameSidebar({
  session,
  onBackToMenu,
  isNarrow = false,
}: GameSidebarProps) {
  const [activeTab, setActiveTab] = useState<"moves" | "controls">("controls");

  return (
    <aside style={isNarrow ? sidebarStyleNarrow : sidebarStyle}>
      <div style={headerStyle}>
        <Button
          variant="secondary"
          size="md"
          onClick={onBackToMenu}
          title="Back to menu"
        >
          ← Menu
        </Button>
        {session.connectionStatus !== "disconnected" && (
          <span style={connectionStyle}>
            {session.connectionStatus === "connecting"
              ? "Connecting…"
              : "Connected"}
          </span>
        )}
        {session.roomId && (
          <div style={roomRowStyle}>
            <span style={roomLabelStyle}>
              Room:{" "}
              <strong style={{ color: theme.colors.text }}>
                {session.roomId}
              </strong>
            </span>
            <Button size="sm" onClick={session.copyRoomCode}>
              Copy code
            </Button>
          </div>
        )}
      </div>
      <TabBar
        tabs={[
          { id: "moves", label: "Moves" },
          { id: "controls", label: "Controls" },
        ]}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as "moves" | "controls")}
      >
        {activeTab === "moves" ? (
          <MoveHistoryList />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.lg,
            }}
          >
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
      </TabBar>
    </aside>
  );
}
