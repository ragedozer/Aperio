import { useCallback } from "react";
import { useEditorStore, selectFocusedImage } from "../store/editorStore";
import { DEFAULT_ADJUSTMENTS } from "../types";

export function useHistory() {
  const focused = useEditorStore(selectFocusedImage);
  const { undo, redo } = useEditorStore();
  const history = focused?.history ?? [{ ...DEFAULT_ADJUSTMENTS }];
  const historyIndex = focused?.historyIndex ?? 0;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { undo: useCallback(undo, [undo]), redo: useCallback(redo, [redo]), canUndo, canRedo };
}
