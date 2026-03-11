import { useCallback, useEffect, useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { GameLayout } from "./components/layout/GameLayout";
import { GameScreenLayout } from "./components/layout/GameScreenLayout";
import { BOARD_ASPECT_RATIO } from "./game/boardGeometry";

import { MainMenu } from "./components/MainMenu";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { useOpponentAi } from "./hooks/useOpponentAi";
import { useWebRtcSync } from "./hooks/useWebRtcSync";
import { useGameSession } from "./session/useGameSession";
import { theme } from "./theme";
import { BackgammonBoard, GameEndScreen, GameSidebar } from "./components/game";
import { useChatStore } from "./stores/chatStore";
import { useNardiGameStore } from "./stores/nardiGameStore";
import type { LocalPlayMode } from "./session/gameSessionTypes";
import { clearLastRoom } from "./sync/lastRoomStorage";

extend({
  Container,
  Graphics,
  Sprite,
  Text,
});

const boardWrapperStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  aspectRatio: BOARD_ASPECT_RATIO,
  position: "relative",
  backgroundColor: theme.colors.background,
  overflow: "hidden",
  /** Fit within slot while keeping aspect ratio (like object-fit: contain). */
  maxWidth: "100%",
  maxHeight: "100%",
  margin: "auto",
};

export default function App() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [gameMode, setGameMode] = useState<"local" | "multiplayer">("local");
  const [localPlayMode, setLocalPlayMode] = useState<LocalPlayMode>("vsBot");
  const [rankedSearchStarted, setRankedSearchStarted] = useState(false);
  const [boardContainer, setBoardContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });

  const sync = useWebRtcSync();

  useEffect(() => {
    if (
      screen !== "menu" ||
      !rankedSearchStarted ||
      !sync.roomId ||
      sync.connectionStatus !== "connected"
    )
      return;
    setGameMode("multiplayer");
    setScreen("game");
    setRankedSearchStarted(false);
  }, [screen, rankedSearchStarted, sync.roomId, sync.connectionStatus]);
  const session = useGameSession(
    screen === "game" ? gameMode : "local",
    sync,
    screen === "game" && gameMode === "local" ? localPlayMode : "vsBot",
  );
  const { isNarrow } = useBreakpoint();
  useOpponentAi(session, screen === "game");
  const gamePhase = useNardiGameStore((s) => s.state.phase);
  const gameOverResult = useNardiGameStore((s) => s.state.gameOverResult);
  const matchScore = useNardiGameStore((s) => s.matchScore);
  const matchTarget = useNardiGameStore((s) => s.matchTarget);
  const nextGame = useNardiGameStore((s) => s.nextGame);
  const newGame = useNardiGameStore((s) => s.newGame);

  useEffect(() => {
    if (
      gamePhase !== "gameOver" ||
      !gameOverResult ||
      !session.isRankedGame ||
      !session.reportGameResult
    )
      return;
    session.reportGameResult(gameOverResult.winner);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on values used only; session object would cause unnecessary runs
  }, [
    gamePhase,
    gameOverResult,
    session.isRankedGame,
    session.reportGameResult,
  ]);

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
    useChatStore.getState().clearMessages();
    session.leaveGame();
    setScreen("menu");
  };

  if (screen === "menu") {
    return (
      <MainMenu
        touchFriendly={isNarrow}
        queueStatus={sync.queueStatus}
        playerRating={sync.playerRating}
        onOpenLeaderboard={() => sync.fetchLeaderboard()}
        leaderboardEntries={sync.leaderboardEntries}
        leaderboardError={sync.leaderboardError}
        leaderboardLoading={sync.leaderboardLoading}
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
        onPlayRanked={async () => {
          setRankedSearchStarted(true);
          await sync.joinRankedQueue();
        }}
        onCancelRanked={() => {
          setRankedSearchStarted(false);
          sync.leaveRankedQueue();
        }}
        onRejoinAsHost={async (roomId) => {
          await sync.createGame(roomId);
          setGameMode("multiplayer");
          setScreen("game");
        }}
        onSinglePlayer={() => {
          clearLastRoom();
          setGameMode("local");
          setLocalPlayMode("vsBot");
          setScreen("game");
        }}
        onTwoPlayers={() => {
          clearLastRoom();
          setGameMode("local");
          setLocalPlayMode("twoPlayers");
          setScreen("game");
        }}
      />
    );
  }

  const resizeTarget = boardContainer ?? undefined;

  const hasSize = boardSize.width > 0 && boardSize.height > 0;
  const boardNode = (
    <div ref={setBoardAreaRef} style={boardWrapperStyle}>
      {resizeTarget && hasSize && (
        <Application
          background={theme.colors.background}
          resizeTo={resizeTarget}
        >
          <GameLayout width={boardSize.width} height={boardSize.height}>
            <BackgammonBoard session={session} />
          </GameLayout>
        </Application>
      )}
    </div>
  );

  const handleNextGame = () => {
    nextGame();
    session.onNextGame?.();
  };
  const handleNewMatch = () => {
    newGame();
    session.onNewMatch?.();
  };

  const gameEndOverlay =
    gamePhase === "gameOver" && gameOverResult ? (
      <GameEndScreen
        winner={gameOverResult.winner}
        oynOrMars={gameOverResult.oynOrMars}
        matchScore={matchScore}
        matchTarget={matchTarget}
        onNextGame={handleNextGame}
        onNewMatch={handleNewMatch}
        onBackToMenu={handleBackToMenu}
      />
    ) : null;

  return (
    <GameScreenLayout
      header="Nardi"
      board={boardNode}
      sidebar={
        <GameSidebar
          session={session}
          onBackToMenu={handleBackToMenu}
          isNarrow={isNarrow}
        />
      }
      overlay={gameEndOverlay}
    />
  );
}
