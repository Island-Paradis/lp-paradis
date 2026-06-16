"use client";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Hero as Herotype } from "../../../payload-types";
import Button from "../Button";
import { CursorGlow } from "../ui/cursor-glow";
import { GridPattern } from "../ui/grid-pattern";

interface HeroProps extends Herotype {}

export default function Hero(args: HeroProps) {
  const shouldReduceMotion = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1 },
    },
  };
  const item = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <div className="bg-background relative flex size-full cursor-none items-center justify-center overflow-hidden rounded-lg border p-20">
      <GridPattern
        width={90}
        height={30}
        x={-1}
        y={-1}
        className={cn(
          "mask-[radial-gradient(ellipse_80%_80%_at_center,transparent,white)]",
          "[-webkit-mask-image:radial-gradient(ellipse_80%_80%_at_center,transparent,white)]",
        )}
      />
      <div className="relative z-10 text-center bg-background/90 p-10 rounded-xl">
        <motion.div
          className="mx-auto max-w-4xl py-20 flex flex-col items-center gap-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            variants={item}
            className="font-gilroy text-6xl font-bold tracking-tight bg-linear-to-r from-[#151718] to-[#6E797E] bg-clip-text text-transparent leading-20"
          >
            {args.headline}
          </motion.h1>
          <motion.span variants={item} className="max-w-lg">
            <p className="text-lg text-primary leading-8">{args.description}</p>
          </motion.span>
          <motion.span
            variants={item}
            className="w-full max-w-106.5 flex items-center justify-center gap-4"
          >
            {args.primaryCta && (
              <Button className="w-full" variant="primary">
                {args.primaryCta.label}
              </Button>
            )}
            {args.secondaryCta && (
              <Button className="w-full" variant="outline">
                {args.secondaryCta.label}
              </Button>
            )}
          </motion.span>
        </motion.div>
      </div>
      <CursorGlow className="z-20" />
    </div>
  );
}
