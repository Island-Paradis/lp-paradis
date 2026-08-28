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
    <div className="bg-background relative flex size-full items-center justify-center overflow-hidden rounded-lg border p-4 sm:p-10 lg:p-20">
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
      <div className="relative z-10 text-center bg-background/90 p-4 sm:p-8 lg:p-10 rounded-xl">
        <motion.div
          className="mx-auto max-w-4xl py-10 lg:py-20 flex flex-col items-center gap-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            // O Hero anima no mount, sem observer, mas o estado inicial é o
            // mesmo `opacity: 0` das primitivas e chega assim no HTML do
            // servidor — logo, precisa da mesma rede de segurança.
            data-reveal
            variants={item}
            className="relative cursor-none font-gilroy text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight gradient-text leading-tight lg:leading-20"
          >
            {args.headline}
            <CursorGlow className="z-20" />
          </motion.h1>
          <motion.div data-reveal variants={item} className="max-w-lg">
            <p className="text-lg text-primary leading-8">{args.description}</p>
          </motion.div>
          <motion.div
            data-reveal
            variants={item}
            className="w-full max-w-106.5 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {args.primaryCta && (
              <Button className="w-full" variant="primary" magnetic textSwap>
                {args.primaryCta.label}
              </Button>
            )}
            {args.secondaryCta && (
              <Button className="w-full" variant="outline" magnetic textSwap>
                {args.secondaryCta.label}
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
