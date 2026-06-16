import type React from "react";
import { twJoin } from "tailwind-merge";

interface NavBarRootProps {
  children: React.ReactNode;
  className?: string;
}

export default function NavBarRoot({ children, className }: NavBarRootProps) {
  return (
    <nav className="sticky top-0 z-40 w-full flex items-center justify-center py-7 bg-background">
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
