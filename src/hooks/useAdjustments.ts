import { useCallback } from "react";
import { useEditorStore, selectFocusedImage } from "../store/editorStore";
import { Adjustments, DEFAULT_ADJUSTMENTS } from "../types";

export function useAdjustments() {
  const focused = useEditorStore(selectFocusedImage);
  const { setAdjustment, resetAdjustments } = useEditorStore();
  const adjustments = focused?.adjustments ?? { ...DEFAULT_ADJUSTMENTS };

  const set = useCallback(
    (key: keyof Adjustments, value: number) => setAdjustment(key, value),
    [setAdjustment]
  );

  return { adjustments, set, reset: resetAdjustments };
}
