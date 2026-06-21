export interface Adjustments {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  saturation: number;
  vibrance: number;
  temperature: number;
  tint: number;
  sharpness: number;
  noise: number;
  vignette: number;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
  sharpness: 0,
  noise: 0,
  vignette: 0,
};

export const ADJUSTMENT_RANGES: Record<
  keyof Adjustments,
  { min: number; max: number }
> = {
  exposure: { min: -3.0, max: 3.0 },
  contrast: { min: -100, max: 100 },
  highlights: { min: -100, max: 100 },
  shadows: { min: -100, max: 100 },
  whites: { min: -100, max: 100 },
  blacks: { min: -100, max: 100 },
  saturation: { min: -100, max: 100 },
  vibrance: { min: -100, max: 100 },
  temperature: { min: -100, max: 100 },
  tint: { min: -100, max: 100 },
  sharpness: { min: 0, max: 100 },
  noise: { min: 0, max: 100 },
  vignette: { min: -100, max: 100 },
};

export interface Preset {
  id: string;
  name: string;
  adjustments: Adjustments;
  createdAt: number;
}

export interface ImageRecord {
  id: string;
  filePath: string;
  originalImage: ImageData;
  previewImage: ImageData;
  displayImage: ImageData | null;
  adjustments: Adjustments;
  history: Adjustments[];
  historyIndex: number;
}

export type ActivePanel = "adjustments" | "presets";
