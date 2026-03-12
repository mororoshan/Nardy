/**
 * Minimal theme: colors and spacing for consistent UI.
 */

export const theme = {
  colors: {
    background: "#1a1a2e",
    surface: "#27272a",
    surfaceElevated: "#3f3f46",
    sidebarBg: "#1a1a2e",
    sidebarBorder: "#3f3f46",
    tabActiveBg: "rgba(63, 63, 70, 0.5)",
    border: "#52525b",
    text: "#e4e4e7",
    textMuted: "#a1a1aa",
    accent: "#4f46e5",
    success: "#22c55e",
    warning: "#fbbf24",
    error: "#f87171",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  borderRadius: {
    sm: 4,
    md: 8,
  },
  fontSize: {
    xs: 12,
    sm: 13,
    md: 14,
    lg: 16,
  },
  /** Duration in ms for piece move animation. */
  moveAnimationMs: 280,
  /** Main menu overlay and buttons (backgammon-style). */
  menu: {
    backgroundOverlay: "rgba(30, 42, 58, 0.95)",
    gold: "#c9a227",
    goldMuted: "#e8d5a3",
    buttonBg: "#1e2a3a",
    rejoinHighlight: "#6b4bb3",
    inputBg: "#0f1419",
    woodBorder: "#4a3728",
  },
} as const;
