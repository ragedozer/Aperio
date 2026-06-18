/// <reference lib="webworker" />

import { applyAdjustments } from "./imageProcessor";
import type { Adjustments } from "../types";

interface WorkerInput {
  pixels: ArrayBuffer;
  width: number;
  height: number;
  adjustments: Adjustments;
  requestId: number;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { pixels, width, height, adjustments, requestId } = e.data;
  const source = new ImageData(new Uint8ClampedArray(pixels), width, height);
  const result = applyAdjustments(source, adjustments);
  self.postMessage(
    { pixels: result.data.buffer, width, height, requestId },
    [result.data.buffer]
  );
};
