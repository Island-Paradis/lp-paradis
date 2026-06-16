"use client";

import Link from "next/link";
import type React from "react";
import { twJoin } from "tailwind-merge";
import { useNavActive } from "./NavActiveContext";

interface NavBarItemProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export default function NavBarItem({
  href,
  children,
  className,
}: NavBarItemProps) {
  const { activeHash } = useNavActive();
  const hash = href?.includes("#") ? href.split("#")[1] : undefined;
  const isActive = !!hash && hash === activeHash;

  return (
    <li
      className={twJoin(
        "flex items-start justify-start px-5 py-0 lg:py-2",
        className,
      )}
    >
      <Link
        href={href || "#"}
        className={twJoin(
          "font-normal text-[26px] lg:text-base transition-colors duration-200 lg:hover:text-primary",
          isActive
            ? "text-white lg:text-primary"
            : "text-white/70 lg:text-neutral-600",
        )}
      >
        {children}
      </Link>
    </li>
  );
}
