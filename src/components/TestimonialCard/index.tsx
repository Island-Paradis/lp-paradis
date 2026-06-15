import {
  SiDiscord,
  SiFacebook,
  SiGithub,
  SiInstagram,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { Globe } from "lucide-react";
import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import type { Locale } from "@/i18n/routing";
import type { Testimonial } from "../../../payload-types";

type IconComponent = ComponentType<{ className?: string }>;

// LinkedIn was removed from Simple Icons (legal takedown), so we inline its logo.
function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>LinkedIn</title>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<Testimonial["social"], IconComponent> = {
  instagram: SiInstagram,
  linkedin: LinkedinIcon,
  twitter: SiX,
  facebook: SiFacebook,
  youtube: SiYoutube,
  github: SiGithub,
  whatsapp: SiWhatsapp,
  discord: SiDiscord,
  other: Globe,
};

function formatTestimonialDate(iso: string, locale: string) {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  const day = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  return `${time} · ${day}`;
}

export default function TestimonialCard({
  testimonial,
  locale,
}: {
  testimonial: Testimonial;
  locale: Locale;
}) {
  const SocialIcon = SOCIAL_ICONS[testimonial.social] ?? Globe;

  return (
    <div className=" p-6 flex flex-col gap-4 w-full rounded-[20px] bg-white/3 shadow-xl/5 border-3 border-white/10">
      <div className="w-full flex flex-row gap-2.5">
        <Image
          src={
            (typeof testimonial.avatar === "object" &&
              testimonial.avatar?.url) ||
            ""
          }
          alt={`avatar ${testimonial.authorName}`}
          width={34}
          height={34}
          className="w-8 h-8 shrink-0 rounded-full object-cover"
        />
        <div className=" w-full flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <span className="text-white text-xs font-medium">
              {testimonial.authorName}
            </span>
            <span className="text-white/50 text-xs font-medium">
              {testimonial.tag}
            </span>
          </div>
          <SocialIcon className="size-4 text-white/60" />
        </div>
      </div>
      <div className="flex flex-col w-full text-white/56">
        {testimonial.quote}
      </div>
      <div className="flex flex-col w-full text-white/56">
        {formatTestimonialDate(testimonial.updatedAt, locale)}
      </div>
    </div>
  );
}
