import { useEffect, useRef } from "react";
import { Adjustments } from "../types";
import { useEditorStore } from "../store/editorStore";

interface WorkerResponse {
  pixels: ArrayBuffer;
  width: number;
  height: number;
  requestId: number;
}

interface ImageSnapshot {
  adjustments: Adjustments;
  previewImage: ImageData;
  showOriginal: boolean;
}

export function useImageProcessor() {
  const { images, showOriginal, setDisplayImage, setIsProcessing } = useEditorStore();

  const workersRef = useRef<Map<string, Worker>>(new Map());
  const requestsRef = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Track what we last submitted for each image to avoid reprocessing on displayImage-only changes
  const prevRef = useRef<Map<string, ImageSnapshot>>(new Map());
  const processingCountRef = useRef(0);

  // Create / destroy workers as images are added or removed
  useEffect(() => {
    const currentIds = new Set(images.map((img) => img.id));

    for (const [id, worker] of workersRef.current) {
      if (!currentIds.has(id)) {
        worker.terminate();
        workersRef.current.delete(id);
        requestsRef.current.delete(id);
        prevRef.current.delete(id);
        const t = timersRef.current.get(id);
        if (t) { clearTimeout(t); timersRef.current.delete(id); }
      }
    }

    for (const img of images) {
      if (!workersRef.current.has(img.id)) {
        const worker = new Worker(
          new URL("../lib/imageProcessor.worker.ts", import.meta.url),
          { type: "module" }
        );
        workersRef.current.set(img.id, worker);
        requestsRef.current.set(img.id, 0);
      }
    }
  }, [images]);

  // Process each image whose inputs changed
  useEffect(() => {
    for (const img of images) {
      const worker = workersRef.current.get(img.id);
      if (!worker) continue;

      const prev = prevRef.current.get(img.id);
      const adjChanged = !prev || prev.adjustments !== img.adjustments;
      const previewChanged = !prev || prev.previewImage !== img.previewImage;
      const showOriginalChanged = !prev || prev.showOriginal !== showOriginal;

      if (!adjChanged && !previewChanged && !showOriginalChanged) continue;

      // Record snapshot now so displayImage-only changes don't re-trigger
      prevRef.current.set(img.id, {
        adjustments: img.adjustments,
        previewImage: img.previewImage,
        showOriginal,
      });

      if (showOriginal) {
        setDisplayImage(img.id, img.previewImage);
        continue;
      }

      // Cancel any pending timer for this image
      const existing = timersRef.current.get(img.id);
      if (existing) clearTimeout(existing);

      const capturedImg = img;
      const timer = setTimeout(() => {
        timersRef.current.delete(capturedImg.id);
        const requestId = (requestsRef.current.get(capturedImg.id) ?? 0) + 1;
        requestsRef.current.set(capturedImg.id, requestId);

        processingCountRef.current += 1;
        if (processingCountRef.current === 1) setIsProcessing(true);

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.requestId !== requestId) return;
          const { pixels, width, height } = e.data;
          setDisplayImage(capturedImg.id, new ImageData(new Uint8ClampedArray(pixels), width, height));
          processingCountRef.current -= 1;
          if (processingCountRef.current === 0) setIsProcessing(false);
        };

        const copy = new Uint8ClampedArray(capturedImg.previewImage.data).buffer;
        worker.postMessage(
          {
            pixels: copy,
            width: capturedImg.previewImage.width,
            height: capturedImg.previewImage.height,
            adjustments: capturedImg.adjustments,
            requestId,
          },
          [copy]
        );
      }, 16);

      timersRef.current.set(img.id, timer);
    }
  }, [images, showOriginal, setDisplayImage, setIsProcessing]);

  // Terminate all workers on unmount
  useEffect(() => {
    return () => {
      for (const worker of workersRef.current.values()) worker.terminate();
      for (const t of timersRef.current.values()) clearTimeout(t);
    };
  }, []);
}
