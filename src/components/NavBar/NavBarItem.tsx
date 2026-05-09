import Link from "next/link";
import React from "react";
import { twJoin } from "tailwind-merge";

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
  return (
    <li className={twJoin("flex items-center px-5 py-2", className)}>
      <Link
        href={href || "#"}
        className="font-normal text-base text-neutral-600 hover:text-primary transition-colors duration-200"
      >
        {children}
      </Link>
    </li>
  );
}
