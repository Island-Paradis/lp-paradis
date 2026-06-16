import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/components/ui/scroll-based-velocity";
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
          <ScrollVelocityContainer className="flex h-full w-full flex-row gap-2">
            {columns.map((col) => (
              <div key={col.id} className={cn("h-full flex-1", col.className)}>
                <ScrollVelocityRow
                  vertical
                  pauseOnHover
                  baseVelocity={2.5}
                  direction={col.reverse ? -1 : 1}
                  className="h-full"
                >
                  {items.map((testimonial, index) => (
                    <div
                      key={`${col.id}-${testimonial.id ?? index}`}
                      className="w-full pb-4"
                    >
                      <TestimonialCard
                        testimonial={testimonial}
                        locale={locale}
                      />
                    </div>
                  ))}
                </ScrollVelocityRow>
              </div>
            ))}
          </ScrollVelocityContainer>
        </Reveal>
      ) : null}
    </div>
  );
}
