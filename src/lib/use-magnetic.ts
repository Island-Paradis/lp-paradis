"use client";

import { type MotionValue, useMotionValue, useSpring } from "motion/react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface UseMagneticOptions {
  // How far (px) outside the element the pull starts being tracked. The pointer
  // must already be over the element for the effect to run.
  strength?: number;
}

interface UseMagneticResult {
  ref: RefObject<HTMLElement | null>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  onMouseMove: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
}

// Magnetic pull: while the pointer is over the element, translate it toward the
// cursor by a fraction of the offset from its centre, springing back on leave.
// No-op on coarse pointers and under `prefers-reduced-motion` (mirrors
// `cursor-glow.tsx`), returning springs pinned at 0 so callers stay static.
export function useMagnetic({
  strength = 0.35,
}: UseMagneticOptions = {}): UseMagneticResult {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 15, mass: 0.5 };
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const active = enabled && !shouldReduceMotion;

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!active) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = event.clientX - (rect.left + rect.width / 2);
      const relY = event.clientY - (rect.top + rect.height / 2);
      rawX.set(relX * strength);
      rawY.set(relY * strength);
    },
    [active, rawX, rawY, strength],
  );

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return { ref, x, y, onMouseMove, onMouseLeave };
}

export default useMagnetic;
