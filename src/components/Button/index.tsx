import React from "react";
import { twMerge } from "tailwind-merge";

export default function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline";
  },
) {
  return (
    <button
      {...props}
      className={twMerge(
        "w-full px-4 py-3 rounded-3xl text-nowrap cursor-pointer transition-colors duration-300",
        props.variant === "primary"
          ? "bg-primary text-white"
          : "border border-primary text-primary",
        props.className,
      )}
    />
  );
}
