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
    // Não é redundante: sob `prefers-reduced-motion` a hidratação falha
    // (React #418 no elemento `HTML`, porque `useReducedMotion()` devolve
    // `false` no servidor e `true` no cliente, e vários componentes ramificam
    // nesse valor). O React se recupera re-renderizando da raiz, e nisso zera
    // os atributos de `<html>` — levando `.js` junto.
    //
    // Sem esta linha, `html:not(.js)` passaria a casar com o React vivo e a
    // rede de segurança desligaria as animações de forma permanente. O
    // conteúdo continuaria visível, que é o que importa, mas por acidente e
    // não por projeto.
    const root = document.documentElement;
    root.classList.add("js");

    // Desfaz o failsafe se ele tiver disparado antes desta hidratação.
    //
    // A degradação já foi de mão única, para evitar um flash de re-ocultar.
    // Trocado de propósito: mão única significava que uma hidratação lenta
    // deixava TODAS as animações mortas até o próximo reload, e esse é um
    // caminho para o mesmo sintoma que a change existe para eliminar. Um flash
    // é pior de olhar e melhor de viver.
    root.classList.remove("reveal-failsafe");
  }, []);

  return null;
}
