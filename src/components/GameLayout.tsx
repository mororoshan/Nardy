import type { ReactNode } from "react";
import { useResize } from "../hooks/useResize";
import { BOARD_WIDTH, BOARD_HEIGHT } from "../game/boardGeometry";

export { BOARD_WIDTH, BOARD_HEIGHT } from "../game/boardGeometry";

interface GameLayoutProps {
  children: ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  const { width, height } = useResize();
  const x = Math.max(0, (width - BOARD_WIDTH) / 2);
  const y = Math.max(0, (height - BOARD_HEIGHT) / 2);

  return (
    <pixiContainer x={x} y={y}>
      {children}
    </pixiContainer>
  );
}
