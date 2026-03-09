# UI layout: Header, main row (board | side tab menu), footer

**Date:** 2025-03-08  
**Status:** Implemented

---

## Clarifications (assumptions if you don’t specify)

1. **Side tab menu**  
   Keep the existing **GameSidebar** as the “side tab menu” (tabs: Moves, Controls; back button, connection/room, dice, game status). If you want different tabs (e.g. Settings, Chat, Game info), say so and we’ll adjust.

2. **Header / footer**  
   Plan uses **minimal placeholders**: header = app title (e.g. “Nardi”) + optional back-to-menu; footer = thin bar (e.g. copyright or empty). If you want specific content (e.g. score, timer, links), we’ll add it in a follow-up.

---

## Goals

- **DOM structure:** Header (top) → Main row (board | side tab menu) → Footer (bottom).
- **Board:** Resizable, **fixed aspect ratio** (current 700∶500 from `boardGeometry`), responsive on mobile and tablet; remains the main play area within the layout.

---

## Approach

- **Layout:** New shell component (e.g. `GameScreenLayout`) that renders Header, a main row (flex/grid), and Footer. Main row: board area (flex) | existing `GameSidebar` (fixed width). No change to game logic or `NardiGameContext`.
- **Board size and aspect ratio:**  
  - **CSS:** Board lives in a wrapper with `aspect-ratio: 700 / 500` and flex so it fills available space in the main row; wrapper constrains the board to the correct ratio.  
  - **Resize:** Keep existing **ResizeObserver** on the board wrapper to get pixel dimensions.  
  - **Pixi:** Keep **boardGeometry** at 700×500 (single source of truth). In **GameLayout**, compute `scale = min(containerWidth/700, containerHeight/500)` and apply a scale transform to the root Pixi container so the logical 700×500 board fits inside the actual canvas size. Hit-testing and drawing stay in 700×500 space; Pixi’s transform handles scaling.  
- **Alternatives considered:** Dynamic geometry (recomputing points per size) was rejected to avoid duplicating logic and to keep `boardGeometry` as the single source of truth. Container queries could be used later for refinements; ResizeObserver is already in use and sufficient.

---

## Files to add

| File | Purpose |
|------|--------|
| `src/components/layout/GameScreenLayout.tsx` | Layout shell: header, main row (board slot + sidebar), footer. Accepts `header`, `board`, `sidebar`, `footer` (or equivalent slots). |
| (optional) `src/components/layout/GameHeader.tsx` | Minimal header (title, optional back). Can be inline in layout first. |
| (optional) `src/components/layout/GameFooter.tsx` | Minimal footer. Can be inline in layout first. |

Start with header/footer inline in `GameScreenLayout`; extract to separate components only if useful.

---

## Files to change

| File | Change |
|------|--------|
| `src/App.tsx` | Use `GameScreenLayout` for the game screen. Render header, board area (with aspect-ratio wrapper + ResizeObserver + Application + GameLayout + BackgammonBoard), and existing `GameSidebar` as the side tab menu, plus footer. Remove any duplicate layout structure. |
| `src/components/layout/GameLayout.tsx` | Accept `width`/`height` from parent. Compute `scale = min(width/BOARD_WIDTH, height/BOARD_HEIGHT)` and wrap children in a Pixi container with `scale.set(scale)`. Keep centering (offset x, y) so the scaled board is centered in the canvas. |
| `src/game/boardGeometry.ts` | No change to dimensions. Optional: export aspect ratio constant for use in CSS (e.g. `BOARD_ASPECT_RATIO = BOARD_WIDTH / BOARD_HEIGHT`). |

---

## Dependencies and order

1. **GameScreenLayout** – New layout shell (header, main row, footer); board slot is a simple div for now.
2. **App.tsx** – Integrate layout; board area = wrapper with `aspect-ratio` + ResizeObserver + Application + GameLayout + BackgammonBoard; sidebar in main row.
3. **GameLayout** – Add scale-from-container logic so the 700×500 board fits inside the given width/height.
4. **boardGeometry** – Optional export of aspect ratio for CSS.

No change to `BackgammonBoard`, `GameSidebar`, or game logic.

---

## Out of scope (for later)

- New sidebar tabs (e.g. Chat, Settings) beyond existing Moves/Controls.
- Rich header/footer content.
- Container queries or other layout refinements.

---

## Verification

- Layout on desktop: header on top, board left (resizable) and sidebar right, footer bottom.
- Resize window: board keeps 700∶500 ratio and scales within the main area.
- Mobile/tablet: same structure; board and sidebar stack or flex appropriately (sidebar can stay fixed width or collapse if we add a drawer later).
- No regression to move validation, dice, or WebRTC; all state and actions remain in `NardiGameContext` / session.
