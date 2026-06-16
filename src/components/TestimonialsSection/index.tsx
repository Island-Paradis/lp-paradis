import { Marquee } from "@/components/ui/marquee";
import type { Locale } from "@/i18n/routing";
import { cn, isPopulated } from "@/lib/utils";
import type { Homepage, Testimonial } from "../../../payload-types";
import SectionHeading from "../SectionHeading";
import TestimonialCard from "../TestimonialCard";
import { Reveal } from "../ui/reveal";

const columns = [
  { id: "col-1", reverse: true, className: "" }, // desce — sempre visível
  { id: "col-2", reverse: false, className: "hidden md:block" }, // sobe — a partir de md
  { id: "col-3", reverse: true, className: "hidden lg:block" }, // desce — a partir de lg
];

export default function TestimonialsSection({
  testimonials,
  locale,
}: {
  testimonials: Homepage["testimonials"];
  locale: Locale;
}) {
  const items = (testimonials?.items ?? []).filter(isPopulated<Testimonial>);

  return (
    <div className="w-full h-full flex flex-col justify-start gap-14 px-14">
      <Reveal>
        <SectionHeading
          badge="Testimonials"
          title={testimonials?.title}
          subtitle={testimonials?.subtitle}
        />
      </Reveal>
      {items.length > 0 ? (
        <Reveal className="relative flex h-130 md:h-150 lg:h-170 flex-row gap-2 overflow-hidden mask-[linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
          {columns.map((col) => (
            <div key={col.id} className={cn("h-full flex-1", col.className)}>
              <Marquee
                vertical
                reverse={col.reverse}
                pauseOnHover
                className="h-full w-full [--duration:40s]"
              >
                {items.map((testimonial, index) => (
                  <TestimonialCard
                    key={`${col.id}-${testimonial.id ?? index}`}
                    testimonial={testimonial}
                    locale={locale}
                  />
                ))}
              </Marquee>
            </div>
          ))}
        </Reveal>
      ) : null}
    </div>
  );
}
