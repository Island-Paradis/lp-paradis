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
        "sticky top-0 z-40 w-full flex items-center justify-center py-7 bg-background transition-shadow duration-200",
        scrolled && "shadow-md",
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
