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
        data-reveal
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ amount: 0, once: true }}
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
          {/*
            Quem é observado é a MÁSCARA, não a palavra.

            O `IntersectionObserver` recorta a interseção pelo `overflow` dos
            ancestrais. A palavra está a `translateY(110%)`, inteiramente fora
            desta máscara, então observá-la devolve `isIntersecting: false` com
            `intersectionRect` 0×0 mesmo com ela parada no meio da viewport —
            medido. Com `once: true`, isso trava a palavra fora da máscara para
            sempre: ela só seria revelada se já estivesse visível.

            A máscara não recorta a si mesma, então observá-la funciona. O
            estado viaja daqui para a palavra por propagação de variants.
          */}
          {/*
            Escolha oposta à de `reveal.tsx`, e pelo motivo oposto: aqui o
            `once: true` sempre existiu, e com ele a zona morta que uma margem
            negativa cria nas bordas da tela seria PERMANENTE. Por isso o
            gatilho é sem margem e com limiar zero — qualquer pixel revela.
          */}
          <motion.span
            className="inline-block overflow-hidden align-bottom"
            initial="hidden"
            whileInView="show"
            viewport={{ amount: 0, once: true }}
          >
            <motion.span
              // Marcado palavra a palavra, e não só no wrapper: é aqui que o
              // deslocamento inicial vive, e é ele que a rede de segurança em
              // `globals.css` precisa zerar.
              data-reveal
              className="inline-block"
              variants={{ hidden: { y: "110%" }, show: { y: 0 } }}
              transition={{
                duration: 0.6,
                delay: delay + i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          </motion.span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Wrapper>
  );
}

export default TextReveal;
