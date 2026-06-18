import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEditorStore } from "../../store/editorStore";
import { AdjustmentSlider } from "../Sliders/AdjustmentSlider";
import { Histogram } from "../Histogram/Histogram";
import { ADJUSTMENT_RANGES, Adjustments } from "../../types";
import styles from "./RightPanel.module.css";

const ADJUSTMENT_GROUPS: { label: string; keys: (keyof Adjustments)[] }[] = [
  {
    label: "Light",
    keys: ["exposure", "contrast", "highlights", "shadows", "whites", "blacks"],
  },
  {
    label: "Color",
    keys: ["saturation", "vibrance", "temperature", "tint"],
  },
  {
    label: "Detail",
    keys: ["sharpness", "noise", "vignette"],
  },
];

const GROUP_BASE_INDICES = ADJUSTMENT_GROUPS.reduce<number[]>((acc, _group, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + ADJUSTMENT_GROUPS[i - 1].keys.length);
  return acc;
}, []);

const LABELS: Record<string, string> = {
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

const sliderVariants = {
  hidden: { opacity: 0, y: 6 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 35, delay },
  }),
};

function AdjustmentSection({
  label,
  keys,
  baseIndex,
  adjustments,
  setAdjustment,
}: {
  label: string;
  keys: (keyof Adjustments)[];
  baseIndex: number;
  adjustments: Adjustments;
  setAdjustment: (key: keyof Adjustments, value: number) => void;
}) {
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>{label}</span>
      <div className={styles.groupSliders}>
        {keys.map((key, i) => (
          <motion.div
            key={key}
            custom={(baseIndex + i) * 0.03}
            variants={sliderVariants}
            initial="hidden"
            animate="show"
          >
            <AdjustmentSlider
              label={LABELS[key]}
              value={adjustments[key]}
              min={ADJUSTMENT_RANGES[key].min}
              max={ADJUSTMENT_RANGES[key].max}
              onChange={(v) => setAdjustment(key, v)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PresetsPanel() {
  const { presets, savePreset, applyPreset, deletePreset } = useEditorStore();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    savePreset(trimmed);
    setName("");
    inputRef.current?.focus();
  };

  const handleExportPresets = () => {
    const json = JSON.stringify(presets, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aperio-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string);
        if (Array.isArray(imported)) {
          const existingIds = new Set(presets.map((p) => p.id));
          const toAdd = imported.filter(
            (p) => p && typeof p.id === "string" && !existingIds.has(p.id)
          );
          useEditorStore.setState({ presets: [...presets, ...toAdd] });
        }
      } catch {
        // Bad file — ignore
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className={styles.presetsPanel}>
      <div className={styles.presetSaveRow}>
        <input
          ref={inputRef}
          className={styles.presetInput}
          placeholder="Preset name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          maxLength={40}
        />
        <motion.button
          whileTap={{ scale: 0.94 }}
          className={styles.presetSaveBtn}
          onClick={handleSave}
          disabled={!name.trim()}
        >
          Save
        </motion.button>
      </div>

      {presets.length === 0 ? (
        <p className={styles.presetEmpty}>No presets saved yet.</p>
      ) : (
        <ul className={styles.presetList}>
          {presets.map((preset) => (
            <li key={preset.id} className={styles.presetItem}>
              <span className={styles.presetName}>{preset.name}</span>
              <div className={styles.presetActions}>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  className={styles.presetApplyBtn}
                  onClick={() => applyPreset(preset.id)}
                >
                  Apply
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  className={styles.presetDeleteBtn}
                  onClick={() => deletePreset(preset.id)}
                  title="Delete preset"
                >
                  ×
                </motion.button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.presetFileRow}>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleImportPresets}
        />
        <motion.button
          whileTap={{ scale: 0.94 }}
          className={styles.presetFileBtn}
          onClick={() => importInputRef.current?.click()}
          title="Import presets from a .json file"
        >
          Import
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.94 }}
          className={styles.presetFileBtn}
          onClick={handleExportPresets}
          disabled={presets.length === 0}
          title="Export presets to a .json file"
        >
          Export
        </motion.button>
      </div>
    </div>
  );
}

// Chevron SVG — points down when expanded, up when collapsed
function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const COLLAPSED_H = 80; // handle (32px) + tabs row (48px)
const EXPANDED_H = "52vh";

export function RightPanel() {
  const { adjustments, setAdjustment, activePanel, setActivePanel } = useEditorStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches
  );
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) {
        setIsCollapsed(false);
        // Clear inline height Framer Motion set during mobile so CSS top/bottom takes over
        if (panelRef.current) panelRef.current.style.height = "";
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const motionProps = isMobile
    ? {
        initial: { height: EXPANDED_H },
        animate: { height: isCollapsed ? COLLAPSED_H : EXPANDED_H },
        transition: { type: "spring", stiffness: 380, damping: 38 },
      }
    : {
        initial: { x: 280 },
        animate: { x: 0 },
        transition: { type: "spring", stiffness: 300, damping: 30 },
      };

  return (
    <motion.aside key={isMobile ? "mobile" : "desktop"} ref={panelRef} className={styles.panel} {...motionProps}>
      {/* Collapse handle — visible on mobile only via CSS */}
      <button
        className={styles.handle}
        onClick={() => setIsCollapsed((c) => !c)}
        aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
      >
        <motion.span
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ display: "flex" }}
        >
          <Chevron />
        </motion.span>
      </button>

      <div className={styles.tabs}>
        {(["adjustments", "presets"] as const).map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.96 }}
            className={`${styles.tab} ${activePanel === tab ? styles.tabActive : ""}`}
            onClick={() => setActivePanel(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </motion.button>
        ))}
      </div>

      <div className={styles.content}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activePanel}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
          >
            {activePanel === "adjustments" &&
              ADJUSTMENT_GROUPS.map((group, gi) => (
                <AdjustmentSection
                  key={group.label}
                  label={group.label}
                  keys={group.keys}
                  baseIndex={GROUP_BASE_INDICES[gi]}
                  adjustments={adjustments}
                  setAdjustment={setAdjustment}
                />
              ))}

            {activePanel === "presets" && <PresetsPanel />}
          </motion.div>
        </AnimatePresence>
      </div>

      <Histogram />
    </motion.aside>
  );
}
