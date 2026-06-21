import { useEffect, useRef } from "react";
import { useEditorStore, selectFocusedImage } from "../../store/editorStore";
import styles from "./Histogram.module.css";

function drawChannel(
  ctx: CanvasRenderingContext2D,
  counts: Uint32Array,
  max: number,
  W: number,
  H: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * W;
    const y = H - (counts[i] / max) * H;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

export function Histogram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focused = useEditorStore(selectFocusedImage);
  const source = focused?.displayImage ?? focused?.previewImage ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const r = new Uint32Array(256);
    const g = new Uint32Array(256);
    const b = new Uint32Array(256);
    const lum = new Uint32Array(256);

    const data = source.data;
    for (let i = 0; i < data.length; i += 4) {
      r[data[i]]++;
      g[data[i + 1]]++;
      b[data[i + 2]]++;
      lum[Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])]++;
    }

    const max = Math.max(...r, ...g, ...b);

    ctx.clearRect(0, 0, W, H);

    // Screen blending: R+G=yellow, R+B=magenta, G+B=cyan, R+G+B=white
    ctx.globalCompositeOperation = "screen";
    drawChannel(ctx, r,   max, W, H, "rgba(220,60,60,0.85)");
    drawChannel(ctx, g,   max, W, H, "rgba(60,200,60,0.85)");
    drawChannel(ctx, b,   max, W, H, "rgba(60,100,255,0.85)");

    // Luminance on top in normal mode as a white overlay
    ctx.globalCompositeOperation = "source-over";
    drawChannel(ctx, lum, max, W, H, "rgba(255,255,255,0.15)");

    ctx.globalCompositeOperation = "source-over";
  }, [source]);

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Histogram</span>
      <canvas
        ref={canvasRef}
        width={248}
        height={60}
        className={styles.canvas}
      />
    </div>
  );
}
