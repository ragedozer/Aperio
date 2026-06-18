import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/editorStore";
import { Preset } from "../types";

const STORAGE_KEY = "aperio-presets";

export function usePresetPersistence() {
  const { presets } = useEditorStore();
  const loadedRef = useRef(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Preset[];
        if (Array.isArray(saved) && saved.length > 0) {
          useEditorStore.setState({ presets: saved });
        }
      }
    } catch {
      // Corrupted storage — ignore and start fresh
    }
    loadedRef.current = true;
  }, []);

  // Persist whenever presets change (skip before initial load completes)
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // Storage full or unavailable — silently skip
    }
  }, [presets]);
}
