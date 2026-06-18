import { useCallback, useState } from "react";
import { useEditorStore } from "../store/editorStore";

export function useExport() {
  const { originalImage, adjustments, filePath } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!originalImage || isExporting) return;

    setIsExporting(true);

    try {
      const result = await new Promise<ImageData>((resolve, reject) => {
        const worker = new Worker(
          new URL("../lib/imageProcessor.worker.ts", import.meta.url),
          { type: "module" }
        );
        const copy = new Uint8ClampedArray(originalImage.data).buffer;
        worker.onmessage = (e) => {
          const { pixels, width, height } = e.data;
          resolve(new ImageData(new Uint8ClampedArray(pixels), width, height));
          worker.terminate();
        };
        worker.onerror = (e) => {
          reject(e);
          worker.terminate();
        };
        worker.postMessage(
          {
            pixels: copy,
            width: originalImage.width,
            height: originalImage.height,
            adjustments,
            requestId: 0,
          },
          [copy]
        );
      });

      const canvas = document.createElement("canvas");
      canvas.width = result.width;
      canvas.height = result.height;
      canvas.getContext("2d")!.putImageData(result, 0, 0);

      const baseName = filePath ?? "export";
      const stem = baseName.replace(/\.[^.]+$/, "");
      const downloadName = `${stem}-edited.png`;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
          "image/png"
        );
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [originalImage, adjustments, filePath, isExporting]);

  return { handleExport, isExporting };
}
