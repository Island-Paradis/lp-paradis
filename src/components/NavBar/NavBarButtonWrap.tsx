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
    <div
      className={twJoin(
        "mt-8 flex w-full flex-col items-start gap-3 lg:mt-0 lg:w-auto lg:flex-row lg:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
