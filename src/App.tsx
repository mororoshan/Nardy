import { useEffect, useState } from "react";
import { extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { Route, Routes, useNavigate } from "react-router-dom";

import { useBreakpoint } from "./hooks/useBreakpoint";
import { useWebRtcSync } from "./hooks/useWebRtcSync";
import { GameScreen } from "./screens/GameScreen";
import { MainMenuScreen } from "./screens/MainMenuScreen";

extend({
  Container,
  Graphics,
  Sprite,
  Text,
});

export default function App() {
  const [rankedSearchStarted, setRankedSearchStarted] = useState(false);
  const sync = useWebRtcSync();
  const navigate = useNavigate();
  const { isNarrow } = useBreakpoint();

  useEffect(() => {
    if (
      !rankedSearchStarted ||
      !sync.roomId ||
      sync.connectionStatus !== "connected"
    )
      return;
    navigate("/game");
    setRankedSearchStarted(false);
  }, [rankedSearchStarted, sync.roomId, sync.connectionStatus, navigate]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainMenuScreen
            sync={sync}
            navigate={navigate}
            setRankedSearchStarted={setRankedSearchStarted}
            isNarrow={isNarrow}
          />
        }
      />
      <Route
        path="/game"
        element={<GameScreen sync={sync} navigate={navigate} />}
      />
    </Routes>
  );
}
