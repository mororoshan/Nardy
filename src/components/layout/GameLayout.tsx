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
  const width =
    widthProp != null && widthProp > 0 ? widthProp : windowSize.width;
  const height =
    heightProp != null && heightProp > 0 ? heightProp : windowSize.height;
  const x = Math.max(0, (width - BOARD_WIDTH) / 2);
  const y = Math.max(0, (height - BOARD_HEIGHT) / 2);

  return (
    <pixiContainer x={x} y={y}>
      {children}
    </pixiContainer>
  );
}
