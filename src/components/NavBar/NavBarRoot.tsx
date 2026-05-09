import React from "react";
import { twJoin } from "tailwind-merge";

interface NavBarRootProps {
  children: React.ReactNode;
  className?: string;
}

export default function NavBarRoot({ children, className }: NavBarRootProps) {
  return (
    <nav className="w-full flex items-center justify-center py-7">
      <div className={twJoin("container flex items-center", className)}>
        {children}
      </div>
    </nav>
  );
}
