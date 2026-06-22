# Aperio — Web Photo Editor
## Claude Code Project Intelligence File

---

## Project Overview

Aperio is a free, lightweight browser-based photo editor built with **React + TypeScript**, deployed on Vercel. It provides standard darkroom adjustments with a distinctive floating-panel UI, multi-image canvas with pan/zoom, and batch editing. No AI features, no subscriptions, no login — just a clean editor for non-Adobe users.

Originally scaffolded as a Tauri v2 desktop app (codename "Lumina"), it was fully converted to a pure web app. All Tauri/Rust code has been removed.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + TypeScript | Component model suits panel-based editor UI |
| Styling | CSS Modules + custom design tokens | Full creative control, no utility-class constraints |
| Animation | Framer Motion | Fluid slider and panel transitions |
| Image processing | Canvas API + Web Workers | Direct pixel manipulation, no heavy deps |
| State | Zustand | Lightweight, no boilerplate |
| Build | Vite (port 1420) | Fast HMR during development |
| Hosting | Vercel | SPA with rewrite rule in `vercel.json` |
| Persistence | `localStorage` | Presets saved locally, no backend needed |
| Icons | Material Symbols Rounded (Google Fonts CDN) | |

---

## Current State

All core editing features are working and deployed.

### Single-image editing
- **Floating layout** — Toolbar centered at top, LeftPanel (240px) floats left, RightPanel (280px) floats right, Canvas fills full background
- **13 adjustment sliders** across three collapsible groups (Light / Color / Detail)
- **Custom AdjustmentSlider** — pill track, accent fill, dragging tooltip showing live value; track-width-based sensitivity for correct mobile feel
- **Live Histogram** — RGB channel overlay drawn on a canvas element
- **Full image processing pipeline** — all 13 adjustments in `src/lib/imageProcessor.ts`; runs in a Web Worker
- **Canvas pan & zoom** — fit-to-canvas on load and Space; scroll to zoom; click-drag to pan; zoom % badge; clamp keeps image at least 80px visible
- **History panel** — click any entry to revert; labels show which slider changed and by how much
- **Presets** — save / apply / delete; export to JSON file; import from JSON file; persisted in `localStorage`
- **Export** — Ctrl+E / toolbar button; full-res pipeline; exports as PNG with `-edited` suffix via `<a download>`
- **Keyboard shortcuts** — Ctrl+O, Ctrl+Z/Shift+Z, Ctrl+Shift+R, Ctrl+E, Space, backtick — all working

### Multi-image canvas (Grid view)
- **Open multiple images** — Open replaces canvas; Add appends to existing session
- **Zoomable, pannable grid** — scroll to zoom, drag to pan, pinch on touch, Space to fit; same pan/zoom system as single-image view
- **Images at natural preview size** — tiles render at up to 1200px longest edge; `fitScale` via ResizeObserver zooms to fit on load
- **Image selection** — click to select; Ctrl/Shift+click on desktop for multi-select; tap on mobile is always additive (toggles in/out)
- **Drag-to-reorder tiles** — pointer drag with ghost image; drop target highlighted with accent border
- **Batch editing** — sliders and presets apply simultaneously to all selected images; batch badge shown in panel
- **Copy/Paste adjustments** — copy settings from one image, paste to all selected images via ActionChip
- **ActionChip** — floating "Remove / Copy Settings / Paste" pill rendered via React Portal; centered via full-width fixed row; hidden when ≤1 image or nothing selected; repositions when mobile panel collapses
- **Export dropdown** — "Export Selected (N)" and "Export All (N)"; plain Export button when only one image

### Mobile
- **Bottom sheet panel** — collapse/expand via chevron handle; fully collapses to 32px handle only
- **Two-row toolbar** — Undo/Redo/Reset on row 1; Open/Add/Export on row 2 (zero-height `flex-basis: 100%` line-break div)
- **Touch pan & zoom** — single-touch pan activates after 8px threshold (preserves tap-to-select); pinch-to-zoom; double-tap empty canvas to fit
- **Touch multi-select** — additive by default; taps toggle images in/out of selection without modifier keys
- **Thicker selection ring** — 3px border on mobile; 52px checkmark icon
- **ActionChip repositions** — sits just above collapsed panel handle; rises back up when panel expands

