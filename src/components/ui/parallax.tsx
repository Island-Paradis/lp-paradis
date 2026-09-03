"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

// Folga generosa: a promoção a camada precisa acontecer ANTES de o elemento
// ficar visível, senão o primeiro frame visível carrega o custo da promoção e
// aparece como pop.
const PROMOTE_MARGIN = "400px";

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  // Vertical travel across the viewport, in percent of the element height.
  // Positive moves the child down as you scroll; larger = stronger effect.
  amount?: number;
}

// Scroll-driven parallax: maps the element's progress through the viewport to a
// vertical translate, so the content drifts at a different rate than the page.
// Works alongside Lenis (both read the window scroll).
//
// `prefers-reduced-motion` é atendido em CSS, pela regra que alcança
// `[data-parallax]` no fim de `globals.css`. A ESTRUTURA é incondicional, e
// isso é decisão, não descuido — ver o comentário sobre o remount abaixo.
export function Parallax({ children, className, amount = 8 }: ParallaxProps) {
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

  // `will-change` com escopo temporal.
  //
  // A tarefa 6.3 de `optimize-landing-performance` manteve este `willChange`
  // permanente com o argumento de que "aquele elemento de fato anima `y`
  // continuamente". O argumento estava certo, e ficou incompleto: a animação é
  // contínua enquanto o elemento CRUZA a viewport, que é uma fração da sessão.
  // Fora dela, a camada promovida segura os frames decodificados de um vídeo
  // que agora pausa (ver `video-autopause.tsx`) — memória de GPU reservada
  // para conteúdo que não muda.
  //
  // Isto não reverte a 6.3: aplica o requisito de escopo temporal de
  // `will-change` que a própria `scroll-frame-budget` estabeleceu, agora que a
  // razão da exceção deixou de valer.
  const [promoted, setPromoted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setPromoted(entry.isIntersecting),
      { rootMargin: PROMOTE_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A única coisa que a preferência ainda decide aqui: promover a camada.
  //
  // Existia neste lugar um `return` alternativo — uma `<div>` nua, sem wrapper
  // e sem `motion.div` — escolhido por `useReducedMotion()` do `motion` lido no
  // corpo da renderização. Foi removido, e a estrutura passou a ser
  // incondicional, por duas razões que só apareceram na implementação:
  //
  //   O deslocamento inicial existe no PRIMEIRO FRAME. `useTransform` vale
  //   `-amount%` em progresso 0, então a árvore completa pinta deslocada antes
  //   de qualquer efeito rodar. Só CSS chega em tempo; um hook que resolve
  //   depois da montagem pintaria deslocado e então saltaria.
  //
  //   Trocar a árvore DESMONTA os children. O único uso desta primitiva envolve
  //   um `<video autoPlay>` (`page.tsx:85`), e remontá-lo significa refetch e
  //   redecode. Hoje isso não acontece, porque o valor é conhecido na primeira
  //   renderização; adiar a verdade para depois da montagem — que é o remédio
  //   para a divergência de hidratação — criaria o remount. Seria trocar um
  //   defeito por outro, só em usuários com a preferência ativa.
  //
  // O preço aceito: sob a preferência, `useScroll`/`useTransform` continuam
  // subscritos e o `motion` continua escrevendo `transform` inline a cada
  // frame de scroll, para efeito que o CSS descarta. É trabalho desperdiçado,
  // e é pequeno — sob a preferência o Lenis não monta (ver `SmoothScroll`), o
  // scroll é nativo e os eventos são coalescidos pelo browser, não emitidos a
  // cada frame por `requestAnimationFrame`. É justamente o caso que
  // `scroll-frame-budget` NÃO proíbe.
  //
  // `willChange` fica de fora do preço, e é por isso que o hook permanece:
  // promover a camada de um elemento deste tamanho para um `transform` que
  // nunca muda é reserva de memória de GPU sem retorno, e `will-change` com
  // escopo temporal é requisito explícito de `scroll-frame-budget`. Suprimir
  // um valor de `style` não remonta nada, então aqui adiar a verdade não custa.
  const shouldReduceMotion = useReducedMotion();
  const willChange = promoted && !shouldReduceMotion ? "transform" : undefined;

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div
        // Marcador próprio, e não `data-reveal`: o parallax nunca é invisível,
        // só deslocado. `data-reveal` significa "estado inicial invisível" em
        // `scroll-reveal-animations`, e usá-lo aqui mentiria sobre o atributo e
        // sujeitaria este elemento à rede de segurança de visibilidade sem
        // necessidade. O nome é específico de propósito — um marcador genérico
        // viraria o balde onde todo `transform` cai, inclusive `transform` que
        // sirva a layout, que a regra com `!important` quebraria.
        data-parallax
        style={{ y, willChange }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default Parallax;
