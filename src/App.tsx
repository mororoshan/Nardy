import { useCallback, useEffect, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { GameLayout } from "./components/GameLayout";
import { BackgammonBoard } from "./components/BackgammonBoard";
import { GameSidebar } from "./components/GameSidebar";
import { MainMenu } from "./components/MainMenu";
import { useWebRtcSync } from "./hooks/useWebRtcSync";
import { useGameSession } from "./session/useGameSession";

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
  const [gameMode, setGameMode] = useState<"local" | "multiplayer">("local");
  const [boardContainer, setBoardContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });

  const sync = useWebRtcSync();
  const session = useGameSession(
    screen === "game" ? gameMode : "local",
    sync,
  );

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

  const handleBackToMenu = () => {
    session.leaveGame();
    setScreen("menu");
  };

  if (screen === "menu") {
    return (
      <MainMenu
        onCreateGame={async () => {
          await sync.createGame();
          setGameMode("multiplayer");
          setScreen("game");
        }}
        onJoinGame={async (roomId) => {
          await sync.joinGame(roomId);
          setGameMode("multiplayer");
          setScreen("game");
        }}
        onSinglePlayer={() => {
          setGameMode("local");
          setScreen("game");
        }}
      />
    );
  }

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
              <BackgammonBoard session={session} />
            </GameLayout>
          </Application>
        )}
      </div>
      <GameSidebar session={session} onBackToMenu={handleBackToMenu} />
    </div>
  );
}
