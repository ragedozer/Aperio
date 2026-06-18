import { useCallback, useEffect, useRef } from "react";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { LeftPanel } from "./components/Sidebar/LeftPanel";
import { Canvas } from "./components/Canvas/Canvas";
import { RightPanel } from "./components/Sidebar/RightPanel";
import { useImageProcessor } from "./hooks/useImageProcessor";
import { useExport } from "./hooks/useExport";
import { usePresetPersistence } from "./hooks/usePresetPersistence";
import { useEditorStore } from "./store/editorStore";
import { scaleForPreview } from "./lib/imageProcessor";
import styles from "./App.module.css";

function AppInner() {
  useImageProcessor();
  usePresetPersistence();

  const { undo, redo, resetAdjustments, setShowOriginal, setOriginalImage } =
    useEditorStore();
  const { handleExport } = useExport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = img.naturalWidth;
      fullCanvas.height = img.naturalHeight;
      fullCanvas.getContext("2d")!.drawImage(img, 0, 0);
      const original = fullCanvas
        .getContext("2d")!
        .getImageData(0, 0, fullCanvas.width, fullCanvas.height);

      const previewCanvas = document.createElement("canvas");
      const preview = scaleForPreview(previewCanvas, img);

      setOriginalImage(original, preview, file.name);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [setOriginalImage]);

  const handleOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
      e.target.value = "";
    },
    [loadFile]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "o") { e.preventDefault(); handleOpen(); }
      if (mod && e.key === "e") { e.preventDefault(); handleExport(); }
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if (mod && e.shiftKey && e.key === "R") { e.preventDefault(); resetAdjustments(); }
      if (e.key === "`") setShowOriginal(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "`") setShowOriginal(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleOpen, handleExport, undo, redo, resetAdjustments, setShowOriginal]);

  return (
    <div className={styles.app}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onFileChange}
      />
      {/* Canvas fills the full background */}
      <Canvas />
      {/* Panels and toolbar float above */}
      <Toolbar onOpen={handleOpen} />
      <LeftPanel />
      <RightPanel />
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
