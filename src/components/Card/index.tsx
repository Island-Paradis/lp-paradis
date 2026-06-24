"use client";
import { ArrowRight } from "@solar-icons/react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Button from "../Button";

export interface CardProps {
  className?: string;
  title: string;
  description: string;
  image: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
  // Matches the rendered width of the card so next/image serves a large enough
  // variant instead of upscaling a tiny one. Default mirrors the products grid.
  sizes?: string;
  anchor: {
    label: string;
    href: string;
  };
}

export default function Card({
  className,
  title,
  description,
  image,
  sizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
  anchor,
}: CardProps) {
  return (
    <div className={cn("w-full flex flex-col gap-5", className)}>
      <div className="w-full h-64.5  ">
        <Image
          src={image.src}
          alt={image.alt}
          height={image.height || 374}
          width={image.width || 254}
          sizes={sizes}
          className="object-cover w-full h-full rounded-lg"
        />
      </div>
      <div className="w-full flex flex-col gap-4 px-3">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm">{title}</h3>
          <p className="text-2xl font-medium">{description}</p>
        </div>
        <Link
          href={anchor.href}
          className="flex items-center gap-4 hover:underline underline-offset-8"
        >
          {anchor.label}
          <ArrowRight width={24} />
        </Link>
      </div>
    </div>
  );
}
