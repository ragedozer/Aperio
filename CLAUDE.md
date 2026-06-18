# Lumina — Desktop Photo Editor
## Claude Code Project Intelligence File

---

## Project Overview

Lumina is a free, lightweight desktop photo editor built with **Tauri v2 + React + TypeScript**.
It provides standard darkroom adjustments with a distinctive custom UI, and ships as a native
app for macOS and Windows. No AI features, no subscriptions — just a clean editor for
non-Adobe users.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Desktop shell | Tauri v2 | Lightweight, Rust-powered, native on Mac + Windows |
| Frontend | React 18 + TypeScript | Component model suits panel-based editor UI |
| Styling | CSS Modules + custom design tokens | Full creative control, no utility-class constraints |
| Animation | Framer Motion | Fluid slider and panel transitions |
| Image processing | Canvas API + custom pipelines | Direct pixel manipulation, no heavy deps |
| State | Zustand | Lightweight, no boilerplate |
| Build | Vite | Fast HMR during development |
| CI/CD | GitHub Actions | Cross-platform builds (Mac + Windows) |

---

## Current State (session 3 complete)

The full scaffold is in place and all core editing features are working.

- **Three-panel layout** — Toolbar (48px), LeftPanel (240px, history), Canvas (flex), RightPanel (280px)
- **13 adjustment sliders** across three collapsible groups (Light / Color / Detail), each with spring-animated open/close chevron
- **Custom AdjustmentSlider** — pill track, accent fill, dragging tooltip showing live value
- **Live Histogram** — RGB channel overlay drawn on a canvas element
- **Zustand store** — full state shape: image, adjustments, history stack (capped at 100), undo/redo, presets, `jumpToHistory`
- **Full image processing pipeline** — all 13 adjustments implemented in `src/lib/imageProcessor.ts`; runs in a Web Worker via `useImageProcessor`
- **Export** — Ctrl+E / toolbar button; full-res pipeline in a one-shot worker; JPEG or PNG from file extension
- **Tauri file I/O** — `open_image`, `save_image`, `show_open_dialog`, `show_save_dialog` wired in Rust and typed in `src/lib/tauri.ts`
- **Keyboard shortcuts** — Ctrl+O, Ctrl+Z/Shift+Z, Ctrl+Shift+R, Ctrl+E, Space, backtick — all working
- **History panel** — click any entry to revert; labels show which slider changed and by how much
- **Presets** — save / apply / delete UI in the Presets tab of the right panel
- **Canvas zoom** — fit-to-canvas on load and Space; scroll to zoom; zoom % badge
- **TypeScript strict** — passes `tsc --noEmit` clean

### What is not yet implemented

- Debounce on slider changes (currently fires on every tick)
- Pan / drag to move canvas when zoomed in past fit
- Per-channel histogram (currently draws all three but could be cleaner)
- Tauri persistence (presets and settings lost on app restart — use Tauri store plugin)

---

## Project Structure

```
Photo Editor/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/mod.rs     # open_image, save_image, show_open_dialog, show_save_dialog
│   │   └── lib.rs              # plugin registration + invoke_handler
│   ├── icons/                  # placeholder icons (pnpm gen-icons)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # layout shell + keyboard shortcut bindings
│   ├── App.module.css
│   ├── components/
│   │   ├── Canvas/             # Canvas.tsx — draws ImageData, shows empty state
│   │   ├── Sidebar/
│   │   │   ├── LeftPanel.tsx   # history list
│   │   │   └── RightPanel.tsx  # collapsible adjustment groups + histogram tabs
│   │   ├── Toolbar/            # Open / Undo / Redo / Reset / Export buttons
│   │   ├── Sliders/
│   │   │   └── AdjustmentSlider.tsx   # custom range input with animated fill + tooltip
│   │   └── Histogram/
│   │       └── Histogram.tsx   # live RGB histogram canvas
│   ├── hooks/
│   │   ├── useImageProcessor.ts   # connects store → pipeline via rAF
│   │   ├── useAdjustments.ts
│   │   └── useHistory.ts
│   ├── store/
│   │   └── editorStore.ts      # Zustand store
│   ├── lib/
│   │   ├── imageProcessor.ts   # pixel math — applyAdjustments + scaleForPreview
│   │   ├── tauri.ts            # typed invoke wrappers
│   │   └── colorUtils.ts       # RGB↔HSL↔HSV + clamp
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   ├── types/
│   │   ├── index.ts            # Adjustments, Preset, DEFAULT_ADJUSTMENTS, ADJUSTMENT_RANGES
│   │   └── css-modules.d.ts
│   └── vite-env.d.ts
├── scripts/
│   └── gen-icons.mjs           # generates src-tauri/icons/* using Node built-ins only
├── .claude/
│   └── launch.json             # preview server config (port 1420, pnpm exec vite)
├── .github/workflows/build.yml
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
  --surface-base: #0e0e11;
  --surface-raised: #16161a;
  --surface-overlay: #1e1e24;
  --surface-hover: #26262e;

  --accent-primary: #7b61ff;
  --accent-glow: rgba(123, 97, 255, 0.35);
  --accent-subtle: rgba(123, 97, 255, 0.12);

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

- **Dark, deep base** — near-black with slight cool-purple undertone
- **One accent color** — violet/indigo, used sparingly for active states and glow
- **Custom sliders** — pill-shaped track, glowing thumb on hover/drag, value tooltip on drag
- **Panels** — frosted glass feel using `backdrop-filter: blur` on `--surface-overlay`
- **Typography** — `Inter` for UI labels, `JetBrains Mono` for numeric values
- **No sharp corners** — minimum `--radius-sm` on all interactive elements
- **Micro-animations** — Framer Motion for everything; no CSS `transition` on interactive elements

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Toolbar (top, 48px)                                │
├──────────┬──────────────────────────┬───────────────┤
│          │                          │               │
│ Left     │   Canvas (center)        │  Right        │
│ Panel    │   (image + overlays)     │  Panel        │
│ 240px    │                          │  280px        │
│          │                          │               │
│ - History│                          │ ▾ Light       │
│          │                          │ ▾ Color       │
│          │                          │ ▾ Detail      │
│          │                          │ — Histogram — │
└──────────┴──────────────────────────┴───────────────┘
```

