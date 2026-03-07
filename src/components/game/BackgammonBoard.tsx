import { Rectangle } from "pixi.js";
import type { Graphics } from "pixi.js";
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BAR_WIDTH,
  pointIndexToPixelCenter,
  getPointAtPixel,
  pointW,
  pointH,
} from "../../game/boardGeometry";
import { useNardiGame } from "../../hooks/useNardiGame";
import {
  getPointsWithMovableChips,
  getLegalDestinationsFromPoint,
  getLegalMoves,
} from "../../game/nardiState";
import { buildMovePayload } from "../../sync/webrtcSyncTypes";
import type { NardiGameSession } from "../../session/gameSessionTypes";

const PIECE_RADIUS = Math.min(pointW, pointH) * 0.35;
const HIGHLIGHT_RADIUS = Math.min(pointW, pointH) * 0.42;

export interface BackgammonBoardProps {
  session: NardiGameSession;
}

export function BackgammonBoard({ session }: BackgammonBoardProps) {
  const { state, selectedPoint, selectPoint, moveTo } = useNardiGame();
  const movablePoints = getPointsWithMovableChips(state);
  const legalDests =
    selectedPoint !== null
      ? getLegalDestinationsFromPoint(state, selectedPoint)
      : [];
  const isMyTurn =
    session.mode === "local" ||
    session.localPlayer === null ||
    state.turn === session.localPlayer;
  const canSelectOrMove =
    state.phase === "playing" && state.dice !== null && isMyTurn;

  const handlePointerDown = (e: {
    global: { x: number; y: number };
    target: {
      toLocal: (p: { x: number; y: number }) => { x: number; y: number };
    };
  }) => {
    if (!canSelectOrMove) return;
    const local = e.target.toLocal(e.global);
    const pointIndex = getPointAtPixel(local.x, local.y);
    if (pointIndex === null) {
      selectPoint(null);
      return;
    }
    if (selectedPoint !== null) {
      if (legalDests.includes(pointIndex)) {
        const moves = getLegalMoves(state);
        const move = moves.find(
          (m) =>
            m.from === selectedPoint &&
            (m.to === pointIndex || (m.to === 0 && pointIndex === 0)),
        );
        if (move) {
          const payload = buildMovePayload(
            state,
            move.from,
            move.to,
            move.usedDiceIndices,
          );
          moveTo(pointIndex);
          session.onAfterMove(payload);
        } else {
          moveTo(pointIndex);
        }
      } else if (movablePoints.includes(pointIndex)) {
        selectPoint(pointIndex);
      } else {
        selectPoint(null);
      }
    } else {
      if (movablePoints.includes(pointIndex)) {
        selectPoint(pointIndex);
      }
    }
  };

  return (
    <pixiContainer
      eventMode="static"
      hitArea={new Rectangle(0, 0, BOARD_WIDTH, BOARD_HEIGHT)}
      onPointerDown={handlePointerDown}
    >
      <pixiGraphics
        draw={(g: Graphics) => {
          g.clear();
          g.rect(0, 0, BOARD_WIDTH, BOARD_HEIGHT).fill({
            color: 0xc4a35a,
            alpha: 1,
          });
          const halfW = (BOARD_WIDTH - BAR_WIDTH) / 2;
          g.rect(halfW, 0, BAR_WIDTH, BOARD_HEIGHT).fill({
            color: 0x5c4033,
            alpha: 1,
          });
          for (let i = 1; i <= 24; i++) {
            const { x, y } = pointIndexToPixelCenter(i);
            g.circle(x, y, HIGHLIGHT_RADIUS).fill({
              color: 0x8b7355,
              alpha: 0.4,
            });
          }
        }}
      />
      {Array.from({ length: 24 }, (_, i) => {
        const pointIndex = i + 1;
        const { x, y } = pointIndexToPixelCenter(pointIndex);
        return (
          <pixiText
            key={pointIndex}
            x={x}
            y={y}
            text={String(pointIndex)}
            anchor={0.5}
            style={{ fontSize: 14, fill: 0x2d2d2d, fontWeight: "bold" }}
          />
        );
      })}
      <pixiGraphics
        draw={(g: Graphics) => {
          g.clear();
          for (let i = 1; i <= 24; i++) {
            const whiteCount = state.whitePoints[i] ?? 0;
            const blackCount = state.blackPoints[i] ?? 0;
            const { x, y } = pointIndexToPixelCenter(i);
            const stack = whiteCount + blackCount;
            const maxStack = Math.max(stack, 1);
            const stepY = (PIECE_RADIUS * 2 * 0.7) / maxStack;
            let idx = 0;
            for (let w = 0; w < whiteCount; w++) {
              const oy = y + (idx - (stack - 1) / 2) * stepY;
              g.circle(x, oy, PIECE_RADIUS)
                .fill({ color: 0xf5f5dc })
                .stroke({ width: 1, color: 0x8b7355 });
              idx++;
            }
            for (let b = 0; b < blackCount; b++) {
              const oy = y + (idx - (stack - 1) / 2) * stepY;
              g.circle(x, oy, PIECE_RADIUS)
                .fill({ color: 0x2d2d2d })
                .stroke({ width: 1, color: 0x1a1a1a });
              idx++;
            }
          }
        }}
      />
      <pixiGraphics
        draw={(g: Graphics) => {
          g.clear();
          if (canSelectOrMove) {
            for (const p of movablePoints) {
              const { x, y } = pointIndexToPixelCenter(p);
              g.circle(x, y, HIGHLIGHT_RADIUS)
                .fill({ color: 0xeab308, alpha: 0.25 })
                .stroke({ width: 2, color: 0xca8a04 });
            }
          }
          if (selectedPoint !== null) {
            const { x, y } = pointIndexToPixelCenter(selectedPoint);
            g.circle(x, y, HIGHLIGHT_RADIUS)
              .fill({ color: 0x4ade80, alpha: 0.5 })
              .stroke({ width: 2, color: 0x22c55e });
          }
          for (const p of legalDests) {
            if (p <= 0) continue;
            const { x, y } = pointIndexToPixelCenter(p);
            g.circle(x, y, HIGHLIGHT_RADIUS)
              .fill({ color: 0x22c55e, alpha: 0.35 })
              .stroke({ width: 1, color: 0x16a34a });
          }
        }}
      />
    </pixiContainer>
  );
}
