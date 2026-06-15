"use client";

import { Menu, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import Button from "../Button";

interface NavBarMobileMenuProps {
  children: React.ReactNode;
}

export default function NavBarMobileMenu({ children }: NavBarMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop: children inline in the nav row */}
      <div className="hidden lg:flex flex-1 items-center">{children}</div>

      {/* Mobile: hamburger button */}
      <Button
        type="button"
        variant="icon"
        size="icon"
        className="ml-auto flex lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </Button>

      {/* Mobile: dropdown menu */}
      {isOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-white shadow-md z-50 flex flex-col items-center py-4 px-4">
          {children}
        </div>
      )}
    </>
  );
}
