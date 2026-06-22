import { useCallback, useEffect, useRef, useState } from "react";
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

  const { undo, redo, resetAdjustments, setShowOriginal, addImage, clearImages } =
    useEditorStore();
  const { handleExport } = useExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openModeRef = useRef<"replace" | "append">("replace");
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

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

      addImage(original, preview, file.name);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [addImage]);

  const handleOpen = useCallback(() => {
    openModeRef.current = "replace";
    fileInputRef.current?.click();
  }, []);

  const handleAdd = useCallback(() => {
    openModeRef.current = "append";
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      if (openModeRef.current === "replace") clearImages();
      files.forEach(loadFile);
      e.target.value = "";
    },
    [loadFile, clearImages]
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      files.forEach(loadFile);
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
    <div
      className={styles.app}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onFileChange}
      />
      {/* Canvas fills the full background */}
      <Canvas />
      {/* Panels and toolbar float above */}
      <Toolbar onOpen={handleOpen} onAdd={handleAdd} />
      <LeftPanel />
      <RightPanel />
      {isDragOver && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropBox}>
            <span className="material-symbols-rounded" style={{ fontSize: 40 }}>add_photo_alternate</span>
            <span>Drop to add photos</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
