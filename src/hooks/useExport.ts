import { useCallback, useState } from "react";
import { ImageRecord } from "../types";
import { useEditorStore } from "../store/editorStore";

async function exportOne(img: ImageRecord): Promise<void> {
  const result = await new Promise<ImageData>((resolve, reject) => {
    const worker = new Worker(
      new URL("../lib/imageProcessor.worker.ts", import.meta.url),
      { type: "module" }
    );
    const copy = new Uint8ClampedArray(img.originalImage.data).buffer;
    worker.onmessage = (e) => {
      const { pixels, width, height } = e.data;
      resolve(new ImageData(new Uint8ClampedArray(pixels), width, height));
      worker.terminate();
    };
    worker.onerror = (e) => { reject(e); worker.terminate(); };
    worker.postMessage(
      { pixels: copy, width: img.originalImage.width, height: img.originalImage.height, adjustments: img.adjustments, requestId: 0 },
      [copy]
    );
  });

  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  canvas.getContext("2d")!.putImageData(result, 0, 0);

  const stem = img.filePath.replace(/\.[^.]+$/, "");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
      "image/png"
    );
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stem}-edited.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExport() {
  const { images, selectedImageIds } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);

  // "selected" exports only selected images; "all" exports every image on the canvas
  const handleExport = useCallback(
    async (mode: "selected" | "all" = "selected") => {
      if (isExporting || images.length === 0) return;
      setIsExporting(true);
      try {
        const toExport =
          mode === "all"
            ? images
            : images.filter((img) => selectedImageIds.includes(img.id));
        for (const img of toExport) {
          await exportOne(img);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [images, selectedImageIds, isExporting]
  );

  return { handleExport, isExporting };
}
