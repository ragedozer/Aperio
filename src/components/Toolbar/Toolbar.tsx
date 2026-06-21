import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import logoSrc from "../../../graphics/Aperio_Logo_W.svg";
import { useEditorStore } from "../../store/editorStore";
import { useExport } from "../../hooks/useExport";
import styles from "./Toolbar.module.css";

const tap = { whileTap: { scale: 0.92 } } as const;

function Icon({ name }: { name: string }) {
  return (
    <span className={`material-symbols-rounded ${styles.icon}`}>{name}</span>
  );
}

function ExportButton() {
  const { images, selectedImageIds } = useEditorStore();
  const { handleExport, isExporting } = useExport();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasImages = images.length > 0;
  const multiImage = images.length > 1;

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Single image — plain export button, no dropdown
  if (!multiImage) {
    return (
      <motion.button
        {...tap}
        className={`${styles.btn} ${styles.btnExport}`}
        onClick={() => handleExport("selected")}
        disabled={!hasImages || isExporting}
        title="Export (Ctrl+E)"
      >
        {isExporting ? "Exporting…" : "Export"}
      </motion.button>
    );
  }

  // Multiple images — dropdown
  return (
    <div ref={wrapRef} className={styles.exportWrap}>
      <motion.button
        {...tap}
        className={`${styles.btn} ${styles.btnExport} ${open ? styles.btnExportOpen : ""}`}
        onClick={() => !isExporting && setOpen((o) => !o)}
        disabled={!hasImages || isExporting}
        title="Export options"
      >
        {isExporting ? (
          "Exporting…"
        ) : (
          <>Export <Icon name="expand_more" /></>
        )}
      </motion.button>

      {open && (
        <div className={styles.exportMenu}>
          <button
            className={styles.exportMenuItem}
            disabled={selectedImageIds.length === 0}
            onClick={() => { handleExport("selected"); setOpen(false); }}
          >
            <span className="material-symbols-rounded">photo</span>
            Export Selected
            <span className={styles.exportCount}>{selectedImageIds.length}</span>
          </button>
          <button
            className={styles.exportMenuItem}
            onClick={() => { handleExport("all"); setOpen(false); }}
          >
            <span className="material-symbols-rounded">photo_library</span>
            Export All
            <span className={styles.exportCount}>{images.length}</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface ToolbarProps {
  onOpen: () => void;
  onAdd: () => void;
}

export function Toolbar({ onOpen, onAdd }: ToolbarProps) {
  const { resetAdjustments, undo, redo, images } = useEditorStore();
  const hasImages = images.length > 0;

  return (
    <header className={styles.toolbar}>
      <img src={logoSrc} alt="Aperio" className={styles.logo} />

      <div className={styles.btnRow}>
        <motion.button {...tap} className={`${styles.btn} ${styles.btnDefault}`} onClick={undo} title="Undo (Ctrl+Z)">
          <Icon name="undo" /> Undo
        </motion.button>
        <motion.button {...tap} className={`${styles.btn} ${styles.btnDefault}`} onClick={redo} title="Redo (Ctrl+Shift+Z)">
          <Icon name="redo" /> Redo
        </motion.button>
        <motion.button {...tap} className={`${styles.btn} ${styles.btnDefault}`} onClick={resetAdjustments} title="Reset (Ctrl+Shift+R)">
          <Icon name="restart_alt" /> Reset
        </motion.button>
        {/* Forces Open/Add/Export onto a second row on mobile */}
        <div className={styles.rowBreak} aria-hidden />
        <motion.button {...tap} className={`${styles.btn} ${styles.btnOpen}`} onClick={onOpen} title="Open image(s) — replaces canvas (Ctrl+O)">
          Open
        </motion.button>
        {hasImages && (
          <motion.button {...tap} className={`${styles.btn} ${styles.btnAdd}`} onClick={onAdd} title="Add more images to canvas">
            <Icon name="add" /> Add
          </motion.button>
        )}
        <ExportButton />
      </div>
    </header>
  );
}
