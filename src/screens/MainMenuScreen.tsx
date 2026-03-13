import { createPortal } from "react-dom";
import type { NavigateFunction } from "react-router-dom";
import { MainMenu } from "../components/MainMenu";
import type { UseWebRtcSyncResult } from "../hooks/useWebRtcSync";
import { clearLastRoom } from "../sync/lastRoomStorage";

export interface MainMenuScreenProps {
  sync: UseWebRtcSyncResult;
  navigate: NavigateFunction;
  setRankedSearchStarted: (started: boolean) => void;
  isNarrow: boolean;
}

export function MainMenuScreen({
  sync,
  navigate,
  setRankedSearchStarted,
  isNarrow,
}: MainMenuScreenProps) {
  const goToGameWithSearch = () => {
    navigate({ pathname: "/game", search: window.location.search });
  };

  const app = document.getElementById("app");
  const menu = (
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
        goToGameWithSearch();
      }}
      onJoinGame={async (roomId) => {
        await sync.joinGame(roomId);
        goToGameWithSearch();
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
        goToGameWithSearch();
      }}
      onSinglePlayer={() => {
        clearLastRoom();
        navigate("/game", { state: { localPlayMode: "vsBot" } });
      }}
      onTwoPlayers={() => {
        clearLastRoom();
        navigate("/game", { state: { localPlayMode: "twoPlayers" } });
      }}
    />
  );
  if (app) {
    return createPortal(menu, app);
  }
  return menu;
}
