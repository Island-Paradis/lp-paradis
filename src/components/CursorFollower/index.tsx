"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CursorState = "default" | "hover" | "view";

// Accent cursor dot: keeps the native cursor visible and adds a single dot that
// follows the pointer. `mix-blend-difference` makes it read as black over light
// areas and white over dark ones (always visible). Over `[data-cursor="hover"]`
// targets (buttons/links) it grows into a larger inverting circle; over
// `[data-cursor="view"]` targets (project images) it becomes a solid circle with
// a "View" label. It never hides the native cursor. Only runs on fine pointers
// and respects `prefers-reduced-motion` (mirrors `cursor-glow.tsx`).
export default function CursorFollower() {
  const shouldReduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<CursorState>("default");

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // Tight spring so the dot stays glued to the pointer.
  const cx = useSpring(x, { stiffness: 1200, damping: 50, mass: 0.3 });
  const cy = useSpring(y, { stiffness: 1200, damping: 50, mass: 0.3 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const active = enabled && !shouldReduceMotion;

  useEffect(() => {
    if (!active) return;

    const handleMove = (event: MouseEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      setVisible(true);

      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor]",
      );
      const next = target?.dataset.cursor as CursorState | undefined;
      setState(next === "hover" || next === "view" ? next : "default");
    };
    const handleLeave = () => setVisible(false);

    window.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseleave", handleLeave);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
    };
  }, [active, x, y]);

  if (!active) return null;

  const size = state === "view" ? 90 : state === "hover" ? 40 : 8;
  const isView = state === "view";

  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none fixed top-0 left-0 z-9999 flex items-center justify-center rounded-full bg-white",
        // Solid (no blend) in the "view" state so the label stays readable.
        !isView && "mix-blend-difference",
      )}
      style={{ x: cx, y: cy }}
      animate={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        opacity: visible ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <AnimatePresence>
        {isView && (
          <motion.span
            className="text-xs font-medium tracking-wide text-black"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
          >
            View
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
