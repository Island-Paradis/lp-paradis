"use client";

import { ReactLenis, useLenis } from "lenis/react";
// biome-ignore lint/style/noRestrictedImports: exceção especificada em `hydration-integrity` — com `root` o `ReactLenis` não renderiza DOM, então os dois braços emitem o mesmo markup e não há divergência; converter trocaria o tipo do elemento e remontaria a subárvore inteira. Ver o comentário em `SmoothScroll`.
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { useEffect } from "react";

// Quantos frames sem scroll antes de o condutor dormir. ~0,5 s a 60 Hz.
//
// Não é zero de propósito: `isScrolling` volta a `false` entre o fim do easing
// e o assentamento do scroll nativo, e dormir no primeiro frame ocioso faria a
// assinatura piscar em vez de terminar.
const SLEEP_GRACE_FRAMES = 30;

// Conduz o `raf` do Lenis pelo frameloop do Motion, e só enquanto há scroll.
//
// Duas coisas se resolvem juntas aqui:
//
// 1. DOIS loops viram UM. O `ReactLenis` liga `autoRaf` por padrão, e o loop
//    do Lenis se reagenda incondicionalmente (`lenis.mjs`: `if (autoRaf)
//    rafId = requestAnimationFrame(this.raf)`). Medido na baseline desta
//    change: com a página parada, 120 rAF/s — 60 do batcher do Motion, 60 do
//    Lenis, atribuídos por captura de pilha.
//
// 2. O loop passa a poder DORMIR. Só juntar os dois não bastaria: a
//    integração comum é `frame.update(t => lenis.raf(t), true)`, e aquele
//    `keepAlive` manteria o frameloop do Motion acordado para sempre —
//    desfazendo exatamente o que a desassinatura em `scroll-based-velocity`
//    conquistou. Um loop permanente em vez de dois é metade do custo de
//    agendamento e nenhuma ociosidade.
//
// De brinde, a ordenação fica correta: o passo `setup` roda antes do `read`,
// então o Lenis escreve a posição de scroll antes de o `useScroll` lê-la.
function LenisFrameDriver() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    let subscribed = false;
    let idleFrames = 0;

    const drive = ({ timestamp }: { timestamp: number }) => {
      lenis.raf(timestamp);
      if (lenis.isScrolling) {
        idleFrames = 0;
      } else if (++idleFrames > SLEEP_GRACE_FRAMES) {
        sleep();
      }
    };

    const wake = () => {
      idleFrames = 0;
      if (subscribed) return;
      // O Lenis calcula `deltaTime = time - (this.time || time)` e, ao
      // contrário do Motion, NÃO clampa esse delta. Um `time` obsoleto de
      // minutos atrás produziria um `advance()` com delta enorme no primeiro
      // frame após o despertar. Zerar faz o próprio fallback do Lenis entrar
      // em ação e o primeiro delta ser 0.
      (lenis as unknown as { time: number }).time = 0;
      frame.setup(drive, true);
      subscribed = true;
    };

    const sleep = () => {
      if (!subscribed) return;
      cancelFrame(drive);
      subscribed = false;
    };

    // Roda e toque. Emitido direto do handler de input do Lenis, que é
    // independente do rAF — então o gesto chega mesmo com o condutor dormindo
    // e é ele quem acorda o loop, em vez de se perder.
    lenis.on("virtual-scroll", wake);
    // Âncoras do menu (`href="#id"`), teclado e arraste da barra de rolagem
    // produzem scroll NATIVO, que não passa pelo `virtual-scroll`. Este
    // listener é o que mantém a navegação por âncora suave.
    window.addEventListener("scroll", wake, { passive: true });

    // Começa acordado: se a página abre com hash ou restaurada numa posição,
    // o assentamento inicial precisa de alguns frames. A carência acima põe o
    // condutor para dormir sozinho logo em seguida.
    wake();

    return () => {
      lenis.off("virtual-scroll", wake);
      window.removeEventListener("scroll", wake);
      sleep();
    };
  }, [lenis]);

  return null;
}

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  // A ÚNICA leitura de ambiente em tempo de renderização que sobrevive no
  // projeto, e a exceção está especificada em `hydration-integrity` — não é
  // descuido nem dívida.
  //
  // Por que é segura: com `root`, o `ReactLenis` renderiza um
  // `LenisContext.Provider` e NENHUM nó de DOM (`lenis-react.mjs`, o ramo
  // `root && root !== "asChild" ? children : <div>…`). Os dois braços deste
  // `if` emitem exatamente o mesmo DOM, então a hidratação casa e a
  // divergência que esta change eliminou nunca existiu aqui.
  //
  // Por que converter seria PIOR: o remédio geral é adiar a verdade para
  // depois da montagem. Aqui isso trocaria o tipo do elemento nesta posição —
  // de `ReactLenis` para `Fragment` — e o React desmonta a subárvore inteira
  // quando o tipo muda. `Header`, a página e o footer remontariam a cada
  // carga, incluindo o `<video autoPlay>` do parallax. Seria criar um defeito
  // maior que o inexistente que se pretendia corrigir.
  //
  // A regra de lint que proíbe este import tem `biome-ignore` acima por isso.
  // Se um dia o `ReactLenis` passar a renderizar um wrapper mesmo com `root`,
  // esta exceção morre junto e o componente precisa de outra solução — provavelmente
  // manter o Lenis sempre montado e neutralizá-lo por opções.
  const prefersReducedMotion = useReducedMotion();

  // Respect the user's motion preference: fall back to native scroll.
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      autoRaf={false}
      options={{ lerp: 0.1, smoothWheel: true, syncTouch: false }}
    >
      <LenisFrameDriver />
      {children}
    </ReactLenis>
  );
}
