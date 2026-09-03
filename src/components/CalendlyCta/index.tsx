"use client";

import type { IconProps } from "@solar-icons/react/lib/types";
import type { VariantProps } from "class-variance-authority";
import type React from "react";
import Button, { type buttonVariants } from "@/components/Button";
import { ctaHref } from "@/lib/cta-href";
import { useCalendlyPopup } from "@/lib/use-calendly-popup";

interface CalendlyCtaProps extends VariantProps<typeof buttonVariants> {
  // O `url` cru do Payload, JÁ prefixado com o locale pelo servidor quando é
  // interno. Este componente não sabe nada de locale — ver a nota abaixo.
  href?: string | null;
  openInNewTab?: boolean;
  trailingIcon?: React.ComponentType<IconProps>;
  iconProps?: IconProps;
  circleIcon?: boolean;
  magnetic?: boolean;
  textSwap?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Um CTA authorado no CMS. Navega — excepto quando o destino é o Calendly, e aí
 * abre o calendário num popup.
 *
 * **Por que TODO CTA authorado passa por aqui, e não só os do Calendly.** O
 * destino vem da base de dados, portanto qual dos seis grupos aponta para o
 * Calendly é decidido por quem edita no admin, não pelo call site. Um componente
 * só para os do Calendly obrigaria o call site a saber uma coisa que ele não
 * pode saber em tempo de compilação.
 *
 * O custo é um handler de clique em CTAs que só navegam, e ele é inerte: o
 * `useCalendlyPopup` devolve cedo quando o `href` não é do Calendly, sem tocar
 * no evento.
 *
 * **Por que é um leaf, e o que se perde se deixar de o ser.** O `Footer` é
 * server component de propósito: o comentário em `components/Footer/index.tsx`
 * mediu **33,6 KB** de runtime de cliente do next-intl (34.259 → 67.909 bytes
 * num chunk) e é a razão de haver ali um `localizedHref` copiado à mão em vez de
 * se importar `@/i18n/navigation`. Um `onClick` no bloco `cta` obriga a
 * fronteira de cliente, e a única forma de a ter sem pagar aquilo é ela terminar
 * aqui.
 *
 * Consequência a respeitar: este ficheiro **não pode** importar nada de
 * `@/i18n`, nem ler o locale corrente. Recebe o `href` já resolvido.
 */
export default function CalendlyCta({
  href,
  openInNewTab,
  children,
  ...buttonProps
}: CalendlyCtaProps) {
  const onClick = useCalendlyPopup(href);
  const destination = ctaHref(href);

  // Sem destino authorado o `Button` renderiza `<button>`, e um `<button>` não
  // aceita `href` nem `openInNewTab` — a união em `ButtonProps` recusa-os. As
  // duas chamadas abaixo são o preço de o tipo ser honesto sobre isso: nenhuma
  // delas passa uma prop que o elemento escolhido não possa receber.
  if (!destination) {
    return <Button {...buttonProps}>{children}</Button>;
  }

  return (
    <Button
      {...buttonProps}
      href={destination}
      openInNewTab={openInNewTab}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
