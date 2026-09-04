import type React from "react";
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
      className={twJoin(
        "w-full flex flex-col lg:flex-row justify-center gap-6 lg:gap-2",
        className,
      )}
    >
      {children}
    </ul>
  );
}
