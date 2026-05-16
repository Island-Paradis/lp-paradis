import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Hero from "@/components/Hero";
import MarqueeServices from "@/components/MarqueeServices";
import { getHomepagePayload } from "@/service/payload-functions";
import config from "@payload-config";
import { getPayload } from "payload";

export default async function Home() {
  const { hero, services } = await getHomepagePayload("en");

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
            <div className="bg-primary flex flex-col px-14 h-full rounded-b-2xl rounded-tr-2xl py-12 gap-6">
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
          </div>
        </section>
      </div>
    </main>
  );
}
