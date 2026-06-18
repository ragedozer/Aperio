import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEditorStore } from "../../store/editorStore";
import styles from "./Canvas.module.css";

const MIN_VISIBLE = 80;

function clampOffset(
  ox: number, oy: number,
  wrapperW: number, wrapperH: number,
  imageW: number, imageH: number,
  scale: number
): { x: number; y: number } {
  const scaledW = imageW * scale;
  const scaledH = imageH * scale;
  const maxX = (scaledW + wrapperW) / 2 - MIN_VISIBLE;
  const maxY = (scaledH + wrapperH) / 2 - MIN_VISIBLE;
  return {
    x: Math.max(-maxX, Math.min(maxX, ox)),
    y: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { displayImage, originalImage, filePath, isProcessing } = useEditorStore();

  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const zoomRef = useRef(zoom);
  const fitScaleRef = useRef(fitScale);
  const offsetRef = useRef(offset);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { fitScaleRef.current = fitScale; }, [fitScale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !displayImage) return;
    canvas.width = displayImage.width;
    canvas.height = displayImage.height;
    canvas.getContext("2d")!.putImageData(displayImage, 0, 0);
  }, [displayImage]);

  const recomputeFit = useCallback(() => {
    if (!wrapperRef.current || !displayImage) return;
    const { clientWidth: cw, clientHeight: ch } = wrapperRef.current;
    setFitScale(Math.min(cw / displayImage.width, ch / displayImage.height));
  }, [displayImage]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(recomputeFit);
    obs.observe(el);
    recomputeFit();
    return () => obs.disconnect();
  }, [recomputeFit]);

  useEffect(() => {
    setZoom(null);
    setOffset({ x: 0, y: 0 });
  }, [originalImage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setZoom(null);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !displayImage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentScale = zoomRef.current ?? fitScaleRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.max(0.05, Math.min(currentScale * factor, 10));
      const ratio = newScale / currentScale;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const prev = offsetRef.current;
      const rawOffset = { x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
      setZoom(newScale);
      setOffset(clampOffset(rawOffset.x, rawOffset.y, rect.width, rect.height, displayImage.width, displayImage.height, newScale));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [displayImage]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!displayImage) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  }, [displayImage, offset]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !displayImage || !wrapperRef.current) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    const raw = { x: dragStart.current.ox + dx, y: dragStart.current.oy + dy };
    const scale = zoomRef.current ?? fitScaleRef.current;
    const { clientWidth: ww, clientHeight: wh } = wrapperRef.current;
    setOffset(clampOffset(raw.x, raw.y, ww, wh, displayImage.width, displayImage.height, scale));
  }, [displayImage]);

  const onPointerUp = useCallback(() => {
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  const effectiveScale = zoom ?? fitScale;

  return (
    <div
      ref={wrapperRef}
      className={styles.canvasWrapper}
      style={{ cursor: displayImage ? (isDragging ? "grabbing" : "grab") : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Processing sweep bar */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className={styles.processingBar}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 0.85 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{
              scaleX: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
            style={{ transformOrigin: "left center" }}
          />
        )}
      </AnimatePresence>

      {displayImage ? (
        <>
          {/* Entrance animation keyed to filePath — re-mounts on each new image */}
          <motion.div
            key={filePath ?? "canvas"}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            style={{ display: "contents" }}
          >
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${effectiveScale})`,
              }}
            />
          </motion.div>
          <span className={styles.zoomBadge}>
            {Math.round(effectiveScale * 100)}%
          </span>
        </>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Open an image to get started</p>
          <p className={styles.emptyHint}>Ctrl + O</p>
        </div>
      )}
    </div>
  );
}
