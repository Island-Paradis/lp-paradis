"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { twJoin } from "tailwind-merge";

interface NavBarRootProps {
  children: React.ReactNode;
  className?: string;
}

export default function NavBarRoot({ children, className }: NavBarRootProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={twJoin(
        "sticky top-0 z-40 w-full flex items-center justify-center py-7 border-b transition-[background-color,box-shadow,border-color] duration-300 ease-out",
        // O `backdrop-blur` vive no estado `scrolled`, não na base.
        //
        // No topo da página o fundo é `bg-background` — e `--background` é
        // opaco nos dois temas (`#ffffff` / `#151718`). Um `backdrop-filter`
        // atrás de uma superfície opaca não produz efeito visível nenhum, mas
        // continua sendo reprocessado a cada frame em que o conteúdo por trás
        // se move. Com o Lenis conduzindo o scroll por rAF, "a cada frame em
        // que o conteúdo se move" é todo frame de todo scroll.
        //
        // Mover o blur para cá é ganho sem contrapartida: ele passa a existir
        // exatamente onde o fundo é translúcido e o efeito aparece. Não há
        // pop na transição — o blur entra no mesmo instante em que o fundo
        // começa a deixar passar o que está atrás.
        scrolled
          ? "bg-background/50 shadow-xs border-border/90 backdrop-blur-2xl"
          : "bg-background border-transparent",
      )}
    >
      <div
        className={twJoin(
          "container lg:mx-auto px-4 xl:px-0 flex items-center",
          className,
        )}
      >
        {children}
      </div>
    </nav>
  );
}
