import { create } from "zustand";
import { Adjustments, DEFAULT_ADJUSTMENTS, ImageRecord, Preset } from "../types";

interface EditorStore {
  images: ImageRecord[];
  selectedImageIds: string[];
  copiedAdjustments: Adjustments | null;

  // Image management
  addImage: (original: ImageData, preview: ImageData, path: string) => void;
  removeImages: (ids: string[]) => void;
  clearImages: () => void;
  setDisplayImage: (id: string, image: ImageData | null) => void;
  reorderImages: (fromId: string, toId: string) => void;

  // Selection
  selectImage: (id: string, additive?: boolean) => void;

  // Adjustments (operate on focused image — last in selectedImageIds)
  setAdjustment: (key: keyof Adjustments, value: number) => void;
  resetAdjustments: () => void;

  // History (operate on focused image)
  undo: () => void;
  redo: () => void;
  pushHistory: (id: string, adjustments: Adjustments) => void;
  jumpToHistory: (index: number) => void;

  // Copy / paste settings
  copyAdjustments: () => void;
  pasteAdjustments: () => void;

  // UI
  isProcessing: boolean;
  showOriginal: boolean;
  activePanel: "adjustments" | "presets";
  bottomSheetCollapsed: boolean;
  setActivePanel: (panel: "adjustments" | "presets") => void;
  setShowOriginal: (show: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setBottomSheetCollapsed: (collapsed: boolean) => void;

  // Presets
  presets: Preset[];
  savePreset: (name: string) => void;
  applyPreset: (id: string) => void;
  deletePreset: (id: string) => void;
}

// Per-image history debounce timers
const historyTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cancelHistoryTimer(id: string) {
  const t = historyTimers.get(id);
  if (t) { clearTimeout(t); historyTimers.delete(id); }
}

function updateImage(images: ImageRecord[], id: string, patch: Partial<ImageRecord>): ImageRecord[] {
  return images.map((img) => (img.id === id ? { ...img, ...patch } : img));
}

function getFocused(images: ImageRecord[], selectedImageIds: string[]): ImageRecord | null {
  if (selectedImageIds.length === 0) return null;
  const id = selectedImageIds[selectedImageIds.length - 1];
  return images.find((img) => img.id === id) ?? null;
}

// Selector exported for components to use
export function selectFocusedImage(state: EditorStore): ImageRecord | null {
  return getFocused(state.images, state.selectedImageIds);
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  images: [],
  selectedImageIds: [],
  copiedAdjustments: null,

  addImage: (original, preview, path) => {
    const id = crypto.randomUUID();
    const record: ImageRecord = {
      id,
      filePath: path,
      originalImage: original,
      previewImage: preview,
      displayImage: null,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      history: [{ ...DEFAULT_ADJUSTMENTS }],
      historyIndex: 0,
    };
    const { images, selectedImageIds } = get();
    set({ images: [...images, record], selectedImageIds: [...selectedImageIds, id] });
  },

  removeImages: (ids) => {
    const toRemove = new Set(ids);
    ids.forEach(cancelHistoryTimer);
    const { images, selectedImageIds } = get();
    const newImages = images.filter((img) => !toRemove.has(img.id));
    const newSelected = selectedImageIds.filter((id) => !toRemove.has(id));
    const finalSelected =
      newSelected.length === 0 && newImages.length > 0
        ? [newImages[newImages.length - 1].id]
        : newSelected;
    set({ images: newImages, selectedImageIds: finalSelected });
  },

  clearImages: () => {
    get().images.forEach((img) => cancelHistoryTimer(img.id));
    set({ images: [], selectedImageIds: [] });
  },

  setDisplayImage: (id, image) => {
    set((state) => ({ images: updateImage(state.images, id, { displayImage: image }) }));
  },

  reorderImages: (fromId, toId) => {
    const { images } = get();
    const fromIdx = images.findIndex((img) => img.id === fromId);
    const toIdx = images.findIndex((img) => img.id === toId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const next = [...images];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    set({ images: next });
  },

  selectImage: (id, additive = false) => {
    const { selectedImageIds } = get();
    if (additive) {
      if (selectedImageIds.includes(id)) {
        const next = selectedImageIds.filter((sid) => sid !== id);
        set({ selectedImageIds: next.length > 0 ? next : selectedImageIds });
      } else {
        set({ selectedImageIds: [...selectedImageIds, id] });
      }
    } else {
      set({ selectedImageIds: [id] });
    }
  },

  setAdjustment: (key, value) => {
    const { selectedImageIds } = get();
    if (selectedImageIds.length === 0) return;
    const selected = new Set(selectedImageIds);
    set((state) => ({
      images: state.images.map((img) =>
        selected.has(img.id)
          ? { ...img, adjustments: { ...img.adjustments, [key]: value } }
          : img
      ),
    }));
    for (const id of selectedImageIds) {
      cancelHistoryTimer(id);
      historyTimers.set(
        id,
        setTimeout(() => {
          historyTimers.delete(id);
          const current = get().images.find((img) => img.id === id);
          if (current) get().pushHistory(id, current.adjustments);
        }, 300)
      );
    }
  },

  resetAdjustments: () => {
    const { images, selectedImageIds } = get();
    if (selectedImageIds.length === 0) return;
    const reset = { ...DEFAULT_ADJUSTMENTS };
    const selected = new Set(selectedImageIds);
    set((state) => ({
      images: state.images.map((img) =>
        selected.has(img.id) ? { ...img, adjustments: reset } : img
      ),
    }));
    for (const id of selectedImageIds) {
      // only push history if the image exists
      if (images.find((img) => img.id === id)) get().pushHistory(id, reset);
    }
  },

  pushHistory: (id, adjustments) => {
    const MAX_HISTORY = 100;
    const img = get().images.find((i) => i.id === id);
    if (!img) return;
    const truncated = img.history.slice(0, img.historyIndex + 1);
    const next = [...truncated, adjustments].slice(-MAX_HISTORY);
    set((state) => ({ images: updateImage(state.images, id, { history: next, historyIndex: next.length - 1 }) }));
  },

  undo: () => {
    const { images, selectedImageIds } = get();
    const focused = getFocused(images, selectedImageIds);
    if (!focused || focused.historyIndex <= 0) return;
    cancelHistoryTimer(focused.id);
    const newIndex = focused.historyIndex - 1;
    set((state) => ({
      images: updateImage(state.images, focused.id, {
        historyIndex: newIndex,
        adjustments: { ...focused.history[newIndex] },
      }),
    }));
  },

  redo: () => {
    const { images, selectedImageIds } = get();
    const focused = getFocused(images, selectedImageIds);
    if (!focused || focused.historyIndex >= focused.history.length - 1) return;
    cancelHistoryTimer(focused.id);
    const newIndex = focused.historyIndex + 1;
    set((state) => ({
      images: updateImage(state.images, focused.id, {
        historyIndex: newIndex,
        adjustments: { ...focused.history[newIndex] },
      }),
    }));
  },

  jumpToHistory: (index) => {
    const { images, selectedImageIds } = get();
    const focused = getFocused(images, selectedImageIds);
    if (!focused || index < 0 || index >= focused.history.length) return;
    cancelHistoryTimer(focused.id);
    set((state) => ({
      images: updateImage(state.images, focused.id, {
        historyIndex: index,
        adjustments: { ...focused.history[index] },
      }),
    }));
  },

  copyAdjustments: () => {
    const { images, selectedImageIds } = get();
    const focused = getFocused(images, selectedImageIds);
    if (!focused) return;
    set({ copiedAdjustments: { ...focused.adjustments } });
  },

  pasteAdjustments: () => {
    const { copiedAdjustments, images, selectedImageIds } = get();
    if (!copiedAdjustments || selectedImageIds.length === 0) return;
    const selected = new Set(selectedImageIds);
    set((state) => ({
      images: state.images.map((img) =>
        selected.has(img.id) ? { ...img, adjustments: { ...copiedAdjustments } } : img
      ),
    }));
    for (const id of selectedImageIds) {
      if (images.find((img) => img.id === id)) get().pushHistory(id, copiedAdjustments);
    }
  },

  isProcessing: false,
  showOriginal: false,
  activePanel: "adjustments",
  bottomSheetCollapsed: false,

  setActivePanel: (panel) => set({ activePanel: panel }),
  setShowOriginal: (show) => set({ showOriginal: show }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setBottomSheetCollapsed: (collapsed) => set({ bottomSheetCollapsed: collapsed }),

  presets: [],

  savePreset: (name) => {
    const { images, selectedImageIds, presets } = get();
    const focused = getFocused(images, selectedImageIds);
    if (!focused) return;
    const preset: Preset = {
      id: crypto.randomUUID(),
      name,
      adjustments: { ...focused.adjustments },
      createdAt: Date.now(),
    };
    set({ presets: [...presets, preset] });
  },

  applyPreset: (id) => {
    const { presets, images, selectedImageIds } = get();
    const preset = presets.find((p) => p.id === id);
    if (!preset || selectedImageIds.length === 0) return;
    const selected = new Set(selectedImageIds);
    set((state) => ({
      images: state.images.map((img) =>
        selected.has(img.id) ? { ...img, adjustments: { ...preset.adjustments } } : img
      ),
    }));
    for (const id of selectedImageIds) {
      if (images.find((img) => img.id === id)) get().pushHistory(id, preset.adjustments);
    }
  },

  deletePreset: (id) => {
    set((state) => ({ presets: state.presets.filter((p) => p.id !== id) }));
  },
}));
