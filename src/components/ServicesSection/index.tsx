"use client";
import {
  Chart,
  Cpu,
  Filters,
  Laptop,
  Palette2,
  ServerPath,
  Smartphone,
} from "@solar-icons/react";
import type React from "react";
import type { PopulatedHomepage } from "@/service/types";
import Badge from "../Badge";

type ServiceLayoutSpacer = { transparent: true; className: string };

type ServiceLayoutCard = {
  // Merge key — must match the service `slug` created in Payload.
  slug: string;
  Icon: React.ElementType;
  className: string;
  fallbackName: string;
  fallbackDescription: string;
};

type ServiceLayoutCell = ServiceLayoutSpacer | ServiceLayoutCard;

// The grid layout (positions + spacers + icons) lives in code, keyed by slug.
// The CMS only provides the content (title / shortDescription), merged by slug.
const SERVICE_LAYOUT: ServiceLayoutCell[] = [
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
    slug: "uiux-design",
    Icon: Palette2,
    fallbackName: "UI/UX Design",
    fallbackDescription:
      "Designing intuitive and engaging digital experiences that users love.",
    className:
      "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-4 md:row-start-2",
  },
  {
    slug: "brand-identity",
    Icon: Filters,
    fallbackName: "Brand Identity",
    fallbackDescription:
      "Building memorable visual identities that elevate your brand presence.",
    className:
      "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-7 md:row-start-2",
  },
  {
    slug: "mobile-development",
    Icon: Smartphone,
    fallbackName: "Mobile Development",
    fallbackDescription:
      "Creating fast, scalable, and user-focused mobile applications.",
    className:
      "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-2 md:row-start-4",
  },
  {
    slug: "web-development",
    Icon: Laptop,
    fallbackName: "Web Development",
    fallbackDescription:
      "Developing modern websites and web platforms built for performance.",
    className:
      "min-h-[120px] md:min-h-0 md:col-span-4 md:row-span-2 md:col-start-5 md:row-start-4",
  },
  {
    slug: "api-integrations",
    Icon: ServerPath,
    fallbackName: "API & Integrations",
    fallbackDescription:
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
    slug: "ai-solutions",
    Icon: Cpu,
    fallbackName: "AI Solutions",
    fallbackDescription:
      "AI-powered solutions that automate and enhance digital experiences.",
    className:
      "min-h-[120px] md:min-h-0 md:col-span-3 md:row-span-2 md:col-start-4 md:row-start-6",
  },
  {
    slug: "product-strategy",
    Icon: Chart,
    fallbackName: "Product Strategy",
    fallbackDescription:
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

export default function ServicesSection({
  services,
}: {
  services: PopulatedHomepage["services"];
}) {
  // Merge by slug: pull editable content from the CMS, falling back to the
  // hardcoded copy when a slot has no matching service.
  const servicesBySlug = new Map(
    (services?.items ?? []).map((s) => [s.slug, s] as const),
  );

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
        {SERVICE_LAYOUT.map((cell) => {
          if ("transparent" in cell) {
            return (
              <div
                key={cell.className}
                className={`${cell.className} bg-white/5 border rounded-xl border-white/5 pointer-events-none`}
              />
            );
          }
          const service = servicesBySlug.get(cell.slug);
          const name = service?.title ?? cell.fallbackName;
          const description =
            service?.shortDescription ?? cell.fallbackDescription;
          const ItemIcon = cell.Icon;
          return (
            <div
              className={`${cell.className} bg-linear-to-b from-white/10 to-white/0 border border-white/5 rounded-xl overflow-hidden flex flex-col justify-start p-4 gap-2 `}
              key={cell.slug}
            >
              <span className="w-full h-full flex flex-row justify-start items-center gap-2 text-white">
                {ItemIcon && <ItemIcon weight="Bold" color="#fff" />}
                <h3 className="text-base md:text-sm font-medium text-nowrap">
                  {name}
                </h3>
              </span>
              <span>
                <p className="text-base md:text-sm font-normal text-white/60">
                  {description}
                </p>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
