import { Marquee } from "@/components/ui/marquee";
import { cn } from "@/lib/utils";
import type { Homepage, Testimonial } from "../../../payload-types";
import Badge from "../Badge";
import TestimonialCard from "../TestimonialCard";

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
  locale: "en" | "pt";
}) {
  const items = (testimonials?.items ?? []).filter(
    (p): p is Testimonial => typeof p === "object",
  );

  return (
    <div className="w-full h-full flex flex-col justify-start gap-14 px-14">
      <div className="w-full h-full flex flex-col justify-start gap-6">
        <Badge
          className="text-secondary max-w-40"
          icon="Widget6"
          iconProps={{
            weight: "Bold",
          }}
        >
          Testimonials
        </Badge>

        <div className="w-full h-full flex text-white gap-4 flex-col">
          <span>
            <h2 className="text-3xl font-medium">{testimonials?.title}</h2>
          </span>
          <span className="max-w-3xl">
            <p className="text-lg text-white/60">{testimonials?.subtitle}</p>
          </span>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="relative flex h-130 md:h-150 lg:h-170 flex-row gap-2 overflow-hidden mask-[linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]">
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
        </div>
      ) : null}
    </div>
  );
}
