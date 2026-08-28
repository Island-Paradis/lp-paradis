import { Widget6 } from "@solar-icons/react";
import type { ReactNode } from "react";
import Badge from "../Badge";
import { TextReveal } from "../ui/text-reveal";

interface SectionHeadingProps {
  badge: ReactNode;
  title?: string | null;
  subtitle?: string | null;
  // Optional trailing content (e.g. a CTA button) rendered below the text.
  children?: ReactNode;
}

// Shared header used by the dark sections (Products, Testimonials):
// a "Widget6" badge, a title and a constrained subtitle.
export default function SectionHeading({
  badge,
  title,
  subtitle,
  children,
}: SectionHeadingProps) {
  return (
    <div className="w-full h-full flex flex-col justify-start gap-6">
      <Badge
        className="text-secondary max-w-40"
        icon={Widget6}
        iconProps={{
          weight: "Bold",
        }}
      >
        {badge}
      </Badge>

      <div className="w-full h-full flex text-white gap-4 flex-col">
        {title ? (
          <TextReveal as="h2" className="text-3xl font-medium">
            {title}
          </TextReveal>
        ) : null}
        <div className="max-w-3xl">
          <p className="text-lg text-white/60">{subtitle}</p>
        </div>
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}
