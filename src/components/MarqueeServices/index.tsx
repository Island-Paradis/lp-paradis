"use client";
import { Marquee } from "../ui/marquee";
import { Service } from "../../../payload-types";
import { LightbulbMinimalistic } from "@solar-icons/react";

export default function MarqueeServices(args: { services: Service[] }) {
  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-7">
      <Marquee pauseOnHover className="[--duration:20s]">
        {args.services.map((service) => (
          <div
            key={service.id}
            className="group/item flex items-center gap-4 justify-center text-primary/60 fill-primary/60 hover:text-primary hover:fill-primary transition-colors duration-300"
          >
            <span className="h-full flex items-center justify-center">
              <LightbulbMinimalistic width={24} height={24} className="group-hover/item:hidden" />
              <LightbulbMinimalistic width={24} height={24} weight="Bold" className="hidden group-hover/item:block" />
            </span>
            <span className="text-xl font-medium">{service.title.toUpperCase()}</span>
          </div>
        ))}
      </Marquee>
    </div>
  );
}