### General
- **Frosted glass panels** — `backdrop-filter: blur(16px)` on panels and toolbar buttons
- **File I/O** — open via `<input type="file">` + File API; export via `canvas.toBlob()` + object URL download
- **Favicon** — `/public/Aperio_Icon.png`, plus `apple-touch-icon` for iOS
- **TypeScript strict** — passes `tsc --noEmit` clean

### Not yet implemented

- Debounce on slider changes (currently fires on every tick)
- Per-channel histogram toggle (currently draws all three always)

---

## Project Structure

```
Photo Editor - Web/
├── public/
│   └── Aperio_Icon.png         # favicon (also apple-touch-icon)
├── graphics/
│   ├── Aperio_Icon.png         # source icon (copy to public/ when updated)
│   └── Aperio_Logo_W.svg       # white logo used in Toolbar
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # layout shell + keyboard shortcut bindings + two hidden file inputs (open/add)
│   ├── App.module.css
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx      # SingleImageView + GridView (ImageTile, ActionChip) + empty state
│   │   │   └── Canvas.module.css
│   │   ├── Sidebar/
│   │   │   ├── LeftPanel.tsx   # history list (hidden on mobile)
│   │   │   ├── LeftPanel.module.css
│   │   │   ├── RightPanel.tsx  # adjustment groups + histogram + presets + batch badge; mobile bottom sheet
│   │   │   └── RightPanel.module.css
│   │   ├── Toolbar/
│   │   │   ├── Toolbar.tsx     # logo + Open/Add/Undo/Redo/Reset/Export(dropdown) buttons
│   │   │   └── Toolbar.module.css
│   │   ├── Sliders/
│   │   │   └── AdjustmentSlider.tsx
│   │   └── Histogram/
│   │       └── Histogram.tsx
│   ├── hooks/
│   │   ├── useImageProcessor.ts   # connects store → pipeline via rAF + Web Worker (one worker per ImageRecord)
│   │   ├── useExport.ts           # canvas.toBlob() → <a download> PNG export (selected or all)
│   │   ├── usePresetPersistence.ts # localStorage key: aperio-presets
│   │   ├── useAdjustments.ts
│   │   └── useHistory.ts
│   ├── store/
│   │   └── editorStore.ts
│   ├── lib/
│   │   ├── imageProcessor.ts      # pixel math — applyAdjustments + scaleForPreview
│   │   ├── imageProcessor.worker.ts
│   │   └── colorUtils.ts          # RGB↔HSL↔HSV + clamp
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   ├── types/
│   │   ├── index.ts               # Adjustments, Preset, ImageRecord, DEFAULT_ADJUSTMENTS, ADJUSTMENT_RANGES
│   │   └── css-modules.d.ts
│   └── vite-env.d.ts
├── .claude/
│   └── launch.json             # preview server config (port 1420, pnpm exec vite)
├── vercel.json                 # SPA rewrite: all routes → /index.html
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

### Key sub-components inside Canvas.tsx

- **`SingleImageView`** — wraps the single-image canvas; owns all pan/zoom pointer events; Space resets
- **`GridView`** — `gridWrapper` (overflow:hidden flex stage) + `gridContent` (JS-transformed layer holding the CSS grid); owns wheel + pointer + native touch events for the stage; `fitScale` computed by ResizeObserver
- **`ImageTile`** — individual tile; handles selection click (with `lastPointerTypeRef` for additive touch select), drag-to-reorder, `suppressClickRef` to block post-drag click
- **`ActionChip`** — "Remove / Copy Settings / Paste" pill; rendered at `document.body` via `createPortal`; reads `bottomSheetCollapsed` from store to reposition on mobile

---

## Design System & Visual Direction

### Tokens (defined in `src/styles/tokens.css`)

```css
:root {
  --surface-base: #161616;
  --surface-raised: #292929;
  --surface-overlay: #212121;
  --surface-hover: #353535;

  --accent-primary: #974bef;
  --accent-glow: rgba(151, 75, 239, 0.35);
  --accent-subtle: rgba(151, 75, 239, 0.15);

  --open-color: #f3ff00;
  --open-subtle: rgba(243, 255, 0, 0.15);

  --btn-fill: #353535;
  --btn-stroke: #aaaaaa;

  --text-primary: #f0f0f5;
  --text-secondary: #8888a0;
  --text-muted: #55556a;

  --slider-track: #2a2a35;
  --slider-fill: var(--accent-primary);
  --slider-thumb-size: 14px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 14px;
  --radius-pill: 999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}
