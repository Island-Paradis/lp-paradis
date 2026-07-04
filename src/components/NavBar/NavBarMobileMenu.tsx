"use client";

import { Menu, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../Button";
import NavBarLogo from "./NavBarLogo";
import { NavMobileMenuContext } from "./NavMobileMenuContext";

interface NavBarMobileMenuProps {
  children: React.ReactNode;
  logoSrc: string;
  logoHref?: string;
  logoWidth?: number;
  logoHeight?: number;
}

export default function NavBarMobileMenu({
  children,
  logoSrc,
  logoHref = "/",
  logoWidth = 134,
  logoHeight = 25,
}: NavBarMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Trava o scroll do fundo enquanto o menu full-screen está aberto.
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fecha o menu ao tocar num link; no desktop é um no-op inofensivo.
  const close = useCallback(() => setIsOpen(false), []);
  const menuValue = useMemo(() => ({ close }), [close]);

  return (
    <NavMobileMenuContext.Provider value={menuValue}>
      {/* Desktop: children inline in the nav row */}
      <div className="hidden lg:flex flex-1 items-center">{children}</div>

      {/* Mobile: hamburger button */}
      <Button
        type="button"
        variant="icon"
        size="icon"
        className="ml-auto flex lg:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={isOpen}
      >
        <Menu size={24} />
      </Button>

      {/* Mobile: full-screen menu. Renderizado via portal no body para escapar
          do containing block criado pelo backdrop-filter da nav. */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-lenis-prevent
            className="lg:hidden fixed inset-0 z-50 bg-surface-dark-2 flex flex-col px-4 py-7"
          >
            <div className="flex items-center justify-between">
              <NavBarLogo
                imgSrc={logoSrc}
                href={logoHref}
                width={logoWidth}
                height={logoHeight}
              />
              <Button
                type="button"
                variant="icon"
                size="icon"
                className="text-white hover:text-white"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar menu"
              >
                <X size={24} />
              </Button>
            </div>

            <div className="mt-8 h-full flex flex-col items-start justify-center">
              {children}
            </div>
          </div>,
          document.body,
        )}
    </NavMobileMenuContext.Provider>
  );
}
