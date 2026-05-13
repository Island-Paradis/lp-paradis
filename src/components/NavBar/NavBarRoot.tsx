import React from "react";
import { twJoin } from "tailwind-merge";

interface NavBarRootProps {
  children: React.ReactNode;
  className?: string;
}

export default function NavBarRoot({ children, className }: NavBarRootProps) {
  return (
    <nav className="relative w-full flex items-center justify-center py-7">
      <div className={twJoin("container lg:mx-auto px-4 xl:px-0 flex items-center", className)}>
        {children}
      </div>
    </nav>
  );
}
