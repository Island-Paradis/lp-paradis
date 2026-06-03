"use client";
import Badge from "../Badge";
import { Homepage } from "../../../payload-types";
import { BentoGrid } from "../ui/bento-grid";
import {
  ServerPath,
  Palette2,
  Filters,
  Smartphone,
  Cpu,
  Chart,
  Laptop,
} from "@solar-icons/react";

export type ServicesAvailableCard = {
  Icon?: React.ElementType;
  name?: string;
  description?: string;
  transparent?: boolean;
  className: string;
};

export default function ServicesSection({
  services,
}: {
  services: Homepage["services"];
}) {
  const servicesAvailable: ServicesAvailableCard[] = [
    {
      transparent: true,
      className:
        "hidden md:block md:col-span-3 md:row-span-3 md:col-start-1 md:row-start-1",
    }, // 6
    {
      transparent: true,
      className: "hidden md:block md:col-span-6 md:col-start-4 md:row-start-1",
    }, // 8
    {
      transparent: true,
      className:
        "hidden md:block md:col-span-3 md:row-span-3 md:col-start-10 md:row-start-1",
    }, // 5
    {
      Icon: Palette2,
      name: "UI/UX Design",
      description:
        "Designing intuitive and engaging digital experiences that users love.",
      className:
        "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-4 md:row-start-2",
    },
    {
      Icon: Filters,
      name: "Brand Identity",
      description:
        "Building memorable visual identities that elevate your brand presence.",
      className:
        "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-7 md:row-start-2",
    },
    {
      Icon: Smartphone,
      name: "Mobile Development",
      description:
        "Creating fast, scalable, and user-focused mobile applications.",
      className:
        "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-2 md:row-start-4",
    },
    {
      Icon: Laptop,
      name: "Web Development",
      description:
        "Developing modern websites and web platforms built for performance.",
      className:
        "min-h-[120px] md:min-h-0 md:col-span-4 md:row-span-2 md:col-start-5 md:row-start-4",
    },
    {
      Icon: ServerPath,
      name: "API & Integrations",
      description:
        "Connecting systems and services to streamline digital operations.",
      className:
        "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-9 md:row-start-4",
    },
    {
      transparent: true,
      className:
        "hidden md:block md:col-span-3 md:row-span-4 md:col-start-1 md:row-start-6",
    }, // 23
    {
      Icon: Cpu,
      name: "AI Solutions",
      description:
        "AI-powered solutions that automate and enhance digital experiences.",
      className:
        "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-4 md:row-start-6",
    },
    {
      Icon: Chart,
      name: "Product Strategy",
      description:
        "Strategic guidance for smarter digital growth and innovation.",
      className:
        "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-7 md:row-start-6",
    },
    {
      transparent: true,
      className:
        "hidden md:block md:col-span-3 md:row-span-4 md:col-start-10 md:row-start-6",
    }, // 24
    {
      transparent: true,
      className:
        "hidden md:block md:col-span-6 md:row-span-2 md:col-start-4 md:row-start-8",
    }, // 22
  ];

  return (
    <div className="w-full h-full flex flex-col justify-start gap-6">
      <div className="w-full h-full flex flex-col justify-start gap-6 px-14">
        <Badge
          className="text-secondary max-w-40"
          icon="Widget6"
          iconProps={{
            weight: "Bold",
          }}
        >
          Our Services
        </Badge>
        <div className="w-full h-full flex text-white gap-4 flex-col">
          <span>
            <h2 className="text-3xl font-medium">
              {services?.ourServicesCT?.title}
            </h2>
          </span>
          <span className="max-w-3xl">
            <p className="text-lg text-white/60">
              {services?.ourServicesCT?.description}
            </p>
          </span>
        </div>
      </div>
      <div className="px-14 md:px-0 flex flex-col md:grid relative w-full  md:grid-cols-12 md:grid-rows-[repeat(20px)] md:auto-rows-[60px] gap-4 after:pointer-events-none after:absolute after:inset-0 after:z-10 after:bg-[linear-gradient(121.55deg,rgba(21,23,24,0.01)_39.57%,rgba(255,255,255,0.01)_83.97%)]">
        <div className="hidden md:block absolute inset-0 z-20 pointer-events-none [background:radial-gradient(ellipse_65%_55%_at_center,transparent_55%,var(--color-primary)_92%)]" />
        {servicesAvailable.map((item, i) => {
          if (item.transparent) {
            return (
              <div
                key={i}
                className={`${item.className} bg-white/5 border rounded-xl border-white/5 pointer-events-none`}
              />
            );
          }
          const ItemIcon = item.Icon;
          return (
            <div
              className={`${item.className} bg-linear-to-b from-white/10 to-white/0 border border-white/5 rounded-xl overflow-hidden flex flex-col justify-start p-4 gap-2 `}
              key={i}
            >
              <span className="w-full h-full flex flex-row justify-start items-center gap-2 text-white">
                {ItemIcon && <ItemIcon weight="Bold" color="#fff" />}
                <h3 className="text-base md:text-sm font-medium text-nowrap">
                  {item.name}
                </h3>
              </span>
              <span>
                <p className="text-base md:text-sm font-normal text-white/60">
                  {item.description}
                </p>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
