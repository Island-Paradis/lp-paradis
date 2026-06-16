"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 16 },
  down: { y: -16 },
  left: { x: 16 },
  right: { x: -16 },
  none: {},
};

interface RevealProps {
  children?: ReactNode;
  className?: string;
  // Where the content slides in from. Defaults to a subtle upward motion.
  direction?: Direction;
  // Stagger helper: delay (in seconds) before this element starts animating.
  delay?: number;
}

// Reusable scroll-reveal primitive: fades + slides content in when it enters the
// viewport, and reverses back out when it leaves (replays on every scroll up /
// down). Being a client component that renders `children`, it can wrap both
// client and server sections without turning them into client components.
// Respects `prefers-reduced-motion` (mirrors `scroll-based-velocity.tsx`).
export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  const initial = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, ...OFFSET[direction] };

  return (
    <motion.div
      className={className}
      variants={{ hidden: initial, show: { opacity: 1, x: 0, y: 0 } }}
      initial="hidden"
      whileInView="show"
      viewport={{ margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
