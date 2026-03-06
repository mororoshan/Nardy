/**
 * Minimal theme: colors and spacing for consistent UI.
 */

export const theme = {
  colors: {
    background: "#1a1a2e",
    surface: "#27272a",
    surfaceElevated: "#3f3f46",
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
} as const;
