"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

// A preferência de movimento reduzido, lida DEPOIS da montagem.
//
// Substitui o `useReducedMotion()` do `motion`, que não pode ser usado em
// caminho de renderização neste projeto — ver a regra em `biome.json`. O hook
// da biblioteca lê a preferência dentro de um inicializador de `useState`:
//
//     !hasReducedMotionListener.current && initPrefersReducedMotion();
//     const [shouldReduceMotion] = useState(prefersReducedMotion.current);
//
// E `prefersReducedMotion.current` vale `null` no servidor por projeto —
// `initPrefersReducedMotion()` retorna cedo quando `window` não existe. Com a
// preferência ativa, o servidor renderiza o caminho de movimento completo e a
// PRIMEIRA renderização do cliente pede o caminho reduzido. Divergência de
// hidratação em toda carga, e nos casos em que a árvore inteira muda de forma
// o React descarta a hidratação e re-renderiza a raiz (#418).
//
// Com a preferência inativa não há divergência: o servidor devolve `null` e o
// cliente `false`, ambos falsy, e toda ramificação produz o mesmo markup. É o
// que faz o defeito ser invisível para quem não usa a preferência.
//
// `false` como valor inicial não é conveniência: é o valor que o servidor
// assume. A primeira renderização do cliente reproduz o servidor por
// CONSTRUÇÃO, não porque alguém conferiu que os dois coincidem.
//
// `useSyncExternalStore` é a API desenhada para esta forma de problema, e é a
// escolha errada aqui PORQUE funciona: durante a hidratação o React usa o
// snapshot do cliente, não `getServerSnapshot`, então ele devolveria `true` na
// primeira renderização e reproduziria exatamente a divergência que este hook
// existe para eliminar. Um `getServerSnapshot` devolvendo `false` só a
// esconderia melhor. A ferramenta certa é a que atrasa a verdade de propósito.
//
// A assinatura de `change` corrige um segundo defeito de graça: o hook do
// `motion` nunca reage a mudanças da preferência depois da montagem, e há um
// `TODO` no código-fonte dele dizendo isso.
//
// A string da query segue `scroll-based-velocity.tsx`, que já usava esta forma.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia(QUERY);
    setReduced(mq.matches);

    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default useReducedMotion;
