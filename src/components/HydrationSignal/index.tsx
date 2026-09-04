"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __revealReady?: boolean;
  }
}

// Prova de que o React hidratou.
//
// O script inline em `[locale]/layout.tsx` agenda um timer que força a
// visibilidade de todo elemento animado (ver a rede de segurança no fim de
// `globals.css`). Esse timer consulta esta flag e vira no-op quando ela está
// presente — é o que separa "o bundle carregou e a hidratação falhou" de
// "está tudo bem, as animações vão rodar".
//
// É um componente próprio, e não um efeito dentro de `SmoothScroll`, porque
// `SmoothScroll` retorna `children` cru sob `prefers-reduced-motion`: nesse
// caminho não existe efeito onde pendurar o sinal, e justamente quem prefere
// movimento reduzido ficaria sem a garantia.
export default function HydrationSignal() {
  useEffect(() => {
    window.__revealReady = true;

    // Reafirma `.js`, que o script inline já aplicou.
    //
    // A causa conhecida disto FOI ELIMINADA e a linha permanece por defesa em
    // profundidade. O que existia: `useReducedMotion()` do `motion` lido no
    // corpo da renderização fazia a hidratação divergir em toda carga com
    // `prefers-reduced-motion` ativo (React #418 no elemento `HTML`, porque o
    // hook devolve `null` no servidor e `true` no cliente). O React se
    // recuperava re-renderizando da raiz, e nisso zerava os atributos de
    // `<html>` — levando `.js` junto. `hydration-integrity` proibiu a leitura
    // de ambiente em tempo de renderização e a divergência deixou de existir.
    //
    // Por que a linha fica: uma re-renderização de raiz continua possível por
    // outras causas, e o custo de não estar protegido é grande. Sem ela,
    // `html:not(.js)` passaria a casar com o React vivo e a rede de segurança
    // desligaria as animações de forma permanente. O conteúdo continuaria
    // visível, que é o que importa, mas por acidente e não por projeto.
    //
    // O que NÃO se deve concluir daqui: que a rede de segurança absorve
    // divergências de hidratação como parte da operação normal. Ela protege
    // contra o que o projeto não controla — JavaScript desligado, bundle
    // bloqueado, erro imprevisto. Usá-la para compensar defeito próprio
    // esconde o defeito e degrada a rede a caminho normal de execução.
    const root = document.documentElement;
    root.classList.add("js");

    // Desfaz o failsafe se ele tiver disparado antes desta hidratação.
    //
    // A degradação já foi de mão única, para evitar um flash de re-ocultar.
    // Trocado de propósito: mão única significava que uma hidratação lenta
    // deixava TODAS as animações mortas até o próximo reload. Um flash é pior
    // de olhar e melhor de viver.
    //
    // O caso motivador é hidratação LENTA — o prazo de 10 s do script inline
    // vencer antes de o React sinalizar, em aparelho devagar ou rede ruim. Não
    // é movimento reduzido: aquela divergência era determinística e foi
    // corrigida na origem, não coberta por este remendo.
    root.classList.remove("reveal-failsafe");
  }, []);

  return null;
}
