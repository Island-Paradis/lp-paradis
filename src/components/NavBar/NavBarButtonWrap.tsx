import React from "react";
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
    <div className={twJoin("flex flex-col gap-3 lg:flex-row", className)}>{children}</div>
  );
}
