"use client";

import { motion } from "motion/react";
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
// Complements `reveal.tsx` (which fades/slides whole blocks).
//
// `prefers-reduced-motion` é atendido em CSS. Existia aqui um subtree
// alternativo — um `<div>` único com fade de opacidade — escolhido por
// `useReducedMotion()` no corpo da renderização. Era o pior dos casos de
// divergência de hidratação do projeto: com a preferência ativa, o servidor
// emitia N `<span>` mascarados e a primeira renderização do cliente pedia um
// `<div>`, o que muda a FORMA do DOM e o React não consegue remendar — ele
// descartava a hidratação e re-renderizava a raiz (#418).
//
// O caminho mascarado passa a ser o único, e a regra no fim de `globals.css`
// zera o deslocamento sob a preferência. Consequência aceita e especificada em
// `scroll-reveal-animations`: como aqui só `y` é animado, neutralizar o
// deslocamento não deixa animação nenhuma — as palavras aparecem legíveis, em
// deslocamento nulo dentro das suas máscaras, sem transição. O fade que o
// subtree alternativo dava se perde. Para movimento reduzido, "aparece
// imediatamente sem se mover" é a leitura mais fiel da preferência.
export function TextReveal({
  children,
  className,
  as,
  delay = 0,
}: TextRevealProps) {
  const Wrapper = (as ?? "div") as ElementType;
  const words = children.split(" ");

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
