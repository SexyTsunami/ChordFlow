"use client";

import * as React from "react";

/**
 * Smooth autoscroll for the practice screen.
 *
 * Driven by requestAnimationFrame with a sub-pixel accumulator, so slow speeds
 * (a few pixels per second) still move continuously instead of juddering once
 * a second. Scrolls the window, which is what the practice layout uses.
 */
export function useAutoscroll({
  speed,
  running,
  onReachEnd,
}: {
  /** Pixels per second. */
  speed: number;
  running: boolean;
  onReachEnd?: () => void;
}) {
  const speedRef = React.useRef(speed);
  speedRef.current = speed;
  const endRef = React.useRef(onReachEnd);
  endRef.current = onReachEnd;

  React.useEffect(() => {
    if (!running) return;
    if (typeof window === "undefined") return;

    let frame = 0;
    let last = performance.now();
    let remainder = 0;

    const step = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;

      remainder += speedRef.current * delta;
      const whole = Math.floor(remainder);
      if (whole > 0) {
        remainder -= whole;
        const before = window.scrollY;
        window.scrollBy(0, whole);
        // Nothing moved: we are at the bottom of the document.
        if (window.scrollY === before) {
          endRef.current?.();
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running]);
}

/** Current vertical scroll progress of the document, 0..1. */
export function useScrollProgress(): number {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const update = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return progress;
}
