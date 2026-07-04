"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  // Vertical travel across the viewport, in percent of the element height.
  // Positive moves the child down as you scroll; larger = stronger effect.
  amount?: number;
}

// Scroll-driven parallax: maps the element's progress through the viewport to a
// vertical translate, so the content drifts at a different rate than the page.
// Works alongside Lenis (both read the window scroll). Renders children
// untransformed under `prefers-reduced-motion`.
export function Parallax({ children, className, amount = 8 }: ParallaxProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`-${amount}%`, `${amount}%`],
  );

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div style={{ y, willChange: "transform" }} className="h-full">
        {children}
      </motion.div>
    </div>
  );
}

export default Parallax;
