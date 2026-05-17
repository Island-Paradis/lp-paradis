import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Hero from "@/components/Hero";
import MarqueeServices from "@/components/MarqueeServices";
import { getHomepagePayload } from "@/service/payload-functions";

export default async function Home(
  props: {
    params: Promise<{ locale: "en" | "pt" }>;
  }
) {
  const params = await props.params;

  const {locale} = params;
  const { hero, services, projects } = await getHomepagePayload(locale);

  return (
    <main>
      {hero && hero.item && hero.enabled && <Hero {...hero.item} />}
      {services && services.items && services.items.length > 0 && (
        <MarqueeServices services={services.items} />
      )}
      <div className="w-full h-full flex flex-col items-center justify-center">
        <section className="container lg:mx-auto px-4 xl:px-0 py-12 flex flex-col gap-5 leading-8">
          <div className="flex flex-col">
            <div className="w-full max-w-xl flex flex-col items-center justify-center gap-6">
              <span>
                <h2 className="text-4xl font-medium">{services?.title}</h2>
              </span>
              <span>
                <p className="text-lg text-primary">{services?.subtitle}</p>
              </span>
            </div>
            <div className="max-w-3xs flex items-center justify-center">
              <Button
                className="mt-8 px-6 py-3 [&_.icon]:rounded-full [&_.icon]:bg-primary [&_.icon]:p-1 [&_.icon]:text-white"
                variant="outline"
                trailingIcon="ArrowRightDown"
              >
                <span>{services?.primaryCta?.label}</span>
              </Button>
            </div>
          </div>
          <div>
            <div className="bg-primary w-1/2 rounded-t-2xl py-10" />
            <div className="bg-primary flex flex-col px-14 h-full rounded-b-2xl rounded-tr-2xl py-12 gap-32">
              <div className="w-full h-full flex flex-col justify-start gap-6">
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
              <div className="w-full h-full flex flex-col justify-start gap-14">
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
                      <h2 className="text-3xl font-medium">
                        {projects?.title}
                      </h2>
                    </span>
                    <span className="max-w-3xl">
                      <p className="text-lg text-white/60">
                        {projects?.subtitle}
                      </p>
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
                    ? projects.items.map((project, index) => (
                        <Card
                          key={index}
                          className="text-white col-span-1 lg:col-span-4 "
                          title={project.title}
                          description={project.description}
                          image={{
                            src:
                              (typeof project.coverImage === "object" &&
                                project.coverImage?.url) ||
                              "",
                            alt: project.title || "",
                          }}
                          anchor={{
                            label: "Discover More",
                            href: project.url || "#",
                          }}
                        />
                      ))
                    : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
