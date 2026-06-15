"use client";
import type { IconProps } from "@solar-icons/react";
import * as Icons from "@solar-icons/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type React from "react";
import { cn } from "@/lib/utils";

type IconName = keyof typeof Icons;

const buttonVariants = cva(
  "inline-flex items-center justify-center flex-row gap-3 rounded-full text-nowrap cursor-pointer transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-secondary text-primary hover:bg-secondary/10",
        // p/ fundos escuros (Footer, ProductsSection):
        inverted: "bg-white text-primary font-semibold hover:bg-white/90",
        "outline-inverted": "border border-white text-white hover:bg-white/10",
        // link-CTA (Card "Discover More"):
        link: "p-0 gap-2.5 rounded-none text-current hover:underline",
        // botão-ícone (hambúrguer):
        icon: "rounded-md text-neutral-600 hover:text-primary",
      },
      size: {
        sm: "px-5 py-2 text-sm",
        default: "px-6 py-3",
        lg: "px-14 py-2.5",
        icon: "p-2",
        none: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  trailingIcon?: IconName;
  iconProps?: IconProps;
  circleIcon?: boolean;
  asChild?: boolean;
}

export default function Button(props: ButtonProps) {
  const {
    className,
    variant,
    size,
    trailingIcon,
    iconProps,
    circleIcon,
    asChild = false,
    children,
    ...rest
  } = props;

  const Comp = asChild ? Slot.Root : "button";

  const IconComponent = trailingIcon
    ? (Icons[trailingIcon] as React.ComponentType<IconProps>)
    : null;

  // Slot requires a single React element child, so when `asChild` is set we
  // forward the children untouched (no extra icon wrapper).
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          {IconComponent && (
            <span
              className={cn(
                "icon inline-flex items-center justify-center",
                circleIcon && "rounded-full bg-primary p-1 text-white",
              )}
            >
              <IconComponent {...iconProps} />
            </span>
          )}
        </>
      )}
    </Comp>
  );
}

export { buttonVariants };
