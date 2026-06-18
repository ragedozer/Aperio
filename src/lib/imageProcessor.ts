import { Adjustments } from "../types";
import { clamp } from "./colorUtils";

const PREVIEW_MAX_PX = 1200;

export function scaleForPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement
): ImageData {
  const { naturalWidth: w, naturalHeight: h } = image;
  const scale = Math.min(1, PREVIEW_MAX_PX / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function boxBlur(data: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const ni = (ny * w + nx) * 4;
            r += data[ni]; g += data[ni + 1]; b += data[ni + 2];
            count++;
          }
        }
      }
      const i = (y * w + x) * 4;
      out[i] = r / count;
      out[i + 1] = g / count;
      out[i + 2] = b / count;
      out[i + 3] = data[i + 3];
    }
  }
  return out;
}

export function applyAdjustments(
  source: ImageData,
  adjustments: Adjustments
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(source.data),
    source.width,
    source.height
  );
  const data = output.data;
  const w = output.width;
  const h = output.height;

  // Pre-compute flags to avoid property lookups in the inner loop
  const doExposure = adjustments.exposure !== 0;
  const doContrast = adjustments.contrast !== 0;
  const doTemp = adjustments.temperature !== 0;
  const doTint = adjustments.tint !== 0;
  const doHighlights = adjustments.highlights !== 0;
  const doShadows = adjustments.shadows !== 0;
  const doWhites = adjustments.whites !== 0;
  const doBlacks = adjustments.blacks !== 0;
  const doSaturation = adjustments.saturation !== 0;
  const doVibrance = adjustments.vibrance !== 0;
  const doNoise = adjustments.noise > 0;

  const exposureFactor = doExposure ? Math.pow(2, adjustments.exposure) : 1;
  const contrastF = doContrast
    ? (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast))
    : 1;
  const tempShift = doTemp ? (adjustments.temperature / 100) * 30 : 0;
  const tintShift = doTint ? (adjustments.tint / 100) * 15 : 0;
  const hlAmount = doHighlights ? (adjustments.highlights / 100) * 80 : 0;
  const shAmount = doShadows ? (adjustments.shadows / 100) * 80 : 0;
  const whAmount = doWhites ? (adjustments.whites / 100) * 60 : 0;
  const blAmount = doBlacks ? (adjustments.blacks / 100) * 60 : 0;
  const satS = doSaturation ? adjustments.saturation / 100 : 0;
  const noiseAmount = doNoise ? (adjustments.noise / 100) * 55 : 0;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (doExposure) {
      r = clamp(r * exposureFactor, 0, 255);
      g = clamp(g * exposureFactor, 0, 255);
      b = clamp(b * exposureFactor, 0, 255);
    }

    if (doContrast) {
      r = clamp(contrastF * (r - 128) + 128, 0, 255);
      g = clamp(contrastF * (g - 128) + 128, 0, 255);
      b = clamp(contrastF * (b - 128) + 128, 0, 255);
    }

    if (doTemp) {
      r = clamp(r + tempShift, 0, 255);
      b = clamp(b - tempShift, 0, 255);
    }
    if (doTint) {
      g = clamp(g + tintShift, 0, 255);
    }

    // Tone range adjustments — use luminance as the range weight
    if (doHighlights || doShadows || doWhites || doBlacks) {
      const lum01 = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      if (doHighlights) {
        // Quadratic weight: peaks at bright end, zero at black
        const w = lum01 * lum01;
        r = clamp(r + hlAmount * w, 0, 255);
        g = clamp(g + hlAmount * w, 0, 255);
        b = clamp(b + hlAmount * w, 0, 255);
      }

      if (doShadows) {
        // Quadratic weight: peaks at dark end, zero at white
        const w = (1 - lum01) * (1 - lum01);
        r = clamp(r + shAmount * w, 0, 255);
        g = clamp(g + shAmount * w, 0, 255);
        b = clamp(b + shAmount * w, 0, 255);
      }

      if (doWhites) {
        // Linear weight above midtone — white point adjustment
        const w = Math.max(0, lum01 - 0.5) * 2;
        r = clamp(r + whAmount * w, 0, 255);
        g = clamp(g + whAmount * w, 0, 255);
        b = clamp(b + whAmount * w, 0, 255);
      }

      if (doBlacks) {
        // Linear weight below midtone — black point adjustment
        const w = Math.max(0, 0.5 - lum01) * 2;
        r = clamp(r + blAmount * w, 0, 255);
        g = clamp(g + blAmount * w, 0, 255);
        b = clamp(b + blAmount * w, 0, 255);
      }
    }

    if (doSaturation) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(lum + (r - lum) * (1 + satS), 0, 255);
      g = clamp(lum + (g - lum) * (1 + satS), 0, 255);
      b = clamp(lum + (b - lum) * (1 + satS), 0, 255);
    }

    if (doVibrance) {
      // Vibrance: saturation boost that protects already-saturated pixels
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      // Approximate saturation 0-1; desaturated pixels get more boost
      const sat = max === 0 ? 0 : (max - min) / max;
      const v = (adjustments.vibrance / 100) * (1 - sat);
      r = clamp(lum + (r - lum) * (1 + v), 0, 255);
      g = clamp(lum + (g - lum) * (1 + v), 0, 255);
      b = clamp(lum + (b - lum) * (1 + v), 0, 255);
    }

    if (doNoise) {
      const grain = (Math.random() - 0.5) * 2 * noiseAmount;
      r = clamp(r + grain, 0, 255);
      g = clamp(g + grain, 0, 255);
      b = clamp(b + grain, 0, 255);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  // Sharpness — unsharp mask (needs neighbor access, done as a second pass)
  if (adjustments.sharpness > 0) {
    const amount = adjustments.sharpness / 100;
    const blurred = boxBlur(data, w, h);
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = clamp(data[i]     + amount * (data[i]     - blurred[i]),     0, 255);
      data[i + 1] = clamp(data[i + 1] + amount * (data[i + 1] - blurred[i + 1]), 0, 255);
      data[i + 2] = clamp(data[i + 2] + amount * (data[i + 2] - blurred[i + 2]), 0, 255);
    }
  }

  // Vignette — radial darkening/lightening from center
  if (adjustments.vignette !== 0) {
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const strength = adjustments.vignette / 100;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        // negative strength darkens edges (classic vignette)
        const factor = 1 + strength * dist * dist;
        data[i]     = clamp(data[i]     * factor, 0, 255);
        data[i + 1] = clamp(data[i + 1] * factor, 0, 255);
        data[i + 2] = clamp(data[i + 2] * factor, 0, 255);
      }
    }
  }

  return output;
}
