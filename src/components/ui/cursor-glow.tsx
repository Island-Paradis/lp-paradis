"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useRef } from "react";
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
// hero gradient that trails the pointer with a little flicker. It is fully
// self-contained — it attaches the pointer listener to its own parent element,
// so the parent only needs to be `relative`. Renders a `pointer-events-none`
// layer so it never steals hover/clicks from the content above it.
// Respects `prefers-reduced-motion` (mirrors `reveal.tsx`).
export function CursorGlow({
  className,
  size = 50,
  from = "rgba(255, 255, 255, 0.85)",
  via = "rgba(255, 255, 255, 0.4)",
  opacity = 1,
}: CursorGlowProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(-size);
  const y = useMotionValue(-size);
  // Spring lag gives the halo its flame-like trail; disabled for reduced motion.
  const springConfig = { stiffness: 150, damping: 20, mass: 0.6 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const fade = useMotionValue(0);
  const fadeSpring = useSpring(fade, { stiffness: 200, damping: 30 });

  const glowX = shouldReduceMotion ? x : xSpring;
  const glowY = shouldReduceMotion ? y : ySpring;
  const background = useMotionTemplate`radial-gradient(${size}px circle at ${glowX}px ${glowY}px, ${from}, ${via} 40%, transparent 72%)`;

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;

    const handleMove = (event: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      x.set(event.clientX - rect.left);
      y.set(event.clientY - rect.top);
    };
    const handleEnter = () => fade.set(opacity);
    const handleLeave = () => fade.set(0);

    parent.addEventListener("mousemove", handleMove);
    parent.addEventListener("mouseenter", handleEnter);
    parent.addEventListener("mouseleave", handleLeave);
    return () => {
      parent.removeEventListener("mousemove", handleMove);
      parent.removeEventListener("mouseenter", handleEnter);
      parent.removeEventListener("mouseleave", handleLeave);
    };
  }, [x, y, fade, opacity]);

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ background, opacity: fadeSpring }}
      // Subtle flame flicker — only when motion is allowed.
      animate={
        shouldReduceMotion
          ? undefined
          : {
              scale: [1, 1.04, 0.98, 1.03, 1],
              filter: ["blur(0px)", "blur(2px)", "blur(0px)"],
            }
      }
      transition={
        shouldReduceMotion
          ? undefined
          : {
              duration: 2.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }
      }
    />
  );
}

export default CursorGlow;
