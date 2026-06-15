import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import FAQSection from "@/components/FAQSection";
import Hero from "@/components/Hero";
import MarqueeServices from "@/components/MarqueeServices";
import ProductsSection from "@/components/ProductsSection";
import ServicesSection from "@/components/ServicesSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import { getHomepagePayload } from "@/service/payload-functions";

export default async function Home(props: {
  params: Promise<{ locale: "en" | "pt" }>;
}) {
  const params = await props.params;

  const { locale } = params;
  const { hero, services, projects, faqs, testimonials } =
    await getHomepagePayload(locale);

  const bgVideo = services?.ourServicesCT?.backgroundVideo;
  const videoUrl =
    bgVideo && typeof bgVideo === "object"
      ? (bgVideo.url ?? undefined)
      : undefined;

  return (
    <main>
      {hero && hero.item && hero.enabled && <Hero {...hero.item} />}
      {services && services.items && services.items.length > 0 && (
        <MarqueeServices services={services.items} />
      )}
      <div className="w-full h-full flex flex-col items-center justify-center pb-11">
        <section className="container lg:mx-auto px-4 xl:px-0 py-12 flex flex-col gap-5 leading-8">
          <div className="w-full xl:w-149.5 h-full flex flex-col gap-6 py-10 z-10">
            <div className="w-full flex flex-col items-center justify-center gap-6 ">
              <span>
                <h2 className="font-gilroy text-4xl font-medium">
                  {services?.title}
                </h2>
              </span>
              <span>
                <p className="text-xl text-primary">{services?.subtitle}</p>
              </span>
            </div>
            <div className="w-full flex justify-start">
              <Button
                variant="outline"
                trailingIcon="ArrowRightDown"
                circleIcon
              >
                <span>{services?.primaryCta?.label}</span>
              </Button>
            </div>
          </div>
          <div className="w-full sm:relative xl:-mt-102 sm:pt-102 flex flex-col items-center justify-center gap-6">
            <div className="hidden sm:block w-full xl:w-149.5 h-117.5 bg-primary video_shape sm:absolute right-0 top-0 rounded-2xl relative overflow-hidden">
              <video
                className="absolute inset-0 w-full h-full object-fill"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            </div>
            <div className="bg-primary flex flex-col rounded-l-2xl rounded-br-2xl pb-12 pt-12 sm:pt-34 gap-32 services_shape rounded-2xl">
              {services && <ServicesSection services={services} />}
              {projects && <ProductsSection projects={projects} />}
              {testimonials && (
                <TestimonialsSection
                  testimonials={testimonials}
                  locale={locale}
                />
              )}
            </div>
          </div>
        </section>
        <section className="container lg:mx-auto px-4 xl:px-0 py-12 flex flex-col gap-5 leading-8">
          {faqs && <FAQSection {...faqs} />}
        </section>
      </div>
    </main>
  );
}
