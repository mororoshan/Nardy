# ADR: React UI structure and refactor plan

## Context

The Nardi React UI lives in a flat `src/components/` with six main components (GameLayout, BackgammonBoard, GameSidebar, GameStatus, DiceDisplay, MainMenu) and an empty MultiplayerLobby. Requirements:

- **Shorter, more maintainable components** (target 200–400 lines; several files approach or exceed this).
- **Clear structure** that fits the app size: one game, a few screens (menu, lobby, game with board + sidebar).
- **Consistent styling**: `src/theme.ts` exists and is used in MainMenu and GameStatus; GameSidebar and DiceDisplay use hardcoded colors (`rgba(26,26,46)`, `#a1a1aa`, etc.), and App uses inline `#1a1a2e`.
- **Separation of concerns**: components currently mix layout, styling, game logic (useNardiGame, getLegalMoves, etc.), formatting (e.g. `formatMove` in GameSidebar), and WebRTC/session callbacks. Game logic and geometry are correctly centralized in `src/game/` and `boardGeometry.ts`; the issue is UI composition and reuse.

## Decision

**Adopt a hybrid structure: a shared UI layer (atomic-style) plus feature/screen-oriented folders.** Do not introduce full FSD (no entities/processes layers) or a strict atomic hierarchy (atoms/molecules/organisms as top-level folders) because the app is small and a single game; the goal is clarity and reuse without ceremony.

- **Shared UI (`ui/`)**: Reusable, presentational building blocks—atoms and small molecules. No game or session logic; they receive props and callbacks only.
- **Game feature (`game/`)**: All game-screen UI: board, dice, status, move history, sidebar. These may use hooks and game/session types but do not define game rules (rules stay in `src/game/`).
- **Layout**: Shared layout primitives (e.g. centering board, screen chrome) in a dedicated folder so App and screens stay thin.
- **Screens / top level**: Menu, game screen composition, and (later) lobby live at a clear entry point so App stays a thin router.

This keeps the codebase navigable, enforces “game logic only in `src/game/`”, and leaves room for MultiplayerLobby and future screens without over-structuring.

---

## Folder and file layout

```
src/
  components/
    ui/                      # Shared presentational building blocks
      Button.tsx
      TabBar.tsx             # Tabs + panel content (reusable)
      Card.tsx               # Optional: bordered/surface container
      index.ts               # Re-export public UI components
    layout/
      GameLayout.tsx         # Pixi board centering (existing)
      ScreenLayout.tsx       # Optional: full-screen flex wrapper
    game/                    # Game-screen feature
      BackgammonBoard.tsx
      DiceDisplay.tsx
      GameStatus.tsx
      MoveHistoryList.tsx    # Extracted from GameSidebar (moves tab content)
      GameSidebar.tsx        # Composes: header, TabBar, MoveHistoryList, DiceDisplay, GameStatus
    MainMenu.tsx             # Menu screen (stays at root or under screens/ if added)
    MultiplayerLobby.tsx
  theme.ts                   # Single source for colors, spacing, typography
  ...
```

**Rationale:**

- **`ui/`**: Buttons, tab bars, and cards are repeated (MainMenu buttons, GameSidebar tabs and buttons, GameStatus buttons). Extracting them gives one place for styling and behavior and enforces theme usage.
- **`layout/`**: GameLayout is already a layout concern; separating it from “game widgets” avoids mixing board centering with game logic.
- **`game/`**: All board + sidebar + dice + status + history live together as the “game” feature; GameSidebar becomes a thin composer that uses TabBar, MoveHistoryList, DiceDisplay, GameStatus.
- **Root (or `screens/`)**: MainMenu and MultiplayerLobby are screen-level; keeping them at component root (or under a single `screens/` folder if more screens appear) keeps App simple.

**What stays outside components:**

- Game logic and rules: `src/game/` (nardiState, direction, boardGeometry).
- Session and WebRTC: `src/session/`, `src/sync/`, `src/hooks/useWebRtcSync.ts`, etc.
- Context and store: `src/contexts/`, `src/stores/`.

---

## Refactor phases

### Phase 1: Foundation (shared UI and theme)

1. **Theme as single source of truth**
   - Audit all component styles and map every color/spacing/font to `theme.ts` (e.g. sidebar background → `theme.colors.surface` or a new token like `theme.colors.sidebar`).
   - Replace hardcoded values in GameSidebar, DiceDisplay, and App with theme references.

2. **Extract shared UI components**
   - **Button**: Used in MainMenu, GameSidebar (back, copy), GameStatus (new game, bear off, pass). Props: variant (primary/secondary/ghost?), size, onClick, children; styles from theme.
   - **TabBar**: Used in GameSidebar (Moves / Controls). Props: tabs `{ id, label }[]`, activeId, onSelect, children for active panel.
   - Optionally **Card** (or a simple **Panel**) for sidebar sections if it reduces duplication.

3. **Optional: co-located style modules**
   - For components that accumulate many style objects, add a `ComponentName.styles.ts` (or `styles.ts` next to the component) that exports theme-based style objects. Start with GameSidebar and DiceDisplay; keep styles in file for small components.

