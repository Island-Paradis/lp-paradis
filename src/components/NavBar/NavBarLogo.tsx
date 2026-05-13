import Image from "next/image";
import Link from "next/link";
import React from "react";

interface NavBarLogoProps {
  imgSrc: string;
  href?: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function NavBarLogo({
  imgSrc,
  href = "/",
  width = 134,
  height = 25,
  className,
}: NavBarLogoProps) {
  return (
    <Link href={href} className={className}>
      <Image src={imgSrc} alt="Logo" width={width} height={height} />
    </Link>
  );
}
