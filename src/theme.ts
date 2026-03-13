/**
 * JS-only theme values: Pixi background hex and animation duration.
 * UI design tokens live in src/index.css @theme (Tailwind).
 */

export const theme = {
  /** Hex background for Pixi Application (not used in DOM/CSS). */
  colors: {
    background: "#050816",
  },
  /** Duration in ms for piece move animation (Pixi tween). */
  moveAnimationMs: 280,
} as const;