---

## Image Processing Pipeline

All adjustments are non-destructive. The pipeline re-runs on every change:

```
Original Pixels
     ↓  Exposure          ✓ implemented
     ↓  Contrast          ✓ implemented
     ↓  Highlights        ✓ implemented
     ↓  Shadows           ✓ implemented
     ↓  Whites            ✓ implemented
     ↓  Blacks            ✓ implemented
     ↓  Saturation        ✓ implemented
     ↓  Vibrance          ✓ implemented
     ↓  Temperature/Tint  ✓ implemented
     ↓  Sharpness         ✓ implemented (unsharp mask)
     ↓  Noise/Grain       ✓ implemented
     ↓  Vignette          ✓ implemented
     ↓
Display Canvas
```

Processing runs in a Web Worker (`src/lib/imageProcessor.worker.ts`) for real-time
slider feedback. Full-res pipeline also runs in a dedicated worker on export.

### Adjustment Ranges

| Adjustment | Range | Default | Implemented |
|---|---|---|---|
| Exposure | -3.0 to +3.0 EV | 0 | ✓ |
| Contrast | -100 to +100 | 0 | ✓ |
| Highlights | -100 to +100 | 0 | ✓ |
| Shadows | -100 to +100 | 0 | ✓ |
| Whites | -100 to +100 | 0 | ✓ |
| Blacks | -100 to +100 | 0 | ✓ |
| Saturation | -100 to +100 | 0 | ✓ |
| Vibrance | -100 to +100 | 0 | ✓ |
| Temperature | -100 to +100 | 0 | ✓ |
| Tint | -100 to +100 | 0 | ✓ |
| Sharpness | 0 to 100 | 0 | ✓ |
| Noise/Grain | 0 to 100 | 0 | ✓ |
| Vignette | -100 to +100 | 0 | ✓ |

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

## Tauri Commands (`src-tauri/src/commands/mod.rs`)

```rust
#[tauri::command]
pub async fn open_image(path: String) -> Result<Vec<u8>, String>

#[tauri::command]
pub async fn save_image(path: String, data: Vec<u8>, _format: String) -> Result<(), String>

#[tauri::command]
pub async fn show_open_dialog(app: AppHandle) -> Result<Option<String>, String>

#[tauri::command]
pub async fn show_save_dialog(app: AppHandle, default_name: String) -> Result<Option<String>, String>
```

All use `.blocking_pick_file()` / `.blocking_save_file()` from `tauri-plugin-dialog`.
Frontend wrappers live in `src/lib/tauri.ts`.

---

## Keyboard Shortcuts

| Shortcut | Action | Implemented |
|---|---|---|
| `Ctrl + O` | Open image | ✓ |
| `Ctrl + Z` | Undo | ✓ |
| `Ctrl + Shift + Z` | Redo | ✓ |
| `Ctrl + Shift + R` | Reset all adjustments | ✓ |
| `` ` `` (hold) | Show original | ✓ |
| `Ctrl + E` | Export full-res | ✓ |
| `Space` | Fit image to canvas | ✓ |

---

## Performance Rules

- **Always process a downscaled preview** for real-time slider feedback (max 1200px on longest edge)
- **Debounce slider changes** by 16ms (one frame) before triggering pipeline
- **Run image processing in a Web Worker** — live preview uses a persistent worker in `useImageProcessor`; export spawns a one-shot worker in `useExport`
- **Cache the original pixel data** — never re-read from the image element
- **Export only**: apply full-res pipeline when user triggers export, not during editing

---

## Code Conventions

- TypeScript strict mode always on
- CSS Modules for component styles, global tokens in `tokens.css`
- No inline styles except for dynamic values (e.g. slider fill width)
- Framer Motion for all transitions — no CSS `transition` on interactive elements
- `useCallback` and `useMemo` on any function passed to canvas or image processor
- All Tauri commands wrapped in a typed `invoke` helper in `src/lib/tauri.ts`

---

## Build & Release

### Prerequisites (Windows)

1. Install Node.js 20+
2. `npm install -g pnpm`
3. Download and run `https://win.rustup.rs/x86_64` with flag `-y` (installs Rust stable)
4. Download and run `https://aka.ms/vs/17/release/vs_BuildTools.exe` with flags `--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended` (installs MSVC linker)
5. Restart terminal so `cargo` and the MSVC linker are on PATH

### First-time setup

```bash
pnpm install
pnpm approve-builds --all   # approves esbuild postinstall — required once on pnpm 11+
pnpm gen-icons              # generates src-tauri/icons/ placeholder icons
pnpm tauri dev
```

### Development
```bash
pnpm tauri dev
```

### Production Build
```bash
pnpm tauri build
# Output: src-tauri/target/release/bundle/
```

---

## What NOT to Do

- Do not add AI or LLM features — this is intentionally a simple, offline editor
- Do not use `localStorage` — use Tauri's store plugin for persistence
- Do not process full-res images on every slider tick
- Do not use a third-party image processing library (sharp, jimp) in the frontend — use Canvas API
- Do not use inline CSS for design tokens — always use CSS variables
- Do not add dependencies without checking if the Canvas API already covers the need
- Do not use CSS `transition` on interactive elements — use Framer Motion
