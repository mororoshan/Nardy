import { useCallback, useEffect, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { GameLayout } from "./components/GameLayout";
import { BackgammonBoard } from "./components/BackgammonBoard";
import { GameSidebar } from "./components/GameSidebar";
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

const gameScreenStyle: React.CSSProperties = {
  display: "flex",
  width: "100vw",
  height: "100vh",
  position: "relative",
  overflow: "hidden",
};

const boardAreaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  position: "relative",
  backgroundColor: "#1a1a2e",
  overflow: "hidden",
};

export default function App() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [boardContainer, setBoardContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });

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

  const setBoardAreaRef = useCallback((el: HTMLDivElement | null) => {
    setBoardContainer(el);
  }, []);

  useEffect(() => {
    if (!boardContainer) return;
    const update = () =>
      setBoardSize({
        width: boardContainer.offsetWidth,
        height: boardContainer.offsetHeight,
      });
    const ro = new ResizeObserver(update);
    ro.observe(boardContainer);
    update();
    return () => ro.disconnect();
  }, [boardContainer]);

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

  // Only mount Application when we have the board container ref, so the canvas
  // is constrained to the board area and does not cover the sidebar (avoid
  // resizeTo=window on first frame which can paint full viewport).
  const resizeTarget = boardContainer ?? undefined;

  return (
    <div style={gameScreenStyle}>
      <div ref={setBoardAreaRef} style={boardAreaStyle}>
        {resizeTarget && (
          <Application background="#1a1a2e" resizeTo={resizeTarget}>
            <GameLayout
              width={boardSize.width > 0 ? boardSize.width : undefined}
              height={boardSize.height > 0 ? boardSize.height : undefined}
            >
              <BackgammonBoard
                localPlayer={localPlayer}
                isMultiplayer={isMultiplayer}
                onAfterMove={isMultiplayer ? onAfterMove : undefined}
              />
            </GameLayout>
          </Application>
        )}
      </div>
      <GameSidebar
        onBackToMenu={handleBackToMenu}
        connectionStatus={connectionStatus}
        roomId={roomId}
        onCopyRoomCode={copyRoomCode}
        localPlayer={localPlayer}
        isMultiplayer={isMultiplayer}
        onAfterMove={isMultiplayer ? onAfterMove : undefined}
        onAfterPass={isMultiplayer ? onAfterPass : undefined}
        onAfterRoll={isMultiplayer ? sendDice : undefined}
        onAfterFirstRoll={isMultiplayer ? sendCurrentState : undefined}
      />
    </div>
  );
}
