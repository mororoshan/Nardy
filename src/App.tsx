import type { CSSProperties } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";
import { GameLayout } from "./components/GameLayout";
import { BackgammonBoard } from "./components/BackgammonBoard";
import { DiceDisplay } from "./components/DiceDisplay";
import { GameStatus } from "./components/GameStatus";

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

export default function App() {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <Application background="#1a1a2e" resizeTo={window}>
        <GameLayout>
          <BackgammonBoard />
        </GameLayout>
      </Application>
      <div style={overlayStyle}>
        <div style={overlayContentStyle}>
          <DiceDisplay />
          <GameStatus />
        </div>
      </div>
    </div>
  );
}
