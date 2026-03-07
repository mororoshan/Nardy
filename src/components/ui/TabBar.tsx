import type { CSSProperties, ReactNode } from "react";
import { theme } from "../../theme";

export interface TabBarTab {
  id: string;
  label: string;
}

export interface TabBarProps {
  tabs: TabBarTab[];
  activeId: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}

const tabBarStyle: CSSProperties = {
  display: "flex",
  borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
};

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "10px 12px",
    fontSize: theme.fontSize.sm,
    fontWeight: active ? 600 : 400,
    color: active ? theme.colors.text : theme.colors.textMuted,
    backgroundColor: active ? theme.colors.tabActiveBg : "transparent",
    border: "none",
    cursor: "pointer",
  };
}

const wrapperStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const tabContentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: theme.spacing.md,
};

export function TabBar({ tabs, activeId, onSelect, children }: TabBarProps) {
  return (
    <div style={wrapperStyle}>
      <div style={tabBarStyle} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeId === tab.id}
            style={tabStyle(activeId === tab.id)}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={tabContentStyle} role="tabpanel">
        {children}
      </div>
    </div>
  );
}
