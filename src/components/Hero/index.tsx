"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Hero as Herotype } from "../../../payload-types";
import CalendlyCta from "../CalendlyCta";
import { CursorGlow } from "../ui/cursor-glow";
import { GridPattern } from "../ui/grid-pattern";

interface HeroProps extends Herotype {
  // Os destinos dos dois CTAs, JÁ resolvidos pelo servidor: prefixo de locale
  // aplicado ao que é interno, `undefined` quando não há destino authorado.
  //
  // Props separadas em vez de se usar `args.primaryCta.url` directamente porque
  // este componente é cliente e não recebe o locale — e resolvê-lo aqui
  // obrigaria a importar `@/i18n`, que é o custo que `lib/locale-href.ts`
  // documenta ter medido em 33,6 KB.
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
}

export default function Hero(args: HeroProps) {
  // `prefers-reduced-motion` é atendido em CSS, não aqui — a regra no fim de
  // `globals.css` neutraliza o deslocamento de todo `[data-reveal]`, e os itens
  // deste container carregam o atributo. Consultar a preferência no corpo da
  // renderização divergia a hidratação; ver `@/lib/use-reduced-motion`.
  //
  // O `staggerChildren` era zerado sob a preferência e agora é fixo. Duas
  // razões: nunca foi fonte de divergência (o container tem `hidden: {}`, que
  // não serializa `style` nenhum), e com o deslocamento neutralizado o que
  // resta escalonado é opacidade — um fade escalonado por 0,1s é movimento
  // reduzido por qualquer definição razoável.
  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.1 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <div className="bg-background relative flex size-full items-center justify-center overflow-hidden rounded-lg border p-4 sm:p-10 lg:p-20">
      <GridPattern
        width={90}
        height={30}
        x={-1}
        y={-1}
        className={cn(
          "mask-[radial-gradient(ellipse_80%_80%_at_center,transparent,white)]",
          "[-webkit-mask-image:radial-gradient(ellipse_80%_80%_at_center,transparent,white)]",
        )}
      />
      <div className="relative z-10 text-center bg-background/90 p-4 sm:p-8 lg:p-10 rounded-xl">
        <motion.div
          className="mx-auto max-w-4xl py-10 lg:py-20 flex flex-col items-center gap-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.h1
            data-reveal
            variants={item}
            className="relative cursor-none font-gilroy text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight gradient-text leading-tight lg:leading-20"
          >
            {args.headline}
            <CursorGlow className="z-20" />
          </motion.h1>
          <motion.div data-reveal variants={item} className="max-w-lg">
            <p className="text-lg text-primary leading-8">{args.description}</p>
          </motion.div>
          <motion.div
            data-reveal
            variants={item}
            className="w-full max-w-106.5 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {args.primaryCta && (
              <CalendlyCta
                className="w-full"
                variant="primary"
                href={args.primaryCtaHref}
                magnetic
                textSwap
              >
                {args.primaryCta.label}
              </CalendlyCta>
            )}
            {args.secondaryCta && (
              <CalendlyCta
                className="w-full"
                variant="outline"
                href={args.secondaryCtaHref}
                magnetic
                textSwap
              >
                {args.secondaryCta.label}
              </CalendlyCta>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
