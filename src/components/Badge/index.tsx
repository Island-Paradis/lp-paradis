"use client";
import type { IconProps } from "@solar-icons/react/lib/types";
import type React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  // O componente do ícone, já importado pelo call site — não o seu nome.
  // Mesmo motivo documentado em `Button`: `import * as` mais indexação
  // dinâmica retêm a biblioteca inteira no bundle.
  icon?: React.ComponentType<IconProps>;
  iconProps?: IconProps;
  children: React.ReactNode;
}

export default function Badge({
  icon,
  iconProps,
  children,
  ...props
}: BadgeProps) {
  const IconComponent = icon ?? null;

  return (
    <div
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-3 rounded-full bg-secondary/10 border border-secondary/40 ",
        props.className,
      )}
    >
      {IconComponent && <IconComponent {...iconProps} />}
      {children}
    </div>
  );
}
