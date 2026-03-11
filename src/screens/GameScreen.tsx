import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, type NavigateFunction } from "react-router-dom";
import { Application } from "@pixi/react";
import { GameLayout } from "../components/layout/GameLayout";
import { GameScreenLayout } from "../components/layout/GameScreenLayout";
import { BOARD_ASPECT_RATIO } from "../game/boardGeometry";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useOpponentAi } from "../hooks/useOpponentAi";
import type { UseWebRtcSyncResult } from "../hooks/useWebRtcSync";
import { useGameSession } from "../session/useGameSession";
import type { LocalPlayMode } from "../session/gameSessionTypes";
import { theme } from "../theme";
import {
  BackgammonBoard,
  GameEndScreen,
  GameSidebar,
} from "../components/game";
import { useChatStore } from "../stores/chatStore";
import { useNardiGameStore } from "../stores/nardiGameStore";

export interface GameScreenProps {
  sync: UseWebRtcSyncResult;
  navigate: NavigateFunction;
}

interface GameLocationState {
  localPlayMode?: LocalPlayMode;
}

const boardWrapperStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  aspectRatio: BOARD_ASPECT_RATIO,
  position: "relative",
  backgroundColor: theme.colors.background,
  overflow: "hidden",
  maxWidth: "100%",
  maxHeight: "100%",
  margin: "auto",
};

export function GameScreen({ sync, navigate }: GameScreenProps) {
  const location = useLocation();
  const state = location.state as GameLocationState | null;
  const localPlayMode: LocalPlayMode = state?.localPlayMode ?? "vsBot";
  const gameMode = sync.roomId ? "multiplayer" : "local";

  const session = useGameSession(gameMode, sync, localPlayMode);
  const { isNarrow } = useBreakpoint();
  useOpponentAi(session, true);

  const [boardContainer, setBoardContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on values used only
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
    navigate("/");
  };

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
