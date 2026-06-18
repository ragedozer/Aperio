import { useCallback } from "react";
import { useEditorStore } from "../store/editorStore";
import { Adjustments } from "../types";

export function useAdjustments() {
  const { adjustments, setAdjustment, resetAdjustments } = useEditorStore();

  const set = useCallback(
    (key: keyof Adjustments, value: number) => setAdjustment(key, value),
    [setAdjustment]
  );

  return { adjustments, set, reset: resetAdjustments };
}
