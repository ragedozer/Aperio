# Aperio — Web Photo Editor
## Claude Code Project Intelligence File

---

## Project Overview

Aperio is a free, lightweight browser-based photo editor built with **React + TypeScript**, deployed on Vercel. It provides standard darkroom adjustments with a distinctive floating-panel UI. No AI features, no subscriptions, no login — just a clean editor for non-Adobe users.

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

- **Floating layout** — Toolbar centered at top, LeftPanel (240px) floats left, RightPanel (280px) floats right, Canvas fills full background
- **Mobile responsive** — Bottom sheet panel (collapsed/expanded), toolbar centered, LeftPanel hidden on mobile
- **Frosted glass panels** — `backdrop-filter: blur(16px)` on panels and toolbar buttons
- **13 adjustment sliders** across three collapsible groups (Light / Color / Detail)
- **Custom AdjustmentSlider** — pill track, accent fill, dragging tooltip showing live value
- **Live Histogram** — RGB channel overlay drawn on a canvas element
- **Zustand store** — image, adjustments, history stack (capped at 100), undo/redo, presets
- **Full image processing pipeline** — all 13 adjustments in `src/lib/imageProcessor.ts`; runs in a Web Worker
- **Export** — Ctrl+E / toolbar button; full-res pipeline; always exports as PNG with `-edited` suffix via `<a download>`
- **File I/O** — open via `<input type="file">` + File API; save via `canvas.toBlob()` + object URL download
- **Keyboard shortcuts** — Ctrl+O, Ctrl+Z/Shift+Z, Ctrl+Shift+R, Ctrl+E, Space, backtick — all working
- **History panel** — click any entry to revert; labels show which slider changed and by how much
- **Presets** — save / apply / delete; export to JSON file; import from JSON file; persisted in `localStorage`
- **Canvas pan & zoom** — fit-to-canvas on load and Space; scroll to zoom; click-drag to pan; zoom % badge; clamp keeps image at least 80px visible
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
│   ├── App.tsx                 # layout shell + keyboard shortcut bindings + hidden file input
│   ├── App.module.css
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx      # draws ImageData, pan/zoom, entrance animation
│   │   │   └── Canvas.module.css
│   │   ├── Sidebar/
│   │   │   ├── LeftPanel.tsx   # history list (hidden on mobile)
│   │   │   ├── LeftPanel.module.css
│   │   │   ├── RightPanel.tsx  # adjustment groups + histogram + presets; mobile bottom sheet
│   │   │   └── RightPanel.module.css
│   │   ├── Toolbar/
│   │   │   ├── Toolbar.tsx     # logo + Open/Undo/Redo/Reset/Export buttons
│   │   │   └── Toolbar.module.css
│   │   ├── Sliders/
│   │   │   └── AdjustmentSlider.tsx
│   │   └── Histogram/
│   │       └── Histogram.tsx
│   ├── hooks/
│   │   ├── useImageProcessor.ts   # connects store → pipeline via rAF + Web Worker
│   │   ├── useExport.ts           # canvas.toBlob() → <a download> PNG export
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
│   │   ├── index.ts               # Adjustments, Preset, DEFAULT_ADJUSTMENTS, ADJUSTMENT_RANGES
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
┌─────────────────────────────────────────────────────┐
│         [Logo]  [Open] [Undo] [Redo] [Reset] [Export]  ← floating toolbar, centered, top: 32px
├──────────┬──────────────────────────┬───────────────┤
│          │                          │               │
│ Left     │   Canvas (fills bg)      │  Right        │
│ Panel    │   position:absolute      │  Panel        │
│ 240px    │   inset:0                │  280px        │
│ left:48px│                          │ right:48px    │
│ top:180px│                          │ top:180px     │
│          │                          │               │
│ - History│                          │ ▾ Light       │
│          │                          │ ▾ Color       │
│          │                          │ ▾ Detail      │
│          │                          │ — Histogram — │
│          │                          │ — Presets —   │
└──────────┴──────────────────────────┴───────────────┘

Mobile (≤768px): panels collapse to bottom sheet; toolbar buttons centered; LeftPanel hidden
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

Preview runs on a downscaled copy (max 1200px longest edge) in a persistent Web Worker (`useImageProcessor`). Export runs the full-res pipeline in a one-shot worker (`useExport`).

---

## State Shape (Zustand — `src/store/editorStore.ts`)

```typescript
interface EditorStore {
  originalImage: ImageData | null;
  displayImage: ImageData | null;
  filePath: string | null;

  adjustments: Adjustments;
  setAdjustment: (key: keyof Adjustments, value: number) => void;
  resetAdjustments: () => void;

  history: Adjustments[];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  pushHistory: (adjustments: Adjustments) => void;

  isProcessing: boolean;
  showOriginal: boolean;
  activePanel: 'adjustments' | 'presets';
  setActivePanel: (panel: 'adjustments' | 'presets') => void;
  setShowOriginal: (show: boolean) => void;
  setIsProcessing: (processing: boolean) => void;

  setOriginalImage: (image: ImageData | null, path: string | null) => void;
  setDisplayImage: (image: ImageData | null) => void;

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
| `Ctrl + O` | Open image |
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
- No inline styles except for dynamic values (slider fill width, canvas transform)
- `useCallback` on any function passed to canvas or image processor
- Do not use `motion.canvas` or `motion.div` with `display: contents` — Framer Motion's transform animation conflicts with raw CSS `transform` strings on the same element. Use a wrapper `motion.div` for entrance animations and a plain element for pan/zoom transforms.

---

## What NOT to Do

- Do not add AI or LLM features — intentionally a simple, offline editor
- Do not use `sessionStorage` or a backend for persistence — use `localStorage`
- Do not process full-res images on every slider tick — use the downscaled preview pipeline
- Do not use a third-party image processing library (sharp, jimp) — use Canvas API
- Do not use inline CSS for design tokens — always use CSS variables
- Do not use `motion.canvas` with both FM animate props and a raw `style.transform` string — they conflict; wrap in a `motion.div` instead
