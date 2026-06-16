import type React from "react";
import { twJoin } from "tailwind-merge";
export interface NavBarButtonWrapProps {
  children: React.ReactNode;
  className?: string;
}

export default function NavBarButtonWrap({
  children,
  className,
}: NavBarButtonWrapProps) {
  return (
    <div className={twJoin("hidden gap-3 lg:flex lg:flex-row", className)}>
      {children}
    </div>
  );
}
