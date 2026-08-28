import { ArrowRightDown } from "@solar-icons/react";
import Button from "@/components/Button";
import FAQSection from "@/components/FAQSection";
import Hero from "@/components/Hero";
import MarqueeServices from "@/components/MarqueeServices";
import ProductsSection from "@/components/ProductsSection";
import ServicesSection from "@/components/ServicesSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import { Parallax } from "@/components/ui/parallax";
import { Reveal } from "@/components/ui/reveal";
import { TextReveal } from "@/components/ui/text-reveal";
import type { Locale } from "@/i18n/routing";
import { getHomepagePayload } from "@/service/payload-functions";

export default async function Home(props: {
  params: Promise<{ locale: Locale }>;
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
        <section className="container w-full mx-auto px-4 xl:px-0 py-12 flex flex-col gap-5 leading-8">
          <Reveal className="w-full xl:w-149.5 h-full flex flex-col gap-6 py-10 z-10">
            <div
              className="w-full flex flex-col items-center justify-center gap-6 "
              id="about-us"
            >
              <div>
                {services?.title && (
                  <TextReveal
                    as="h2"
                    className="font-gilroy text-4xl font-medium text-neutral-900"
                  >
                    {services.title}
                  </TextReveal>
                )}
              </div>
              <div>
                <p className="text-xl text-muted-foreground">
                  {services?.subtitle}
                </p>
              </div>
            </div>
            <div className="w-full flex justify-start">
              <Button
                variant="outline"
                trailingIcon={ArrowRightDown}
                circleIcon
                magnetic
                textSwap
              >
                <span>{services?.primaryCta?.label}</span>
              </Button>
            </div>
          </Reveal>
          <div className="w-full md:relative xl:-mt-102 md:pt-102 flex flex-col items-center justify-center gap-6 services_notch_corner">
            <div className="hidden md:block w-full xl:w-149.5 h-117.5 bg-primary video_shape md:absolute right-0 top-0 rounded-2xl relative overflow-hidden">
              <Parallax className="absolute inset-0" amount={6}>
                {/* Oversized so the parallax travel never reveals empty edges. */}
                <video
                  className="h-[112%] w-full mt-[-6%] object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  {/*
                    `media` no `<source>`, e não um gate em JavaScript.

                    O wrapper é `hidden md:block`, mas `display: none` não
                    impede o browser de buscar um `<video autoplay>` — medido:
                    8,5 MB baixados a 375px de largura, 69% do peso da página.

                    Quando nenhum `<source>` casa com o `media`, nada é
                    buscado. A alternativa seria um client component com
                    `matchMedia`, e este projeto já tem cicatriz exatamente aí
                    (ver o comentário em `HydrationSignal` sobre o React #418
                    causado por estado que diverge entre servidor e cliente).

                    Custo aceito: `media` é avaliado na seleção do source e não
                    é reavaliado em resize. Redimensionar de mobile para
                    desktop na mesma sessão deixa a área sem vídeo até um
                    reload.
                  */}
                  <source
                    src={videoUrl}
                    type="video/mp4"
                    media="(min-width: 768px)"
                  />
                </video>
              </Parallax>
            </div>
            {/* rounded-2xl arredonda os cantos inferiores; o clip-path não os descreve. */}
            <div className="w-full bg-primary flex flex-col rounded-2xl pb-12 pt-12 md:pt-34 gap-32 services_shape">
              {services && (
                <div id="services">
                  <ServicesSection services={services} />
                </div>
              )}
              {projects && (
                <div id="products">
                  <ProductsSection projects={projects} />
                </div>
              )}
              {testimonials && (
                <div id="testimonials">
                  <TestimonialsSection
                    testimonials={testimonials}
                    locale={locale}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
        <section
          id="faqs"
          className="container w-full mx-auto px-4 xl:px-0 py-12 flex flex-col gap-5 leading-8"
        >
          {faqs && <FAQSection {...faqs} />}
        </section>
      </div>
    </main>
  );
}
