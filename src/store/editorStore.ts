import { create } from "zustand";
import { Adjustments, DEFAULT_ADJUSTMENTS, Preset } from "../types";

interface EditorStore {
  // Image
  originalImage: ImageData | null;
  previewImage: ImageData | null;   // downscaled copy used by the live pipeline
  displayImage: ImageData | null;
  filePath: string | null;

  // Adjustments
  adjustments: Adjustments;
  setAdjustment: (key: keyof Adjustments, value: number) => void;
  resetAdjustments: () => void;

  // History (undo/redo)
  history: Adjustments[];
  historyIndex: number;
  undo: () => void;
  redo: () => void;
  pushHistory: (adjustments: Adjustments) => void;
  jumpToHistory: (index: number) => void;

  // UI
  isProcessing: boolean;
  showOriginal: boolean;
  activePanel: "adjustments" | "presets";
  setActivePanel: (panel: "adjustments" | "presets") => void;
  setShowOriginal: (show: boolean) => void;
  setIsProcessing: (processing: boolean) => void;

  // Image loading
  setOriginalImage: (original: ImageData | null, preview: ImageData | null, path: string | null) => void;
  setDisplayImage: (image: ImageData | null) => void;

  // Presets
  presets: Preset[];
  savePreset: (name: string) => void;
  applyPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

// Module-level timer so the debounce survives re-renders and is shared
// across all callers of setAdjustment.
let historyTimer: ReturnType<typeof setTimeout> | null = null;
function cancelHistoryTimer() {
  if (historyTimer) { clearTimeout(historyTimer); historyTimer = null; }
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Image
  originalImage: null,
  previewImage: null,
  displayImage: null,
  filePath: null,

  // Adjustments
  adjustments: { ...DEFAULT_ADJUSTMENTS },

  setAdjustment: (key, value) => {
    set({ adjustments: { ...get().adjustments, [key]: value } });
    cancelHistoryTimer();
    historyTimer = setTimeout(() => {
      historyTimer = null;
      get().pushHistory(get().adjustments);
    }, 300);
  },

  resetAdjustments: () => {
    const reset = { ...DEFAULT_ADJUSTMENTS };
    set({ adjustments: reset });
    get().pushHistory(reset);
  },

  // History
  history: [{ ...DEFAULT_ADJUSTMENTS }],
  historyIndex: 0,

  pushHistory: (adjustments) => {
    const MAX_HISTORY = 100;
    const { history, historyIndex } = get();
    const truncated = history.slice(0, historyIndex + 1);
    const next = [...truncated, adjustments].slice(-MAX_HISTORY);
    set({ history: next, historyIndex: next.length - 1 });
  },

  undo: () => {
    cancelHistoryTimer();
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex, adjustments: { ...history[newIndex] } });
  },

  redo: () => {
    cancelHistoryTimer();
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex, adjustments: { ...history[newIndex] } });
  },

  jumpToHistory: (index) => {
    cancelHistoryTimer();
    const { history } = get();
    if (index < 0 || index >= history.length) return;
    set({ historyIndex: index, adjustments: { ...history[index] } });
  },

  // UI
  isProcessing: false,
  showOriginal: false,
  activePanel: "adjustments",

  setActivePanel: (panel) => set({ activePanel: panel }),
  setShowOriginal: (show) => set({ showOriginal: show }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),

  // Image loading
  setOriginalImage: (original, preview, path) =>
    set({ originalImage: original, previewImage: preview, filePath: path }),
  setDisplayImage: (image) => set({ displayImage: image }),

  // Presets
  presets: [],

  savePreset: (name) => {
    const { adjustments, presets } = get();
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      adjustments: { ...adjustments },
      createdAt: Date.now(),
    };
    set({ presets: [...presets, preset] });
  },

  applyPreset: (id) => {
    const { presets } = get();
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    set({ adjustments: { ...preset.adjustments } });
    get().pushHistory(preset.adjustments);
  },

  deletePreset: (id) => {
    const { presets } = get();
    set({ presets: presets.filter((p) => p.id !== id) });
  },
}));
