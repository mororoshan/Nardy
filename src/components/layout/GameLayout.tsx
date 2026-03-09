import type { ReactNode } from "react";
import { useResize } from "../../hooks/useResize";
import { BOARD_WIDTH, BOARD_HEIGHT } from "../../game/boardGeometry";

export { BOARD_WIDTH, BOARD_HEIGHT } from "../../game/boardGeometry";

export interface GameLayoutProps {
  children: ReactNode;
  /** When provided, board is centered within these dimensions instead of the window. */
  width?: number;
  height?: number;
}

export function GameLayout({
  children,
  width: widthProp,
  height: heightProp,
}: GameLayoutProps) {
  const windowSize = useResize();
  const width = typeof widthProp === "number" ? widthProp : windowSize.width;
  const height =
    typeof heightProp === "number" ? heightProp : windowSize.height;

  const scale = Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT);
  const scaledW = BOARD_WIDTH * scale;
  const scaledH = BOARD_HEIGHT * scale;
  const x = (width - scaledW) / 2;
  const y = (height - scaledH) / 2;

  return (
    <pixiContainer x={x} y={y} scale={scale}>
      {children}
    </pixiContainer>
  );
}
