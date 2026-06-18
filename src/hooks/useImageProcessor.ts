import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/editorStore";

interface WorkerResponse {
  pixels: ArrayBuffer;
  width: number;
  height: number;
  requestId: number;
}

export function useImageProcessor() {
  const {
    previewImage,
    adjustments,
    showOriginal,
    setDisplayImage,
    setIsProcessing,
  } = useEditorStore();

  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL("../lib/imageProcessor.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!previewImage) {
      setDisplayImage(null);
      return;
    }

    // Show the unprocessed preview when backtick is held
    if (showOriginal) {
      setDisplayImage(previewImage);
      return;
    }

    const worker = workerRef.current;
    if (!worker) return;

    setIsProcessing(true);

    // 16ms debounce — collapses rapid slider ticks into one worker post
    const timer = setTimeout(() => {
      const requestId = ++requestRef.current;

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        if (e.data.requestId !== requestId) return;
        const { pixels, width, height } = e.data;
        setDisplayImage(new ImageData(new Uint8ClampedArray(pixels), width, height));
        setIsProcessing(false);
      };

      const copy = new Uint8ClampedArray(previewImage.data).buffer;
      worker.postMessage(
        { pixels: copy, width: previewImage.width, height: previewImage.height, adjustments, requestId },
        [copy]
      );
    }, 16);

    return () => clearTimeout(timer);
  }, [previewImage, adjustments, showOriginal, setDisplayImage, setIsProcessing]);
}
