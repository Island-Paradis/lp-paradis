"use client";
import React from "react";
import { twMerge } from "tailwind-merge";
import * as Icons from "@solar-icons/react";
import { IconProps } from "@solar-icons/react";

type IconName = keyof typeof Icons;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  children: React.ReactNode;
  trailingIcon?: IconName;
  iconProps?: IconProps;
}

export default function Button(props: ButtonProps) {
  const { trailingIcon, variant, className, ...rest } = props;

  const IconComponent = trailingIcon
    ? (Icons[trailingIcon] as React.ComponentType<any>)
    : null;

  return (
    <button
      {...rest}
      className={twMerge(
        "px-4 py-3 rounded-3xl text-nowrap flex items-center flex-row gap-3 cursor-pointer transition-colors duration-300",
        variant === "primary"
          ? "bg-primary text-white"
          : "border border-secondary text-primary",
        className,
      )}
    >
      {props.children}
      {IconComponent && (
        <div className="icon">
          <IconComponent {...props.iconProps} />
        </div>
      )}
    </button>
  );
}
