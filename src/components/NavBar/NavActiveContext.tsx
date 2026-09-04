"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface NavActiveContextValue {
  activeHash: string | null;
}

const NavActiveContext = createContext<NavActiveContextValue>({
  activeHash: null,
});

export function useNavActive() {
  return useContext(NavActiveContext);
}

interface NavActiveProviderProps {
  ids: string[];
  children: ReactNode;
}

export function NavActiveProvider({ ids, children }: NavActiveProviderProps) {
  const [activeHash, setActiveHash] = useState<string | null>(null);

  // Evita recriar o observer a cada render por causa de um novo array de ids.
  const idsKey = ids.join(",");

  useEffect(() => {
    const sectionIds = idsKey ? idsKey.split(",") : [];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // Mantém a razão de interseção de cada seção e marca como ativa a mais visível.
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        }

        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }

        if (best) setActiveHash(best);
      },
      {
        // Seção fica ativa ao cruzar a faixa central da viewport.
        rootMargin: "-45% 0px -50% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
  }, [idsKey]);

  const value = useMemo(() => ({ activeHash }), [activeHash]);

  return (
    <NavActiveContext.Provider value={value}>
      {children}
    </NavActiveContext.Provider>
  );
}
