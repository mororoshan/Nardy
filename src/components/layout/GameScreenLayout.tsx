import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { theme } from "../../theme";

export interface GameScreenLayoutProps {
  header?: ReactNode;
  board: ReactNode;
  sidebar: ReactNode;
  footer?: ReactNode;
}

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  backgroundColor: theme.colors.background,
};

const headerStyle: CSSProperties = {
  flexShrink: 0,
  padding: theme.spacing.md,
  borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
  backgroundColor: theme.colors.surface,
  fontSize: theme.fontSize.lg,
  fontWeight: 600,
  color: theme.colors.text,
};

const mainRowStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  minHeight: 0,
};

const mainRowStyleNarrow: CSSProperties = {
  ...mainRowStyle,
  flexDirection: "column",
};

const boardSlotStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const footerStyle: CSSProperties = {
  flexShrink: 0,
  padding: theme.spacing.xs,
  borderTop: `1px solid ${theme.colors.sidebarBorder}`,
  backgroundColor: theme.colors.surface,
  fontSize: theme.fontSize.xs,
  color: theme.colors.textMuted,
};

/**
 * Layout shell for the game screen: header, main row (board | sidebar), footer.
 * Board slot is a flex child; sidebar has fixed width from its content.
 */
export function GameScreenLayout({
  header,
  board,
  sidebar,
  footer,
}: GameScreenLayoutProps) {
  const { isNarrow } = useBreakpoint();
  return (
    <div style={rootStyle}>
      <header style={headerStyle}>{header ?? "Nardi"}</header>
      <div style={isNarrow ? mainRowStyleNarrow : mainRowStyle}>
        <div style={boardSlotStyle}>{board}</div>
        {sidebar}
      </div>
      {footer != null && <footer style={footerStyle}>{footer}</footer>}
    </div>
  );
}
