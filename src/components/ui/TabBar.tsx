import type { ReactNode } from "react";

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

export function TabBar({ tabs, activeId, onSelect, children }: TabBarProps) {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex border-b border-sidebar-border" role="tablist">
        {tabs.map((tab) => {
          const active = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`flex-1 py-2.5 px-3 text-sm border-0 cursor-pointer ${
                active
                  ? "font-semibold text-text bg-tab-active"
                  : "font-normal text-text-muted bg-transparent"
              }`}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-auto p-md" role="tabpanel">
        {children}
      </div>
    </div>
  );
}
