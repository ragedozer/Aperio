import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEditorStore, selectFocusedImage } from "../../store/editorStore";
import { ImageRecord } from "../../types";
import styles from "./Canvas.module.css";

// ─── Single-image view (pan / zoom) ────────────────────────────────────────

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

function SingleImageView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focused = useEditorStore(selectFocusedImage);
  const displayImage = focused?.displayImage ?? null;
  const filePath = focused?.filePath ?? null;

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
  const lastTapTime = useRef(0);
  const pinchStart = useRef<{ dist: number; scale: number; ox: number; oy: number; mx: number; my: number } | null>(null);

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
  }, [focused?.id]);

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
    if (!displayImage || e.pointerType === "touch") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  }, [displayImage, offset]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current || !displayImage || !wrapperRef.current || e.pointerType === "touch") return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    const raw = { x: dragStart.current.ox + dx, y: dragStart.current.oy + dy };
    const scale = zoomRef.current ?? fitScaleRef.current;
    const { clientWidth: ww, clientHeight: wh } = wrapperRef.current;
    setOffset(clampOffset(raw.x, raw.y, ww, wh, displayImage.width, displayImage.height, scale));
  }, [displayImage]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !displayImage) return;
    const img = displayImage;

    function getTouchDist(t: TouchList) {
      const dx = t[1].clientX - t[0].clientX;
      const dy = t[1].clientY - t[0].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime.current < 300) {
          setZoom(null);
          setOffset({ x: 0, y: 0 });
        }
        lastTapTime.current = now;
        dragStart.current = { px: e.touches[0].clientX, py: e.touches[0].clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
        pinchStart.current = null;
        setIsDragging(true);
      } else if (e.touches.length === 2) {
        dragStart.current = null;
        const dist = getTouchDist(e.touches);
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchStart.current = { dist, scale: zoomRef.current ?? fitScaleRef.current, ox: offsetRef.current.x, oy: offsetRef.current.y, mx, my };
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (e.touches.length === 1 && dragStart.current) {
        const dx = e.touches[0].clientX - dragStart.current.px;
        const dy = e.touches[0].clientY - dragStart.current.py;
        const raw = { x: dragStart.current.ox + dx, y: dragStart.current.oy + dy };
        const scale = zoomRef.current ?? fitScaleRef.current;
        setOffset(clampOffset(raw.x, raw.y, rect.width, rect.height, img.width, img.height, scale));
      } else if (e.touches.length === 2 && pinchStart.current) {
        const dist = getTouchDist(e.touches);
        const ratio = dist / pinchStart.current.dist;
        const newScale = Math.max(0.05, Math.min(pinchStart.current.scale * ratio, 10));
        const scaleRatio = newScale / pinchStart.current.scale;
        const cx = pinchStart.current.mx - rect.left - rect.width / 2;
        const cy = pinchStart.current.my - rect.top - rect.height / 2;
        const rawOffset = { x: cx - (cx - pinchStart.current.ox) * scaleRatio, y: cy - (cy - pinchStart.current.oy) * scaleRatio };
        setZoom(newScale);
        setOffset(clampOffset(rawOffset.x, rawOffset.y, rect.width, rect.height, img.width, img.height, newScale));
      }
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 0) {
        dragStart.current = null;
        pinchStart.current = null;
        setIsDragging(false);
      } else if (e.touches.length === 1) {
        pinchStart.current = null;
        dragStart.current = { px: e.touches[0].clientX, py: e.touches[0].clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [displayImage]);

  const effectiveScale = zoom ?? fitScale;

  return (
    <div
      ref={wrapperRef}
      className={styles.singleView}
      style={{ cursor: displayImage ? (isDragging ? "grabbing" : "grab") : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {displayImage && (
        <>
          <motion.div
            key={filePath ?? "canvas"}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${effectiveScale})` }}
            />
          </motion.div>
          <span className={styles.zoomBadge}>{Math.round(effectiveScale * 100)}%</span>
        </>
      )}
    </div>
  );
}

// ─── Grid view ──────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 8;
const TOUCH_PAN_THRESHOLD = 8;

// Draw the preview image at its natural dimensions (no rescaling)
function drawImage(canvas: HTMLCanvasElement, src: ImageData) {
  canvas.width = src.width;
  canvas.height = src.height;
  canvas.getContext("2d")!.putImageData(src, 0, 0);
}

// Scaled-down version used only for the drag ghost overlay
function drawGhost(canvas: HTMLCanvasElement, src: ImageData) {
  const scale = Math.min(180 / src.height, 300 / src.width);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  canvas.width = w;
  canvas.height = h;
  const tmp = document.createElement("canvas");
  tmp.width = src.width;
  tmp.height = src.height;
  tmp.getContext("2d")!.putImageData(src, 0, 0);
  canvas.getContext("2d")!.drawImage(tmp, 0, 0, w, h);
}

function ImageTile({
  image,
  isSelected,
  isDragging,
  isDropTarget,
  onSelect,
  onDragStart,
}: {
  image: ImageRecord;
  isSelected: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onDragStart: (id: string, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointerTypeRef = useRef<string>("mouse");

  useEffect(() => {
    const canvas = canvasRef.current;
    const src = image.displayImage ?? image.previewImage;
    if (!canvas || !src) return;
    drawImage(canvas, src);
  }, [image.displayImage, image.previewImage]);

  const name = image.filePath.split(/[/\\]/).pop() ?? image.filePath;

  const cls = [
    styles.tile,
    isSelected ? styles.tileSelected : "",
    isDragging ? styles.tileDragging : "",
    isDropTarget ? styles.tileDropTarget : "",
  ].join(" ");

  return (
    <motion.div
      data-tile-id={image.id}
      className={cls}
      onPointerUp={(e) => { lastPointerTypeRef.current = e.pointerType; }}
      onClick={(e) => onSelect(image.id, e.ctrlKey || e.metaKey || e.shiftKey || lastPointerTypeRef.current === "touch")}
      onPointerDown={(e) => onDragStart(image.id, e.clientX, e.clientY)}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: isDragging ? 0.35 : 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <div className={styles.tileImgWrap}>
        <canvas ref={canvasRef} className={styles.tileCanvas} />
        <span className={styles.tileLabel}>{name}</span>
        {isSelected && !isDragging && (
          <div className={styles.tileCheck}>
            <span className="material-symbols-rounded">check_circle</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DragGhost({ image, x, y }: { image: ImageRecord; x: number; y: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const src = image.displayImage ?? image.previewImage;
    if (!canvas || !src) return;
    drawGhost(canvas, src);
  }, [image.displayImage, image.previewImage]);

  return (
    <div className={styles.dragGhost} style={{ left: x, top: y }}>
      <canvas ref={canvasRef} className={styles.tileCanvas} />
    </div>
  );
}

interface DragState {
  fromId: string;
  dropId: string | null;
  x: number;
  y: number;
}

function GridView({
  images,
  selectedImageIds,
  onSelect,
  onReorder,
}: {
  images: ImageRecord[];
  selectedImageIds: string[];
  onSelect: (id: string, additive: boolean) => void;
  onReorder: (fromId: string, toId: string) => void;
}) {
  // ─── Pan / zoom ─────────────────────────────────────────────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const zoomRef = useRef(zoom);
  const fitScaleRef = useRef(fitScale);
  const offsetRef = useRef(offset);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { fitScaleRef.current = fitScale; }, [fitScale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const recomputeFit = useCallback(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    const ww = wrapper.clientWidth;
    const wh = wrapper.clientHeight;
    const gw = content.offsetWidth;
    const gh = content.offsetHeight;
    if (!gw || !gh) return;
    setFitScale(Math.min(ww / gw, wh / gh, 1));
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    const obs = new ResizeObserver(recomputeFit);
    obs.observe(wrapper);
    obs.observe(content);
    recomputeFit();
    return () => obs.disconnect();
  }, [recomputeFit]);

  // Reset view when the image set changes
  useEffect(() => {
    setZoom(null);
    setOffset({ x: 0, y: 0 });
  }, [images.length]);

  // Wheel zoom toward cursor
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = zoomRef.current ?? fitScaleRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.max(0.05, Math.min(current * factor, 10));
      const ratio = newScale / current;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const prev = offsetRef.current;
      setZoom(newScale);
      setOffset({ x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Space = fit / reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setZoom(null); setOffset({ x: 0, y: 0 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Touch pan + pinch zoom
  const lastTapTime = useRef(0);
  const pinchStart = useRef<{ dist: number; scale: number; ox: number; oy: number; mx: number; my: number } | null>(null);
  const touchPanStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const touchMovedRef = useRef(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    function tdist(t: TouchList) {
      const dx = t[1].clientX - t[0].clientX, dy = t[1].clientY - t[0].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        // Do NOT preventDefault — lets native click fire for tile selection
        touchMovedRef.current = false;
        const onEmpty = !(e.target as HTMLElement).closest("[data-tile-id]");
        if (onEmpty) {
          const now = Date.now();
          if (now - lastTapTime.current < 300) { setZoom(null); setOffset({ x: 0, y: 0 }); }
          lastTapTime.current = now;
        }
        touchPanStart.current = { px: e.touches[0].clientX, py: e.touches[0].clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
        pinchStart.current = null;
      } else if (e.touches.length === 2) {
        e.preventDefault();
        touchPanStart.current = null;
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        pinchStart.current = { dist: tdist(e.touches), scale: zoomRef.current ?? fitScaleRef.current, ox: offsetRef.current.x, oy: offsetRef.current.y, mx, my };
      }
    }
    function onTouchMove(e: TouchEvent) {
      if (!el) return;
      if (e.touches.length === 1 && touchPanStart.current) {
        const dx = e.touches[0].clientX - touchPanStart.current.px;
        const dy = e.touches[0].clientY - touchPanStart.current.py;
        if (!touchMovedRef.current && Math.sqrt(dx * dx + dy * dy) < TOUCH_PAN_THRESHOLD) return;
        touchMovedRef.current = true;
        e.preventDefault(); // only prevent scroll once we're actually panning
        setOffset({ x: touchPanStart.current.ox + dx, y: touchPanStart.current.oy + dy });
      } else if (e.touches.length === 2 && pinchStart.current) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const ratio = tdist(e.touches) / pinchStart.current.dist;
        const newScale = Math.max(0.05, Math.min(pinchStart.current.scale * ratio, 10));
        const sr = newScale / pinchStart.current.scale;
        const cx = pinchStart.current.mx - rect.left - rect.width / 2;
        const cy = pinchStart.current.my - rect.top - rect.height / 2;
        setZoom(newScale);
        setOffset({ x: cx - (cx - pinchStart.current.ox) * sr, y: cy - (cy - pinchStart.current.oy) * sr });
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length === 0) { touchPanStart.current = null; pinchStart.current = null; }
      else if (e.touches.length === 1) { pinchStart.current = null; touchPanStart.current = { px: e.touches[0].clientX, py: e.touches[0].clientY, ox: offsetRef.current.x, oy: offsetRef.current.y }; }
    }
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => { el.removeEventListener("touchstart", onTouchStart); el.removeEventListener("touchmove", onTouchMove); el.removeEventListener("touchend", onTouchEnd); };
  }, []);

  // ─── Tile drag-to-reorder ───────────────────────────────────────────────
  const [drag, setDrag] = useState<DragState | null>(null);
  const pendingRef = useRef<{ fromId: string; startX: number; startY: number } | null>(null);
  const suppressClickRef = useRef(false);
  const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const handleDragStart = useCallback((fromId: string, x: number, y: number) => {
    pendingRef.current = { fromId, startX: x, startY: y };
  }, []);

  const handleSelect = useCallback((id: string, additive: boolean) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    onSelect(id, additive);
  }, [onSelect]);

  const findDropId = useCallback((x: number, y: number, fromId: string): string | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const tile = (el as HTMLElement).closest?.("[data-tile-id]") as HTMLElement | null;
      if (tile) { const id = tile.getAttribute("data-tile-id"); if (id && id !== fromId) return id; }
    }
    return null;
  }, []);

  // Unified pointer move: tile reorder takes priority, otherwise pan
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const pending = pendingRef.current;
    if (pending) {
      const dx = e.clientX - pending.startX, dy = e.clientY - pending.startY;
      if (!drag && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
      setDrag({ fromId: pending.fromId, dropId: findDropId(e.clientX, e.clientY, pending.fromId), x: e.clientX, y: e.clientY });
      return;
    }
    if (panStart.current) {
      setOffset({ x: panStart.current.ox + e.clientX - panStart.current.px, y: panStart.current.oy + e.clientY - panStart.current.py });
    }
  }, [drag, findDropId]);

  // Wrapper pointerdown: only pan if no tile drag is pending (tile fires first)
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    if (pendingRef.current) return; // tile drag takes priority
    e.currentTarget.setPointerCapture(e.pointerId);
    panStart.current = { px: e.clientX, py: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    setIsPanning(true);
  }, []);

  const onPointerUp = useCallback(() => {
    if (drag) {
      if (drag.dropId) onReorder(drag.fromId, drag.dropId);
      suppressClickRef.current = true;
    }
    setDrag(null);
    pendingRef.current = null;
    panStart.current = null;
    setIsPanning(false);
  }, [drag, onReorder]);

  const effectiveScale = zoom ?? fitScale;
  const cols = Math.ceil(Math.sqrt(images.length));
  const draggingImage = drag ? images.find((img) => img.id === drag.fromId) : null;

  return (
    <div
      ref={wrapperRef}
      className={styles.gridWrapper}
      style={{ cursor: drag || isPanning ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        ref={contentRef}
        className={styles.gridContent}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${effectiveScale})` }}
      >
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}>
          {images.map((img) => (
            <ImageTile
              key={img.id}
              image={img}
              isSelected={selectedImageIds.includes(img.id)}
              isDragging={drag?.fromId === img.id}
              isDropTarget={drag?.dropId === img.id}
              onSelect={handleSelect}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      </div>

      {drag && draggingImage && (
        <DragGhost image={draggingImage} x={drag.x} y={drag.y} />
      )}

      <span className={styles.zoomBadge}>{Math.round(effectiveScale * 100)}%</span>
    </div>
  );
}

// ─── Floating action chip ───────────────────────────────────────────────────

function ActionChip() {
  const { images, selectedImageIds, copiedAdjustments, removeImages, copyAdjustments, pasteAdjustments, bottomSheetCollapsed } =
    useEditorStore();

  if (images.length <= 1 || selectedImageIds.length === 0) return null;

  return createPortal(
    <AnimatePresence>
      <div className={`${styles.chipRow} ${bottomSheetCollapsed ? styles.chipRowCollapsed : ""}`}>
        <motion.div
          className={styles.chip}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <button
            className={`${styles.chipBtn} ${styles.chipBtnDanger}`}
            onClick={() => removeImages(selectedImageIds)}
            title="Remove selected"
          >
            <span className="material-symbols-rounded">delete</span>
            Remove
          </button>
          <div className={styles.chipDivider} />
          <button className={styles.chipBtn} onClick={copyAdjustments} title="Copy edit settings">
            <span className="material-symbols-rounded">copy_all</span>
            Copy Settings
          </button>
          {copiedAdjustments && (
            <button className={styles.chipBtn} onClick={pasteAdjustments} title="Paste edit settings">
              <span className="material-symbols-rounded">content_paste</span>
              Paste
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Root Canvas component ──────────────────────────────────────────────────

export function Canvas() {
  const images = useEditorStore((s) => s.images);
  const selectedImageIds = useEditorStore((s) => s.selectedImageIds);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const { selectImage, reorderImages } = useEditorStore();

  return (
    <div className={styles.canvasWrapper}>
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

      {images.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Open an image to get started</p>
          <p className={styles.emptyHint}>Ctrl + O</p>
        </div>
      )}

      {images.length === 1 && <SingleImageView />}

      {images.length > 1 && (
        <GridView
          images={images}
          selectedImageIds={selectedImageIds}
          onSelect={selectImage}
          onReorder={reorderImages}
        />
      )}

      <ActionChip />
    </div>
  );
}
