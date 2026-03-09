/**
 * Single source of truth for Nardi board layout and point-to-pixel mapping.
 * Layout (left to right in each quadrant):
 *   Top left:  24 23 22 21 20 19  |  Top right:  18 17 16 15 14 13
 *   Bottom left: 1 2 3 4 5 6  |  Bottom right: 7 8 9 10 11 12
 * Origin top-left; Y increases downward.
 */

export const BOARD_WIDTH = 700;
export const BOARD_HEIGHT = 500;
/** Aspect ratio width/height for CSS aspect-ratio. */
export const BOARD_ASPECT_RATIO = BOARD_WIDTH / BOARD_HEIGHT;
export const BAR_WIDTH = 24;

const halfW = (BOARD_WIDTH - BAR_WIDTH) / 2;
const halfH = BOARD_HEIGHT / 2;
export const pointW = halfW / 6;
export const pointH = halfH / 6;

/** Hit radius for point detection. */
const HIT_RADIUS = Math.min(pointW, pointH) * 0.55;

export interface PointCenter {
  x: number;
  y: number;
}

/**
 * Point index 1–24 to board-local pixel center.
 * Top left 24→19, top right 18→13, bottom left 1→6, bottom right 7→12 (left to right).
 */
export function pointIndexToPixelCenter(pointIndex: number): PointCenter {
  if (pointIndex < 1 || pointIndex > 24) {
    return { x: 0, y: 0 };
  }
  const i = pointIndex;
  let x: number;
  let y: number;

  if (i <= 6) {
    x = halfW - (6.5 - i) * pointW;
    y = halfH + halfH / 2;
  } else if (i <= 12) {
    x = halfW + BAR_WIDTH + (i - 6.5) * pointW;
    y = halfH + halfH / 2;
  } else if (i <= 18) {
    x = halfW + BAR_WIDTH + (18.5 - i) * pointW;
    y = halfH / 2;
  } else {
    x = halfW - (i - 18.5) * pointW;
    y = halfH / 2;
  }

  return { x, y };
}

const pointCenters: PointCenter[] = [];
for (let p = 1; p <= 24; p++) {
  pointCenters.push(pointIndexToPixelCenter(p));
}

/**
 * Board-local (x, y) to point index 1–24 or null if no point hit.
 */
export function getPointAtPixel(x: number, y: number): number | null {
  let bestPoint: number | null = null;
  let bestDist = HIT_RADIUS;

  for (let i = 0; i < 24; i++) {
    const c = pointCenters[i];
    const dx = x - c.x;
    const dy = y - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = i + 1;
    }
  }
  return bestPoint;
}
