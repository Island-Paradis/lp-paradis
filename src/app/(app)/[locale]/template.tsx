"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// App Router `template.tsx` re-mounts on every navigation, so a plain enter
// animation here gives a reliable page transition (fade + slight rise) without
// the FrozenRouter hack needed for exit animations. Respects reduced motion.
export default function Template({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
