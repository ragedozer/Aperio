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

interface ToolbarProps {
  onOpen: () => void;
}

export function Toolbar({ onOpen }: ToolbarProps) {
  const { resetAdjustments, undo, redo, originalImage } = useEditorStore();
  const { handleExport, isExporting } = useExport();

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
        <motion.button {...tap} className={`${styles.btn} ${styles.btnOpen}`} onClick={onOpen} title="Open (Ctrl+O)">
          Open
        </motion.button>
        <motion.button
          {...tap}
          className={`${styles.btn} ${styles.btnExport}`}
          onClick={handleExport}
          disabled={!originalImage || isExporting}
          title="Export (Ctrl+E)"
        >
          {isExporting ? "Exporting…" : "Export"}
        </motion.button>
      </div>
    </header>
  );
}
