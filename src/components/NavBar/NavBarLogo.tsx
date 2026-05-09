import Image from "next/image";
import React from "react";

interface NavBarLogoProps {
  imgSrc: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function NavBarLogo({
  imgSrc,
  width = 134,
  height = 25,
  className,
}: NavBarLogoProps) {
  return (
    <div className={className}>
      <Image src={imgSrc} alt="Logo" width={width} height={height} />
    </div>
  );
}
