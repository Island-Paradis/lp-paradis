"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { GridPattern } from "../ui/grid-pattern";
import { Hero as Herotype } from "../../../payload-types";
import Button from "../Button";

interface HeroProps extends Herotype {}

export default function Hero(args: HeroProps) {
  return (
    <div className="bg-background relative flex size-full items-center justify-center overflow-hidden rounded-lg border p-20">
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
        <div className="mx-auto max-w-4xl py-20 flex flex-col items-center gap-8">
          <h1 className="font-gilroy text-6xl font-bold tracking-tight bg-linear-to-r from-[#151718] to-[#6E797E] bg-clip-text text-transparent leading-20">
            {args.headline}
          </h1>
          <span className="max-w-lg">
            <p className="text-lg text-primary leading-8">{args.description}</p>
          </span>
          <span className="w-full max-w-106.5 flex items-center justify-center gap-4">
            {args.primaryCta && (
              <Button className="w-full" variant="primary">{args.primaryCta.label}</Button>
            )}
            {args.secondaryCta && (
              <Button className="w-full" variant="outline">{args.secondaryCta.label}</Button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
