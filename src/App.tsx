import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { GameLayout } from "./components/GameLayout";
import { BackgammonBoard } from "./components/BackgammonBoard";
import { DiceDisplay } from "./components/DiceDisplay";
import { GameStatus } from "./components/GameStatus";
import { MainMenu } from "./components/MainMenu";
import {
  useWebRtcSync,
  ConnectionStatus,
  type MovePayload,
} from "./hooks/useWebRtcSync";

extend({
  Container,
  Graphics,
  Sprite,
  Text,
});

const overlayStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  gap: 24,
  padding: 12,
  pointerEvents: "none",
};

const overlayContentStyle: CSSProperties = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: 24,
  backgroundColor: "rgba(26, 26, 46, 0.9)",
  padding: "8px 16px",
  borderRadius: 8,
};

const backButtonStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  padding: "8px 16px",
  fontSize: 14,
  backgroundColor: "rgba(63, 63, 70, 0.9)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  pointerEvents: "auto",
};

export default function App() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const {
    createGame,
    joinGame,
    leaveGame,
    connectionStatus,
    roomId,
    localPlayer,
    sendDice,
    sendCurrentState,
    sendMove,
    sendPass,
  } = useWebRtcSync();
  const isMultiplayer = connectionStatus !== ConnectionStatus.Disconnected;

  const onAfterMove = (move: MovePayload) => {
    if (isMultiplayer) sendMove(move);
  };
  const onAfterPass = () => {
    if (isMultiplayer) sendPass();
  };

  const handleBackToMenu = () => {
    leaveGame();
    setScreen("menu");
  };

  const copyRoomCode = () => {
    if (!roomId) return;
    void navigator.clipboard.writeText(roomId);
  };

  if (screen === "menu") {
    return (
      <MainMenu
        onCreateGame={async () => {
          await createGame();
          setScreen("game");
        }}
        onJoinGame={async (roomId) => {
          await joinGame(roomId);
          setScreen("game");
        }}
        onSinglePlayer={() => setScreen("game")}
      />
    );
  }

  const gameDivRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <button
        type="button"
        style={backButtonStyle}
        onClick={handleBackToMenu}
        title="Back to menu"
      >
        ← Menu
      </button>
      <div style={{
        outline: '1px soild lime',
        width: '600px',
        height: '400px',
      }} ref={gameDivRef}>

      </div>
      <Application background="#1a1a2e" resizeTo={gameDivRef}>
        <GameLayout>
          <BackgammonBoard
            localPlayer={localPlayer}
            isMultiplayer={isMultiplayer}
            onAfterMove={isMultiplayer ? onAfterMove : undefined}
          />
        </GameLayout>
      </Application>
      <div style={overlayStyle}>
        <div style={overlayContentStyle}>
          {connectionStatus !== ConnectionStatus.Disconnected && (
            <span style={{ fontSize: 12, color: "#a1a1aa" }}>
              {connectionStatus === ConnectionStatus.Connecting
                ? "Connecting…"
                : "Connected"}
            </span>
          )}
          {roomId && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#a1a1aa" }}>
                Room: <strong style={{ color: "#e4e4e7" }}>{roomId}</strong>
              </span>
              <button
                type="button"
                onClick={copyRoomCode}
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
          <DiceDisplay
            localPlayer={localPlayer}
            isMultiplayer={isMultiplayer}
            onAfterRoll={isMultiplayer ? sendDice : undefined}
            onAfterFirstRoll={isMultiplayer ? sendCurrentState : undefined}
          />
          <GameStatus
            localPlayer={localPlayer}
            isMultiplayer={isMultiplayer}
            onAfterMove={isMultiplayer ? onAfterMove : undefined}
            onAfterPass={isMultiplayer ? onAfterPass : undefined}
          />
        </div>
      </div>
    </div>
  );
}
