"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();

  // Respect the user's motion preference: fall back to native scroll.
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{ lerp: 0.1, smoothWheel: true, syncTouch: false }}
    >
      {children}
    </ReactLenis>
  );
}
