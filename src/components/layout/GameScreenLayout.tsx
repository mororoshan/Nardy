import type { ReactNode } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";

export interface GameScreenLayoutProps {
  header?: ReactNode;
  board: ReactNode;
  sidebar: ReactNode;
  footer?: ReactNode;
  /** Optional overlay (e.g. game-end screen) rendered on top of main content. */
  overlay?: ReactNode;
}

/**
 * Layout shell for the game screen: header, main row (board | sidebar), footer.
 * Board slot is a flex child; sidebar has fixed width from its content.
 */
export function GameScreenLayout({
  header,
  board,
  sidebar,
  footer,
  overlay,
}: GameScreenLayoutProps) {
  const { isNarrow } = useBreakpoint();
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="shrink-0 p-md border-b border-sidebar-border bg-surface text-lg font-semibold text-text">
        {header ?? "Nardi"}
      </header>
      <div
        className={
          isNarrow ? "flex flex-1 min-h-0 flex-col" : "flex flex-1 min-h-0"
        }
      >
        <div className="relative flex flex-1 min-h-0 min-w-0 items-center justify-center px-md py-md">
          {board}
        </div>
        {sidebar}
      </div>
      {footer != null && (
        <footer className="shrink-0 p-xs border-t border-sidebar-border bg-surface text-xs text-text-muted">
          {footer}
        </footer>
      )}
      {overlay != null && (
        <div className="absolute inset-0 pointer-events-auto z-10 flex items-center justify-center">
          {overlay}
        </div>
      )}
    </div>
  );
}
