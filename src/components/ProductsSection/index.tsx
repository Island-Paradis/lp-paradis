import React from "react";
import Badge from "../Badge";
import Button from "../Button";
import { Homepage, Project } from "../../../payload-types";
import Card from "../Card";

export default function ProductsSection({
  projects,
}: {
  projects: Homepage["projects"];
}) {
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
          Our Products
        </Badge>

        <div className="w-full h-full flex text-white gap-4 flex-col">
          <span>
            <h2 className="text-3xl font-medium">{projects?.title}</h2>
          </span>
          <span className="max-w-3xl">
            <p className="text-lg text-white/60">{projects?.subtitle}</p>
          </span>
        </div>
        <div>
          <Button
            className="px-14 py-2.5 text-primary font-semibold bg-white gap-3.5"
            variant="primary"
            trailingIcon="ArrowRight"
            iconProps={{
              width: 16,
            }}
          >
            <span>{projects?.primaryCta?.label}</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
        {projects?.items && projects.items.length > 0
          ? projects.items
              .filter((p): p is Project => typeof p === "object")
              .map((project, index) => (
                <Card
                  key={index}
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
              ))
          : null}
      </div>
    </div>
  );
}
