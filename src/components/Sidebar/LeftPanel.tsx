import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useEditorStore } from "../../store/editorStore";
import { Adjustments, DEFAULT_ADJUSTMENTS } from "../../types";
import styles from "./LeftPanel.module.css";

const LABELS: Record<keyof Adjustments, string> = {
  exposure: "Exposure",
  contrast: "Contrast",
  highlights: "Highlights",
  shadows: "Shadows",
  whites: "Whites",
  blacks: "Blacks",
  saturation: "Saturation",
  vibrance: "Vibrance",
  temperature: "Temp",
  tint: "Tint",
  sharpness: "Sharpness",
  noise: "Grain",
  vignette: "Vignette",
};

function formatValue(key: keyof Adjustments, value: number): string {
  if (key === "exposure") {
    return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
  }
  return value >= 0 ? `+${Math.round(value)}` : `${Math.round(value)}`;
}

function getHistoryLabel(
  current: Adjustments,
  prev: Adjustments | undefined
): string {
  if (!prev) return "Original";

  const keys = Object.keys(current) as (keyof Adjustments)[];
  const changed = keys.filter((k) => current[k] !== prev[k]);

  if (changed.length === 0) return "No change";
  if (changed.length === 1) {
    const k = changed[0];
    return `${LABELS[k]} ${formatValue(k, current[k])}`;
  }

  const isReset = keys.every((k) => current[k] === DEFAULT_ADJUSTMENTS[k]);
  return isReset ? "Reset" : "Preset applied";
}

export function LeftPanel() {
  const { history, historyIndex, jumpToHistory } = useEditorStore();

  // Track which index just became active so we can flash it
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const prevHistoryIndex = useRef(historyIndex);

  useEffect(() => {
    if (historyIndex !== prevHistoryIndex.current) {
      prevHistoryIndex.current = historyIndex;
      setFlashIdx(historyIndex);
      const t = setTimeout(() => setFlashIdx(null), 450);
      return () => clearTimeout(t);
    }
  }, [historyIndex]);

  return (
    <motion.aside
      className={styles.panel}
      initial={{ x: -240 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={styles.section}>
        <span className={styles.sectionLabel}>History</span>
        {history.length <= 1 ? (
          <p className={styles.placeholder}>No edits yet</p>
        ) : (
          <ul className={styles.historyList}>
            <AnimatePresence initial={false}>
              {history.map((entry, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    backgroundColor:
                      flashIdx === idx
                        ? ["rgba(123,97,255,0.25)", "rgba(123,97,255,0.08)"]
                        : idx === historyIndex
                        ? "rgba(123,97,255,0.08)"
                        : "rgba(0,0,0,0)",
                  }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  whileTap={{ scale: 0.97 }}
                  className={`${styles.historyItem} ${idx === historyIndex ? styles.historyItemActive : ""}`}
                  onClick={() => jumpToHistory(idx)}
                >
                  {getHistoryLabel(entry, history[idx - 1])}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </motion.aside>
  );
}