```

### UI Principles

- **Dark base** — near-black with cool undertone
- **Two accent colors** — violet (`--accent-primary`) for adjustments/active states; yellow (`--open-color`) for the Open button
- **Floating panels** — `position: absolute` over the canvas; frosted glass via `backdrop-filter: blur(16px)`; `rgba(41,41,41,0.8)` background
- **Custom sliders** — pill-shaped track, glowing thumb on hover/drag, value tooltip on drag
- **Typography** — `Inter` for UI labels, `JetBrains Mono` for numeric values
- **Icons** — Material Symbols Rounded via Google Fonts CDN (`<span class="material-symbols-rounded">`)
- **Micro-animations** — Framer Motion for panel/entrance transitions; CSS `transition` is acceptable for direct DOM mutations (e.g. button hover states)
- **Scrollbars** — dark gray, 2px wide, pill-shaped via global CSS

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo]  [Undo] [Redo] [Reset]  [Open] [Add] [Export ▾]     ← floating toolbar, centered, top: 32px
├──────────┬───────────────────────────────────┬───────────────┤
│          │                                   │               │
│ Left     │   Canvas (fills bg)               │  Right        │
│ Panel    │   position:absolute; inset:0      │  Panel        │
│ 240px    │                                   │  280px        │
│ left:48px│  Single image: SingleImageView    │ right:48px    │
│ top:180px│  Grid: GridView (gridWrapper >    │ top:180px     │
│          │    gridContent > grid > tiles)    │               │
│ - History│                                   │ ▾ Light       │
│          │  [Remove | Copy Settings | Paste] │ ▾ Color       │
│          │   ActionChip (portal, fixed)      │ ▾ Detail      │
│          │                                   │ — Histogram — │
│          │                                   │ — Presets —   │
└──────────┴───────────────────────────────────┴───────────────┘

Mobile (≤768px):
  Toolbar row 1: [Undo] [Redo] [Reset]
  Toolbar row 2: [Open] [Add] [Export]
  RightPanel: bottom sheet, collapses to 32px handle only
  LeftPanel: hidden
  ActionChip: fixed bottom, tracks panel collapsed state
```

---

## Image Processing Pipeline

All adjustments are non-destructive. The pipeline re-runs on every change:

```
Original Pixels
     ↓  Exposure          ✓
     ↓  Contrast          ✓
     ↓  Highlights        ✓
     ↓  Shadows           ✓
     ↓  Whites            ✓
     ↓  Blacks            ✓
     ↓  Saturation        ✓
     ↓  Vibrance          ✓
     ↓  Temperature/Tint  ✓
     ↓  Sharpness         ✓ (unsharp mask)
     ↓  Noise/Grain       ✓
     ↓  Vignette          ✓
     ↓
Display Canvas
```

Preview runs on a downscaled copy (max 1200px longest edge) in a **persistent Web Worker per image** (`useImageProcessor`). Export runs the full-res pipeline in a one-shot worker (`useExport`).

In multi-image sessions, `setAdjustment` applies the change to all `selectedImageIds`. Each `ImageRecord` has its own `history` stack and `historyIndex`.

---

## State Shape (Zustand — `src/store/editorStore.ts`)

