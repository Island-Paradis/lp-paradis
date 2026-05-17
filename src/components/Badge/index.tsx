"use client";
import React from "react";
import * as Icons from "@solar-icons/react";
import { twMerge } from "tailwind-merge";
import { IconProps } from "@solar-icons/react/lib/types";

type IconName = keyof typeof Icons;

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: IconName;
  iconProps?: IconProps;
  children: React.ReactNode;
}

export default function Badge({ icon, iconProps, children, ...props }: BadgeProps) {
  const IconComponent = icon ? (Icons[icon] as React.ComponentType<IconProps>) : null;

  return (
    <div
      {...props}
      className={twMerge(
        "inline-flex items-center justify-center gap-2 px-3 rounded-full bg-secondary/10 border border-secondary/40 ",
        props.className,
      )}
    >
      {IconComponent && <IconComponent {...iconProps} />}
      {children}
    </div>
  );
}
