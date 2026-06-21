import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import styles from "./AdjustmentSlider.module.css";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function SpringNumber({ target, decimals }: { target: number; decimals: number }) {
  const motionVal = useMotionValue(target);
  const spring = useSpring(motionVal, { stiffness: 600, damping: 40 });
  const [display, setDisplay] = useState(target);

  useEffect(() => { motionVal.set(target); }, [target, motionVal]);
  useMotionValueEvent(spring, "change", (v) => setDisplay(v));

  return <>{display.toFixed(decimals)}</>;
}

export function AdjustmentSlider({ label, value, min, max, onChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const rawValue = useRef(value);
  const totalMovement = useRef(0); // total pixels traveled this drag — guards the magnetic snap
  const lastClientX = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const step = max <= 3 ? 0.1 : 1;
  const decimals = step < 1 ? 1 : 0;
  const percent = ((value - min) / (max - min)) * 100;

  // Snap zone: tight for exposure (EV), wider for integer sliders
  const snapThreshold = max <= 3 ? 0.3 : 4;

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    rawValue.current = value;
    totalMovement.current = 0;
    lastClientX.current = e.clientX;
    setIsDragging(true);
  }, [value]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.buttons) return;
    const dx = e.clientX - lastClientX.current;
    lastClientX.current = e.clientX;
    totalMovement.current += Math.abs(dx);
    const trackWidth = trackRef.current?.offsetWidth ?? 240;
    const pixelsPerUnit = trackWidth / (max - min);
    const sensitivity = e.shiftKey ? pixelsPerUnit * 10 : pixelsPerUnit;
    rawValue.current = Math.max(min, Math.min(max, rawValue.current + dx / sensitivity));
    const snapped = parseFloat((Math.round(rawValue.current / step) * step).toFixed(decimals));
    onChange(snapped);
  }, [min, max, step, decimals, onChange]);

  const onPointerUp = useCallback(() => {
    // Magnetic zero: only snap if within threshold AND drag was short (a nudge, not an intentional move)
    if (Math.abs(value) <= snapThreshold && totalMovement.current < 12) {
      rawValue.current = 0;
      onChange(0);
    }
    setIsDragging(false);
  }, [value, snapThreshold, onChange]);

  const onDoubleClick = useCallback(() => {
    rawValue.current = 0;
    onChange(0);
  }, [onChange]);

  return (
    <div
      className={`${styles.row} ${isDragging ? styles.rowDragging : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      <span className={`${styles.label} ${isDragging ? styles.labelActive : ""}`}>
        {label}
      </span>

      <div className={styles.sliderWrapper}>
        <div ref={trackRef} className={`${styles.track} ${isDragging ? styles.trackActive : ""}`}>
          <motion.div
            className={styles.fill}
            style={{ width: `${percent}%` }}
            layout
            transition={{ duration: 0 }}
          />
        </div>
        {isDragging && (
          <motion.div
            className={styles.tooltip}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ left: `${percent}%` }}
          >
            {value.toFixed(decimals)}
          </motion.div>
        )}
      </div>

      <span className={`${styles.value} ${isDragging ? styles.valueActive : ""}`}>
        <SpringNumber target={value} decimals={decimals} />
      </span>
    </div>
  );
}
