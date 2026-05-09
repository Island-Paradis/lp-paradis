import React from "react";
import { twJoin } from "tailwind-merge";

interface NavBarItemsListProps {
  children: React.ReactNode;
  className?: string;
}

export default function NavBarItemsList({
  children,
  className,
}: NavBarItemsListProps) {
  return (
    <ul
      className={twJoin("w-full flex flex-row items-center justify-center gap-2", className)}
    >
      {children}
    </ul>
  );
}
