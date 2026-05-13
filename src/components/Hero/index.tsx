"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { GridPattern } from "../ui/grid-pattern";
import { Hero as Herotype } from "../../../payload-types";

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
      <div className="relative z-10 text-center bg-background/90 p-10 rounded-lg">
        <div className="mx-auto max-w-4xl py-20 flex flex-col items-center gap-8">
          <h1 className="font-gilroy text-6xl font-bold tracking-tight bg-linear-to-r from-[#151718] to-[#6E797E] bg-clip-text text-transparent">
            {args.headline}
          </h1>
          <span className="max-w-lg">
            <p className="text-lg text-primary">{args.description}</p>
          </span>
        </div>
      </div>
    </div>
  );
}
