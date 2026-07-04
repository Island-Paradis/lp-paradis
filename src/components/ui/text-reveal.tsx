"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

interface TextRevealProps {
  children: string;
  className?: string;
  // Rendered wrapper element (e.g. "h1", "h2", "p"). Defaults to a div.
  as?: ElementType;
  // Seconds before the reveal starts (stagger between sibling headings).
  delay?: number;
}

// Masked word reveal: splits text into words, each inside an `overflow-hidden`
// wrapper, and slides the words up from below the mask when scrolled into view.
// Complements `reveal.tsx` (which fades/slides whole blocks). Respects
// `prefers-reduced-motion` by falling back to a plain fade.
export function TextReveal({
  children,
  className,
  as,
  delay = 0,
}: TextRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const Wrapper = (as ?? "div") as ElementType;
  const words = children.split(" ");

  if (shouldReduceMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ margin: "-80px", once: true }}
        transition={{ duration: 0.5, delay }}
      >
        <Wrapper className={className}>{children}</Wrapper>
      </motion.div>
    );
  }

  return (
    <Wrapper className={cn("inline-block", className)}>
      {words.map((word, i) => (
        // Words are a fixed ordered list; index keys are stable here.
        // biome-ignore lint/suspicious/noArrayIndexKey: static word list
        <span key={`${word}-${i}`}>
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "110%" }}
              whileInView={{ y: 0 }}
              viewport={{ margin: "-80px", once: true }}
              transition={{
                duration: 0.6,
                delay: delay + i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Wrapper>
  );
}

export default TextReveal;