```typescript
// Per-image record
interface ImageRecord {
  id: string;
  filePath: string;
  originalImage: ImageData;    // full-res, never mutated
  previewImage: ImageData;     // downscaled to max 1200px longest edge
  displayImage: ImageData | null;
  adjustments: Adjustments;
  history: Adjustments[];
  historyIndex: number;
}

interface EditorStore {
  images: ImageRecord[];
  selectedImageIds: string[];
  copiedAdjustments: Adjustments | null;
  bottomSheetCollapsed: boolean;        // tracks mobile panel state for ActionChip

  setAdjustment: (key: keyof Adjustments, value: number) => void; // applies to all selectedImageIds
  resetAdjustments: () => void;
  undo: () => void;
  redo: () => void;

  isProcessing: boolean;
  showOriginal: boolean;
  activePanel: 'adjustments' | 'presets';
  setActivePanel: (panel: 'adjustments' | 'presets') => void;
  setShowOriginal: (show: boolean) => void;
  setIsProcessing: (processing: boolean) => void;

  setOriginalImage: (images: ImageRecord[]) => void;  // replaces all images
  addImages: (images: ImageRecord[]) => void;
  removeImages: (ids: string[]) => void;
  reorderImages: (ids: string[]) => void;
  setSelectedImageIds: (ids: string[]) => void;
  setDisplayImage: (id: string, image: ImageData) => void;
  copyAdjustments: () => void;
  pasteAdjustments: () => void;
  setBottomSheetCollapsed: (collapsed: boolean) => void;

  presets: Preset[];
  savePreset: (name: string) => void;
  applyPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + O` | Open image(s) — replaces canvas |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + Shift + R` | Reset all adjustments |
| `` ` `` (hold) | Show original |
| `Ctrl + E` | Export full-res PNG |
| `Space` | Fit image to canvas / reset pan |

---

## Development

```bash
pnpm install
pnpm dev        # starts Vite on port 1420
```

### Production / Deploy

Push to `main` on GitHub → Vercel auto-deploys.
Repo: https://github.com/ragedozer/Aperio.git

Manual build:
```bash
pnpm build      # outputs to dist/
```

### Favicon update workflow

When updating the icon, replace `graphics/Aperio_Icon.png`, then:
```bash
cp graphics/Aperio_Icon.png public/Aperio_Icon.png
git add public/Aperio_Icon.png && git commit -m "Update favicon" && git push
```

---

## Performance Rules

- **Always process a downscaled preview** for real-time slider feedback (max 1200px on longest edge)
- **Run image processing in a Web Worker** — never block the main thread
- **Cache the original pixel data** — never re-read from the image element
- **Export only**: apply full-res pipeline when user triggers export, not during editing

---

## Code Conventions

- TypeScript strict mode always on
- CSS Modules for component styles, global tokens in `tokens.css`
- No inline styles except for dynamic values (slider fill width, canvas transform, grid-template-columns)
- `useCallback` on any function passed to canvas or image processor
- Do not use `motion.canvas` or `motion.div` with `display: contents` — Framer Motion's transform animation conflicts with raw CSS `transform` strings on the same element. Use a wrapper `motion.div` for entrance animations and a plain element for pan/zoom transforms.
- **ActionChip centering**: render via `createPortal(chip, document.body)` + use a full-width fixed row (`left:0; right:0; display:flex; justify-content:center`) — do not use `left:50%; transform:translateX(-50%)` which is sensitive to scrollbar width
- **Touch selection in GridView**: do NOT call `e.preventDefault()` in `touchstart` for single-touch — it cancels the native click pipeline that tile `onClick` depends on. Only `preventDefault` in `touchmove` after movement exceeds 8px threshold
- **CSS specificity for selected-over-hover**: chain `.tile.tileSelected .tileImgWrap` (specificity 0,3,0) and place it after `.tile:hover .tileImgWrap` in source order so cascade wins; on mobile `:hover` sticks after tap and would otherwise override the selected ring
- **Mobile panel collapse**: add `min-height: 0` in the mobile media query to override desktop `min-height: 200px`; otherwise Framer Motion cannot animate the panel to its collapsed height

---

## What NOT to Do

- Do not add AI or LLM features — intentionally a simple, offline editor
- Do not use `sessionStorage` or a backend for persistence — use `localStorage`
- Do not process full-res images on every slider tick — use the downscaled preview pipeline
- Do not use a third-party image processing library (sharp, jimp) — use Canvas API
- Do not use inline CSS for design tokens — always use CSS variables
- Do not use `motion.canvas` with both FM animate props and a raw `style.transform` string — they conflict; wrap in a `motion.div` instead
- Do not call `e.preventDefault()` in `touchstart` for single-finger touch in GridView — kills tile click/selection
- Do not add `min-height` constraints to the mobile `.panel` — it blocks Framer Motion collapse animation
