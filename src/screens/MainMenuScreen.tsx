import { useState } from "react";
import { createPortal } from "react-dom";
import type { NavigateFunction } from "react-router-dom";
import { MainMenu } from "../components/MainMenu";
import { SignInModal } from "../components/SignInModal";
import { useAuth } from "../contexts/AuthContext";
import type { UseWebRtcSyncResult } from "../hooks/useWebRtcSync";
import { clearLastRoom } from "../sync/lastRoomStorage";

export interface MainMenuScreenProps {
  sync: UseWebRtcSyncResult;
  navigate: NavigateFunction;
  setRankedSearchStarted: (started: boolean) => void;
  isNarrow: boolean;
}

type PendingAuthAction = "ranked" | "leaderboard" | null;

export function MainMenuScreen({
  sync,
  navigate,
  setRankedSearchStarted,
  isNarrow,
}: MainMenuScreenProps) {
  const { session, signOut } = useAuth();
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] =
    useState<PendingAuthAction>(null);
  const [forceExpandLeaderboard, setForceExpandLeaderboard] = useState(false);

  const goToGameWithSearch = () => {
    navigate({ pathname: "/game", search: window.location.search });
  };

  const handlePlayRanked = async () => {
    if (!session) {
      setPendingAuthAction("ranked");
      setSignInModalOpen(true);
      return;
    }
    setRankedSearchStarted(true);
    await sync.joinRankedQueue();
  };

  const handleOpenLeaderboard = () => {
    if (!session) {
      setPendingAuthAction("leaderboard");
      setSignInModalOpen(true);
      return;
    }
    sync.fetchLeaderboard();
  };

  const handleSignInSuccess = () => {
    setSignInModalOpen(false);
    if (pendingAuthAction === "ranked") {
      setPendingAuthAction(null);
      setRankedSearchStarted(true);
      sync.joinRankedQueue();
    } else if (pendingAuthAction === "leaderboard") {
      setPendingAuthAction(null);
      sync.fetchLeaderboard();
      setForceExpandLeaderboard(true);
    }
  };

  const app = document.getElementById("app");
  const menu = (
    <>
      <MainMenu
        touchFriendly={isNarrow}
        queueStatus={sync.queueStatus}
        rankedError={sync.lastSignalingError}
        playerRating={sync.playerRating}
        onOpenLeaderboard={handleOpenLeaderboard}
        leaderboardEntries={sync.leaderboardEntries}
        leaderboardError={sync.leaderboardError}
        leaderboardLoading={sync.leaderboardLoading}
        forceExpandLeaderboard={forceExpandLeaderboard}
        onLeaderboardExpanded={() => setForceExpandLeaderboard(false)}
        isSignedIn={!!session}
        onSignOut={signOut}
        onCreateGame={async () => {
          await sync.createGame();
          goToGameWithSearch();
        }}
        onJoinGame={async (roomId) => {
          await sync.joinGame(roomId);
          goToGameWithSearch();
        }}
        onPlayRanked={handlePlayRanked}
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
      {signInModalOpen && (
        <SignInModal
          onSuccess={handleSignInSuccess}
          onClose={() => {
            setSignInModalOpen(false);
            setPendingAuthAction(null);
          }}
        />
      )}
    </>
  );
  if (app) {
    return createPortal(menu, app);
  }
  return menu;
}
