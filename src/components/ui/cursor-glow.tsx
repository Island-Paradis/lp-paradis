"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CursorGlowProps {
  className?: string;
  // Radius of the glow in px.
  size?: number;
  // Inner color of the halo (defaults to white).
  from?: string;
  // Mid color of the halo (defaults to a softer white).
  via?: string;
  // Peak opacity of the halo while the pointer is over the area.
  opacity?: number;
}

// Cursor-following "labareda" (flame/halo): a soft radial glow tinted with the
// hero gradient that trails the pointer. It is fully self-contained — it
// attaches the pointer listener to its own parent element, so the parent only
// needs to be `relative`. Renders a `pointer-events-none` layer so it never
// steals hover/clicks from the content above it.
//
// Performance: instead of animating the CSS `background` (a full-layer repaint
// every frame), it moves a fixed-size element with a *static* radial gradient
// using `transform: translate()` (GPU-composited). No infinite blur loop.
// Disabled on touch / coarse-pointer devices and respects
// `prefers-reduced-motion` (mirrors `reveal.tsx`).
export function CursorGlow({
  className,
  size = 50,
  from = "rgba(255, 255, 255, 0.85)",
  via = "rgba(255, 255, 255, 0.4)",
  opacity = 1,
}: CursorGlowProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // Cached parent rect so we don't read layout on every mousemove.
  const rectRef = useRef<DOMRect | null>(null);

  // Only enable on devices with a fine pointer (skip touch entirely).
  const [enabled, setEnabled] = useState(false);

  // Translate to the pointer, offset by `size` so the glow stays centred.
  const x = useMotionValue(-size * 2);
  const y = useMotionValue(-size * 2);
  // Spring lag gives the halo its flame-like trail; disabled for reduced motion.
  const springConfig = { stiffness: 150, damping: 20, mass: 0.6 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const fade = useMotionValue(0);
  const fadeSpring = useSpring(fade, { stiffness: 200, damping: 30 });

  const glowX = shouldReduceMotion ? x : xSpring;
  const glowY = shouldReduceMotion ? y : ySpring;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const parent = ref.current?.parentElement;
    if (!parent) return;

    const measure = () => {
      rectRef.current = parent.getBoundingClientRect();
    };
    measure();

    const handleMove = (event: MouseEvent) => {
      const rect = rectRef.current;
      if (!rect) return;
      x.set(event.clientX - rect.left - size);
      y.set(event.clientY - rect.top - size);
    };
    const handleEnter = () => {
      // Re-measure on enter: the target (hero h1) animates in, so the rect
      // captured at mount can be stale until the next scroll/resize.
      measure();
      fade.set(opacity);
    };
    const handleLeave = () => fade.set(0);

    parent.addEventListener("mousemove", handleMove);
    parent.addEventListener("mouseenter", handleEnter);
    parent.addEventListener("mouseleave", handleLeave);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      parent.removeEventListener("mousemove", handleMove);
      parent.removeEventListener("mouseenter", handleEnter);
      parent.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [enabled, x, y, fade, opacity, size]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <motion.div
        className="absolute top-0 left-0 rounded-full"
        style={{
          width: size * 2,
          height: size * 2,
          x: glowX,
          y: glowY,
          opacity: fadeSpring,
          background: `radial-gradient(circle, ${from}, ${via} 40%, transparent 72%)`,
        }}
      />
    </div>
  );
}

export default CursorGlow;
