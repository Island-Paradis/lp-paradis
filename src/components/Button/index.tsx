"use client";
import type { IconProps } from "@solar-icons/react/lib/types";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { Slot } from "radix-ui";
import type React from "react";
import { useMagnetic } from "@/lib/use-magnetic";
import { cn } from "@/lib/utils";

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
  // O componente do ícone, já importado pelo call site — não o seu nome.
  //
  // A API anterior recebia uma string e resolvia com `Icons[nome]` sobre um
  // `import * as`. As duas coisas juntas tornam o tree-shaking impossível: o
  // bundler não consegue provar quais exports são usados e retém o namespace
  // inteiro. Medido: 12,7 MB, 93% dos bytes de cliente da rota, para servir
  // dois call sites. Ver a capability `client-bundle-budget`.
  trailingIcon?: React.ComponentType<IconProps>;
  iconProps?: IconProps;
  circleIcon?: boolean;
  asChild?: boolean;
  // Magnetic pull toward the cursor while hovered (dstudio-style CTAs).
  magnetic?: boolean;
  // Vertical text-swap on hover: the label slides up while a copy slides in
  // from below (dstudio-style). Ignored when `asChild` is set.
  textSwap?: boolean;
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
    magnetic = false,
    textSwap = false,
    children,
    ...rest
  } = props;

  const swap = textSwap && !asChild;

  // On hover, text-swap buttons invert their colours to match the source. The
  // background swap is directional: a `fill` layer slides up from the bottom on
  // hover and back down on leave (see the span below), while `text` inverts the
  // label/border on the button itself. Plain `hover:` (not `group-hover:`,
  // which only targets descendants of a hovered .group) with `!` to override
  // each variant's own hover colours.
  const swapInvert: Record<string, { text: string; fill: string }> = {
    primary: { text: "hover:text-primary!", fill: "bg-white" },
    outline: {
      text: "hover:text-white! hover:border-primary!",
      fill: "bg-primary",
    },
    inverted: { text: "hover:text-white!", fill: "bg-primary" },
    "outline-inverted": {
      text: "hover:text-primary! hover:border-white!",
      fill: "bg-white",
    },
  };
  const invert = swap ? swapInvert[variant ?? "primary"] : undefined;

  // Apply the magnetic transform to the button element itself (no wrapper) so
  // layout classes like `w-full` keep working. Only when `asChild` is set do we
  // fall back to wrapping, since a Slot child can't take motion values.
  // Typed as ElementType so the polymorphic element accepts motion style values.
  const Comp: React.ElementType = asChild
    ? Slot.Root
    : magnetic
      ? motion.button
      : "button";

  const IconComponent = trailingIcon ?? null;

  const {
    ref: magneticRef,
    x,
    y,
    onMouseMove,
    onMouseLeave,
  } = useMagnetic({ strength: 0.4 });

  // Motion values on `style` aren't part of the plain <button> prop types, so
  // this is spread through a loose record onto the polymorphic `Comp`.
  const magneticProps: Record<string, unknown> =
    magnetic && !asChild
      ? {
          ref: magneticRef,
          style: { x, y },
          onMouseMove,
          onMouseLeave,
        }
      : {};

  // The label. When `swap` is on, two stacked copies share one grid cell inside
  // an `overflow-hidden` mask: on hover the first slides up and the second rises
  // in from below. The trailing icon stays outside the swap.
  const label = swap ? (
    <span className="relative inline-grid overflow-hidden">
      <span className="col-start-1 row-start-1 block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="col-start-1 row-start-1 block translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0"
      >
        {children}
      </span>
    </span>
  ) : (
    children
  );

  const content = (
    <>
      {label}
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
  );

  const inner = (
    // Slot requires a single React element child, so when `asChild` is set we
    // forward the children untouched (no extra icon wrapper).
    <Comp
      data-cursor="hover"
      className={cn(
        buttonVariants({ variant, size }),
        swap && "group relative overflow-hidden isolate duration-500",
        invert?.text,
        className,
      )}
      {...rest}
      {...magneticProps}
    >
      {invert && (
        // Directional colour swap: the inverted background slides up from the
        // bottom on hover and back down on leave (transition reverses itself).
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0",
            invert.fill,
          )}
        />
      )}
      {asChild ? (
        children
      ) : swap ? (
        <span className="relative z-10 inline-flex items-center gap-3">
          {content}
        </span>
      ) : (
        content
      )}
    </Comp>
  );

  if (!magnetic || !asChild) return inner;

  // `asChild` renders a Slot child that can't receive motion values, so wrap it
  // in a magnetic span (the non-asChild path applies the transform inline).
  return (
    <motion.span
      ref={magneticRef as React.Ref<HTMLSpanElement>}
      className="inline-flex"
      style={{ x, y }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {inner}
    </motion.span>
  );
}

export { buttonVariants };
