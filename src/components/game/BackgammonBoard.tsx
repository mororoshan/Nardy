import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
import type { NardiState } from "../../game/nardiState";
import { buildMovePayload } from "../../sync/webrtcSyncTypes";
import type { NardiGameSession } from "../../session/gameSessionTypes";
import { useNardiGameStore, type LastMove } from "../../stores/nardiGameStore";
import { theme } from "../../theme";

const PIECE_RADIUS = Math.min(pointW, pointH) * 0.35;
const HIGHLIGHT_RADIUS = Math.min(pointW, pointH) * 0.42;

/** Interactive board area: hit testing and pointer events. */
function BoardHitArea({
  hitArea,
  onPointerDown,
  children,
}: {
  hitArea: Rectangle;
  onPointerDown: (e: {
    global: { x: number; y: number };
    target: {
      toLocal: (p: { x: number; y: number }) => { x: number; y: number };
    };
  }) => void;
  children: ReactNode;
}) {
  return (
    <pixiContainer
      eventMode="static"
      hitArea={hitArea}
      onPointerDown={onPointerDown}
    >
      {children}
    </pixiContainer>
  );
}

/** Board background, bar, and point circles (no pieces). */
function BoardSurface() {
  return (
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
  );
}

/** Point number labels 1–24. */
function PointLabels() {
  return (
    <>
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
    </>
  );
}

/** White and black pieces from game state. Optional lastMove + progress for animating one piece. */
function BoardPieces({
  state,
  lastMove,
  moveProgress,
}: {
  state: NardiState;
  lastMove: LastMove | null;
  moveProgress: number;
}) {
  const animating = lastMove && lastMove.to !== 0 && moveProgress < 1;

  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear();
        for (let i = 1; i <= 24; i++) {
          let whiteCount = state.whitePoints[i] ?? 0;
          let blackCount = state.blackPoints[i] ?? 0;
          if (animating && lastMove && i === lastMove.to) {
            if (lastMove.player === "white") whiteCount--;
            else blackCount--;
          }
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
        if (animating && lastMove) {
          const start = pointIndexToPixelCenter(lastMove.from);
          const end = pointIndexToPixelCenter(lastMove.to);
          const x = start.x + (end.x - start.x) * moveProgress;
          const y = start.y + (end.y - start.y) * moveProgress;
          const isWhite = lastMove.player === "white";
          g.circle(x, y, PIECE_RADIUS)
            .fill({ color: isWhite ? 0xf5f5dc : 0x2d2d2d })
            .stroke({
              width: 1,
              color: isWhite ? 0x8b7355 : 0x1a1a1a,
            });
        }
      }}
    />
  );
}

/** Movable-point, selected-point, legal-destination, last-move, and hint highlights. */
function BoardHighlights({
  movablePoints,
  selectedPoint,
  legalDests,
  canSelectOrMove,
  lastMove,
  hintMove,
}: {
  movablePoints: number[];
  selectedPoint: number | null;
  legalDests: number[];
  canSelectOrMove: boolean;
  lastMove: LastMove | null;
  hintMove: { from: number; to: number } | null;
}) {
  return (
    <pixiGraphics
      draw={(g: Graphics) => {
        g.clear();
        if (hintMove) {
          const fromPos = pointIndexToPixelCenter(hintMove.from);
          g.circle(fromPos.x, fromPos.y, HIGHLIGHT_RADIUS)
            .fill({ color: 0x22d3ee, alpha: 0.4 })
            .stroke({ width: 2, color: 0x06b6d4 });
          if (hintMove.to !== 0) {
            const toPos = pointIndexToPixelCenter(hintMove.to);
            g.circle(toPos.x, toPos.y, HIGHLIGHT_RADIUS)
              .fill({ color: 0x22d3ee, alpha: 0.4 })
              .stroke({ width: 2, color: 0x06b6d4 });
          }
        }
        if (lastMove) {
          const fromPos = pointIndexToPixelCenter(lastMove.from);
          g.circle(fromPos.x, fromPos.y, HIGHLIGHT_RADIUS)
            .fill({ color: 0x818cf8, alpha: 0.35 })
            .stroke({ width: 2, color: 0x6366f1 });
          if (lastMove.to !== 0) {
            const toPos = pointIndexToPixelCenter(lastMove.to);
            g.circle(toPos.x, toPos.y, HIGHLIGHT_RADIUS)
              .fill({ color: 0x818cf8, alpha: 0.35 })
              .stroke({ width: 2, color: 0x6366f1 });
          }
        }
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
  );
}

export interface BackgammonBoardProps {
  session: NardiGameSession;
}

const LAST_MOVE_HIGHLIGHT_MS = 2000;

export function BackgammonBoard({ session }: BackgammonBoardProps) {
  const { state, selectedPoint, selectPoint, moveTo } = useNardiGame();
  const lastMove = useNardiGameStore((s) => s.lastMove);
  const hintMove = useNardiGameStore((s) => s.hintMove);
  const clearLastMove = useNardiGameStore((s) => s.clearLastMove);
  const [moveProgress, setMoveProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const clearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastMove) {
      setMoveProgress(0);
      return;
    }
    const durationMs = theme.moveAnimationMs;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      setMoveProgress(progress);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    clearRef.current = setTimeout(() => {
      clearLastMove();
    }, LAST_MOVE_HIGHLIGHT_MS);
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
      if (clearRef.current != null) clearTimeout(clearRef.current);
    };
  }, [lastMove, clearLastMove]);

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
    <BoardHitArea
      hitArea={new Rectangle(0, 0, BOARD_WIDTH, BOARD_HEIGHT)}
      onPointerDown={handlePointerDown}
    >
      <BoardSurface />
      <PointLabels />
      <BoardPieces
        state={state}
        lastMove={lastMove}
        moveProgress={moveProgress}
      />
      <BoardHighlights
        movablePoints={movablePoints}
        selectedPoint={selectedPoint}
        legalDests={legalDests}
        canSelectOrMove={canSelectOrMove}
        lastMove={lastMove}
        hintMove={hintMove}
      />
    </BoardHitArea>
  );
}
