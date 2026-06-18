import { useCallback } from "react";
import { useEditorStore } from "../store/editorStore";

export function useHistory() {
  const { undo, redo, history, historyIndex } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { undo: useCallback(undo, [undo]), redo: useCallback(redo, [redo]), canUndo, canRedo };
}
