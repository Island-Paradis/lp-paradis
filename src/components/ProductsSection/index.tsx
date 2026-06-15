import { isPopulated } from "@/lib/utils";
import type { Homepage, Project } from "../../../payload-types";
import Button from "../Button";
import Card from "../Card";
import SectionHeading from "../SectionHeading";

export default function ProductsSection({
  projects,
}: {
  projects: Homepage["projects"];
}) {
  const items = (projects?.items ?? []).filter(isPopulated<Project>);

  return (
    <div className="w-full h-full flex flex-col justify-start gap-14 px-14">
      <SectionHeading
        badge="Our Products"
        title={projects?.title}
        subtitle={projects?.subtitle}
      >
        <Button
          variant="inverted"
          size="lg"
          trailingIcon="ArrowRight"
          iconProps={{
            size: 24,
          }}
        >
          <span>{projects?.primaryCta?.label}</span>
        </Button>
      </SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
        {items.map((project) => (
          <Card
            key={project.id}
            className="text-white col-span-1 lg:col-span-4"
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
        ))}
      </div>
    </div>
  );
}
