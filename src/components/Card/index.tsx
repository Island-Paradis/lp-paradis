"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@solar-icons/react";
import { twJoin } from "tailwind-merge";

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
  anchor,
}: CardProps) {
  return (
    <div className={twJoin("w-full flex flex-col gap-5", className)}>
      <div className="w-full h-64.5  ">
        <Image
          src={image.src}
          alt={image.alt}
          height={image.height || 374}
          width={image.width || 254}
          className="object-cover w-full h-full rounded-lg"
        />
      </div>
      <div className="w-full flex flex-col gap-4 px-3">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm">{title}</h3>
          <p className="text-2xl font-medium">{description}</p>
        </div>

        <Link className="flex items-center gap-2.5" href={anchor.href}>
          {anchor.label}
          <ArrowRight width={16} />
        </Link>
      </div>
    </div>
  );
}
