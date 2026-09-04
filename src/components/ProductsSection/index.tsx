import { ArrowRight } from "@solar-icons/react";
import { isPopulated } from "@/lib/utils";
import type { Homepage, Project } from "../../../payload-types";
import CalendlyCta from "../CalendlyCta";
import Card from "../Card";
import SectionHeading from "../SectionHeading";
import { Reveal } from "../ui/reveal";

export default function ProductsSection({
  projects,
  ctaHref,
}: {
  projects: Homepage["projects"];
  // Destino do CTA, já resolvido pelo servidor — prefixo de locale aplicado ao
  // que é interno, `undefined` quando não há destino authorado. O componente
  // não recebe o locale, à imagem do `Hero`.
  ctaHref?: string;
}) {
  const items = (projects?.items ?? []).filter(isPopulated<Project>);

  return (
    <div className="w-full h-full flex flex-col justify-start gap-14 px-14">
      <Reveal>
        <SectionHeading
          badge="Our Products"
          title={projects?.title}
          subtitle={projects?.subtitle}
        >
          <CalendlyCta
            variant="inverted"
            size="lg"
            href={ctaHref}
            trailingIcon={ArrowRight}
            iconProps={{
              size: 24,
            }}
            magnetic
            textSwap
          >
            <span>{projects?.primaryCta?.label}</span>
          </CalendlyCta>
        </SectionHeading>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
        {items.map((project, index) => (
          <Reveal
            key={project.id}
            delay={Math.min(index * 0.08, 0.4)}
            className="col-span-1 lg:col-span-4"
          >
            <Card
              className="text-white w-full"
              title={project.title}
              description={project.description}
              image={{
                src:
                  (typeof project.coverImage === "object" &&
                    project.coverImage?.url) ||
                  "",
                alt: project.title,
              }}
              anchor={{
                label: "Discover More",
                href: project.url,
              }}
            />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