Deliverable: All new UI primitives use only `theme`; no hardcoded colors in shared UI. MainMenu, GameStatus, and (after migration) GameSidebar/DiceDisplay/App reference theme only.

### Phase 2: Split GameSidebar and consolidate game UI

1. **Extract MoveHistoryList**
   - Move the “Moves” tab content from GameSidebar into `game/MoveHistoryList.tsx`.
   - Move `formatMove` and any move-formatting helpers into a small util (e.g. `src/game/formatMove.ts` or next to the list) so the list is presentational: it receives `entries: GameHistoryEntry[]` (or equivalent) and renders; no direct store dependency in the list if possible, or a single hook that maps store → entries.
   - Style via theme; reuse Button if “Copy” or similar appears in the list later.

2. **Refactor GameSidebar**
   - Compose: header (back button, connection status, room id + copy) + TabBar (Moves | Controls) + panel content (MoveHistoryList | Controls panel with DiceDisplay + GameStatus).
   - Use shared Button and TabBar; keep session/connection props at GameSidebar level and pass only what each child needs.
   - Move sidebar-specific layout styles to a small set of theme-based objects (or Sidebar.styles.ts). Target: GameSidebar under ~120 lines.

3. **Migrate DiceDisplay and GameStatus to theme**
   - Replace any remaining hardcoded colors in DiceDisplay and GameStatus with theme tokens; ensure they use shared Button where it fits (e.g. “Roll”, “Bear off”, “No moves — pass”, “New game”).

Deliverable: GameSidebar is a thin composer; MoveHistoryList is a focused component; all game UI uses theme and shared UI where applicable.

### Phase 3: Layout and screen clarity

1. **Layout folder**
   - Move GameLayout into `components/layout/GameLayout.tsx` and update imports (e.g. in App and any tests).
   - If useful, add a minimal ScreenLayout (e.g. full-viewport flex container) and use it in App for the game screen so App does not define layout styles.

2. **Game feature folder**
   - Move BackgammonBoard, DiceDisplay, GameStatus, MoveHistoryList, GameSidebar into `components/game/` and update all imports (App, tests, etc.).
   - Add `components/game/index.ts` to re-export public game components if desired.

3. **App and screens**
   - Keep App as a thin router: screen state + session/sync wiring; composition of MainMenu vs. game screen (board + GameSidebar). Optionally extract “GameScreen” as a component that takes session and render props or context, so App only chooses between MainMenu and GameScreen.

Deliverable: Clear `layout/` and `game/` boundaries; App has minimal layout/style logic; paths and imports are consistent.

### Phase 4: Optional polish

- **MainMenu**: If it grows (e.g. lobby entry, settings), split into smaller presentational pieces (Title, MenuCard, RoomInput) using `ui/` and theme.
- **MultiplayerLobby**: When implemented, follow the same pattern: layout + `ui/` + theme; session/callbacks at container level.
- **BackgammonBoard**: Already at 184 lines; if it grows, consider extracting “Point” or “BoardPoint” as a sub-component and a small “BoardOverlay” for highlights, but avoid moving game rules out of `src/game/`.

---

## Style strategy

- **Single source of truth**: All colors, spacing, border radius, and font sizes come from `src/theme.ts`. No hardcoded hex/rgba or magic numbers in component files for visual tokens.
- **Where to put style definitions**:
  - **Small components (e.g. Button, TabBar)**: Co-located `const styles = { ... }` or inline in the same file, using theme only.
  - **Larger components (GameSidebar, DiceDisplay, MainMenu)**: Prefer a co-located `ComponentName.styles.ts` (or `styles.ts` in the component folder) that exports theme-based style objects. This keeps the component file focused on structure and behavior and makes it easy to audit theme usage.
- **Theme extensions**: If game UI needs tokens not in theme (e.g. sidebar background, “board surface”), add them to `theme.ts` (e.g. `theme.colors.sidebar`, `theme.colors.board`) rather than introducing a second source of truth.
- **CSSProperties**: Continue using React `CSSProperties` objects (no CSS-in-JS or global CSS required); the main change is that every value is derived from `theme` or from layout constants (e.g. SIDEBAR_WIDTH) defined in one place.

---

## Summary

| Aspect            | Decision                                                                 |
|------------------|--------------------------------------------------------------------------|
| Structure        | Hybrid: shared `ui/` (atoms/molecules) + `layout/` + `game/` + screen-level components. No full FSD. |
| Theme            | Single source of truth; all components use theme; extend theme when new tokens are needed. |
| Refactor order   | (1) Theme audit + shared Button/TabBar, (2) MoveHistoryList + GameSidebar split + theme in game UI, (3) Folders + imports + optional GameScreen, (4) Optional MainMenu/Lobby/Board splits. |
| Game logic       | Remain in `src/game/` and hooks; UI only consumes state and callbacks.   |
| Style location   | Theme in `theme.ts`; per-component style objects in file or in `ComponentName.styles.ts` for larger components. |
