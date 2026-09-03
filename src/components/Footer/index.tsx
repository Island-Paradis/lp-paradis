import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Dribbble, Instagram, Linkedin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import type { Locale } from "@/i18n/routing";
import { localizedCtaHref } from "@/lib/locale-href";
import type { FooterContactBand, PopulatedFooter } from "@/service/types";
import CalendlyCta from "../CalendlyCta";

type SocialLink = NonNullable<PopulatedFooter["socialLinks"]>[number];

// Só as três plataformas que o mockup pede. O conjunto é fechado em código de
// propósito: um mapa aberto sobre um namespace (`Icons[nome]` em cima de um
// `import * as`) impede o tree-shaking, e é o erro que `Button/index.tsx`
// documenta ter custado 12,7 MB. Plataforma fora do mapa cai no ramo textual de
// `SocialIconLink`, então acrescentar uma é um import a mais e nada além disso.
const SOCIAL_ICONS: Partial<Record<SocialLink["platform"], LucideIcon>> = {
  dribbble: Dribbble,
  linkedin: Linkedin,
  instagram: Instagram,
};

// O nome visível dentro das pills da faixa de contacto direto. Cobre nove
// plataformas contra as três de `SOCIAL_ICONS`, e a diferença não é descuido: um
// ícone é um import de componente e paga bundle, uma string paga bytes. O custo
// que o comentário acima documenta simplesmente não existe aqui, então não há
// motivo para racionar entradas.
//
// `other` fica **deliberadamente de fora** — não há nome de marca a derivar de
// "outro". Só nesse caso a pill cai no `label`, que é cópia imperfeita por ser o
// nome acessível, mas visível. Omitir a pill seria o modo de falha que
// `SocialIconLink` já nomeia como o pior possível.
//
// Isto não vem do CMS de propósito. O campo que lá existe para texto, `label`,
// está documentado no admin como "not shown on screen" e foi authorado segundo
// essa instrução — usá-lo aqui poria "Paradis on LinkedIn" dentro da pill sem
// ninguém ter editado nada. Nomes de marca também não se traduzem, então derivar
// em código não custa localização.
const SOCIAL_NAMES: Partial<Record<SocialLink["platform"], string>> = {
  dribbble: "Dribbble",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  github: "GitHub",
  twitter: "Twitter",
  facebook: "Facebook",
  youtube: "YouTube",
  discord: "Discord",
  whatsapp: "WhatsApp",
};

// Os literais que antes estavam soltos no JSX. Eles não desaparecem — viram o
// piso de cada campo, porque a leitura do CMS inverte o risco: antes o texto
// era garantido por estar em código, agora um campo vazio no banco o
// substituiria por nada. Um botão sem rótulo é regressão pior que um botão em
// inglês numa página em português. `cta.heading` está `null` em produção hoje,
// então este piso é exercitado no primeiro render, não é precaução teórica.
const FALLBACK = {
  logoUrl: "/logo-white.svg",
  logoAlt: "Paradis Logo",
  tagline: "Because we were born into this world",
  ctaHeading: "Ready to build?",
  primaryLabel: "Get Quote - For Free",
  outlineLabel: "Schedule a Call",
  copyright: "Paradis.Labs - All rights reserved.",
  reachHeading: "Reach Us Directly",
  socialHeading: "Elsewhere",
};

// `?? fallback` não basta: o Payload grava string vazia quando um campo de texto
// é limpo no admin, e `"" ?? x` devolve `""`. Só-espaços também conta como
// vazio; o valor original é devolvido intacto quando há conteúdo.
function textOr(value: string | null | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

// Toda rota pública é prefixada por locale, então um `href` relativo precisa do
// prefixo para não tirar o usuário do idioma corrente. O que não começa com `/`
// — `#ancora`, `mailto:`, URL absoluta — sai intacto: prefixar qualquer um
// deles quebraria o destino.
function isRoutedHref(href: string): boolean {
  return href.startsWith("/");
}

// O prefixo é montado à mão, e isso é deliberado — a alternativa idiomática
// custa caro. Tanto o `Link` quanto o `getPathname` de `@/i18n/navigation`
// arrastam o runtime de cliente do next-intl (o parser ICU do `@formatjs`,
// reconhecível por `clonePosition`/`bumpSpace`) para o bundle: **+33,6 KB** num
// único chunk, 34.259 → 67.909 bytes, medido com build limpo nas duas pontas.
// Os dois importam do mesmo módulo, então dão exatamente o mesmo custo —
// 3.623.131 bytes com qualquer um dos dois, contra 3.589.441 sem nenhum.
//
// O preço de evitá-los é este acoplamento: a linha abaixo replica o
// `localePrefix: "always"` que é o default do next-intl e que `routing.ts` não
// sobrescreve. Se `routing.ts` passar a definir `localePrefix`, esta função
// precisa acompanhar — não há nada que force isso automaticamente.
//
// O hash cai naturalmente: `/#products`, que existe no conteúdo hoje, vira
// `/pt/#products`.
//
// **CONVERGÊNCIA PARCIAL, e onde está a fronteira.** Os dois botões do bloco
// `cta` já usam `localizedCtaHref` de `@/lib/locale-href`, importado no topo
// deste ficheiro — a migração que a nota de dívida em `lib/locale-href.ts`
// previa começou por eles, porque `add-calendly-popup-cta` tinha de lhes tocar
// de qualquer forma. Esta cópia local sobrevive apenas para o `FooterHref`, que
// serve os `linkGroups` e precisa também de `isRoutedHref` e do ramo `external`.
//
// Ou seja: há agora DUAS regras de prefixo neste ficheiro, e elas são iguais. Se
// divergirem, os links das colunas e os botões do CTA passam a resolver locale
// de formas diferentes, sem erro de tipo e sem aviso do build. Quem terminar a
// migração apaga esta função e passa o `FooterHref` a usar a de `lib/`.
function localizedHref(href: string, locale: Locale): string {
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

// Um destino do footer, escolhendo o elemento pelo tipo de `href`. Externo
// nunca recebe prefixo de locale; interno relativo sempre recebe.
function FooterHref({
  href,
  external,
  locale,
  className,
  children,
  ...rest
}: {
  href: string;
  external?: boolean;
  locale: Locale;
  className?: string;
  children: React.ReactNode;
} & React.ComponentProps<"a">) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (isRoutedHref(href)) {
    return (
      <Link href={localizedHref(href, locale)} className={className} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}

// Um ícone social. O `label` authorado é o nome acessível — os três ícones não
// têm texto na tela, e um `<svg>` sozinho numa âncora não produz nome nenhum.
// Plataforma sem ícone mapeado degrada para o rótulo visível em vez de
// desaparecer: um link authorado que simplesmente não renderiza, sem erro e sem
// pista, é o pior modo de falha possível aqui.
function SocialIconLink({ social }: { social: SocialLink }) {
  const Icon = SOCIAL_ICONS[social.platform];

  return (
    <a
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={social.label}
      data-cursor="hover"
      className="text-white/70 transition-colors duration-200 hover:text-white"
    >
      {Icon ? (
        <Icon aria-hidden="true" className="size-5" />
      ) : (
        <span className="text-sm font-normal">{social.label}</span>
      )}
    </a>
  );
}

// Uma rede social na faixa, com o nome à vista. Difere de `SocialIconLink` só
// nisso, e a diferença toda está no par `aria-label` + `aria-hidden`: o nome
// visível ("Instagram") e o nome acessível ("Paradis Labs on Instagram")
// divergem de propósito. Sem o `aria-label`, o leitor de ecrã anunciaria o nome
// da plataforma — correto, mas menos informativo que o rótulo authorado.
function SocialPill({ social }: { social: SocialLink }) {
  const Icon = SOCIAL_ICONS[social.platform];
  const name = SOCIAL_NAMES[social.platform] ?? social.label;

  return (
    <a
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={social.label}
      data-cursor="hover"
      className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-normal text-white transition-colors duration-200 hover:border-white/60"
    >
      {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
      {name}
    </a>
  );
}

// A faixa que abre o footer na página de orçamento.
//
// Os dois grupos renderizam de forma independente, e é por isso que a condição
// de cada um vive aqui dentro e não no chamador: um título sozinho, sem o
// conteúdo que ele anuncia, é pior que a ausência do grupo inteiro. O chamador
// só decide se a faixa existe de todo — quando não há nem e-mail nem redes, não
// há faixa nem divider, e o footer fica indistinguível do das outras rotas.
function ContactBand({
  contactBand,
  socialLinks,
}: {
  contactBand: FooterContactBand;
  socialLinks: SocialLink[];
}) {
  const email = contactBand.email?.trim();

  return (
    <div className="container px-4 xl:px-0 py-14 flex flex-col gap-10 border-b border-white/20 sm:flex-row sm:items-start sm:justify-between">
      {email && (
        <div className="flex flex-col gap-4">
          <span className="text-white/70 font-medium text-sm">
            {textOr(contactBand.reachHeading, FALLBACK.reachHeading)}
          </span>
          {/* `mailto:` não é rota, então não passa pelo `FooterHref`: não leva
              prefixo de locale e não é um `Link`. */}
          <a
            href={`mailto:${email}`}
            data-cursor="hover"
            className="inline-block w-fit border-b-[1.5px] border-white/10 pb-1 text-2xl font-semibold tracking-tight text-white transition-colors duration-200 hover:border-white/70 sm:text-2xl"
          >
            {email}
          </a>
        </div>
      )}
      {socialLinks.length > 0 && (
        <div className="flex flex-col gap-4 sm:items-end">
          <span className="text-white/70 font-medium text-sm">
            {textOr(contactBand.socialHeading, FALLBACK.socialHeading)}
          </span>
          {/* `flex-wrap` porque três pills com rótulo não cabem numa linha de
              ~390px, e a alternativa seria rolagem horizontal no footer. */}
          <ul className="flex flex-row flex-wrap items-center gap-3 sm:justify-end">
            {socialLinks.map((social) => (
              <li key={social.id ?? social.url}>
                <SocialPill social={social} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// O `locale` vem por prop, do layout, que já o resolveu para buscar este mesmo
// global. `getLocale()` de `next-intl/server` faria o mesmo sem tocar o call
// site, mas seria um segundo import de next-intl aqui — e é justamente o que a
// nota em `localizedHref` explica que sai caro.
//
// A prop `contactBand` traz a faixa **resolvida**: títulos já passados pelo
// piso, e-mail já buscado. O grupo cru do CMS chama-se `contactBand` e chega
// aqui dentro de `args`, por nome diferente e sem ser lido — quem chama resolve,
// o componente só desenha. Os nomes diferem de propósito; ver a nota em
// `collections/globals/Footer.ts`.
//
// `contactBand` é **opcional**, e essa é a escolha de desenho: sem a prop o
// componente renderiza exatamente o que renderizava antes de a faixa existir.
// O footer corrente é o caminho normal e a faixa é o acréscimo, não o
// contrário — assim o slot que serve as outras rotas fica trivial, a fixture
// existente continua válida, e "footer sem faixa" é o estado que não regride
// por omissão.
export default function Footer({
  locale,
  contactBand,
  ...args
}: PopulatedFooter & {
  locale: Locale;
  contactBand?: FooterContactBand;
}) {
  const cta = args.cta;
  const socialLinks = args.socialLinks ?? [];

  // A faixa inteira cai quando não tem nenhum dos dois grupos — incluindo o
  // divider, que sozinho separaria nada de nada.
  const showBand = Boolean(
    contactBand && (contactBand.email?.trim() || socialLinks.length > 0),
  );

  return (
    <footer className="w-full flex flex-col justify-center items-center bg-primary text-white">
      {showBand && contactBand && (
        <ContactBand contactBand={contactBand} socialLinks={socialLinks} />
      )}
      <div className="container py-16 flex flex-col gap-10 px-4 xl:px-0">
        <div className="flex flex-col gap-2">
          <Image
            src={args.logo?.url ?? FALLBACK.logoUrl}
            alt={args.logo?.alt ?? FALLBACK.logoAlt}
            width={163}
            height={31}
          />
          <span className="block text-xs font-normal text-white/80">
            {textOr(args.tagline, FALLBACK.tagline)}
          </span>
        </div>
        <div className="w-full flex flex-row gap-10">
          <div className="w-full sm:grid sm:grid-cols-8 gap-6 flex flex-col">
            {args.linkGroups &&
              args.linkGroups.length > 0 &&
              args.linkGroups.map((group) => (
                <div
                  className="col-span-2 flex flex-col gap-3"
                  key={group.id ?? group.title}
                >
                  <span className="text-white/70 font-medium text-sm">
                    {group.title}
                  </span>
                  <ul className="flex flex-col gap-2">
                    {group.links &&
                      group.links.length > 0 &&
                      group.links.map((link) => (
                        <li key={link.id ?? link.name}>
                          <FooterHref
                            href={link.href}
                            external={link.isExternal ?? false}
                            locale={locale}
                            data-cursor="hover"
                            className="inline-flex items-center gap-1 text-sm font-normal text-white"
                          >
                            {link.name}
                            {link.isExternal && (
                              // Decoração: o nome acessível do link é o rótulo
                              // authorado, sem sufixo vindo da seta.
                              <ArrowUpRight
                                aria-hidden="true"
                                className="size-3.5 shrink-0"
                              />
                            )}
                          </FooterHref>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-white font-medium text-lg">
              {textOr(cta?.heading, FALLBACK.ctaHeading)}
            </span>
            <div className="flex flex-col gap-3 w-full xl:min-w-74">
              {/* Estes dois deixaram de usar `asChild` + `FooterHref`.
                  `CalendlyCta` é um leaf de CLIENTE, e é o que permite ao
                  destino do Calendly abrir popup em vez de navegar sem este
                  ficheiro ganhar `"use client"` — os 33,6 KB que o comentário
                  de `localizedHref` acima mediu continuam de fora.

                  O prefixo de locale é aplicado AQUI, no servidor: o leaf não
                  importa nada de `@/i18n`, é essa a condição de ele ser barato.

                  `localizedCtaHref` devolve `undefined` para `""` e para `#`,
                  e nesse caso o `Button` renderiza `<button>` inerte em vez de
                  uma âncora que salta para o topo. Hoje é o que acontece ao
                  botão primário: o `href` authorado é `#`. */}
              <CalendlyCta
                className="w-full"
                variant="inverted"
                href={localizedCtaHref(cta?.primaryButton?.href, locale)}
              >
                {textOr(cta?.primaryButton?.label, FALLBACK.primaryLabel)}
              </CalendlyCta>
              <CalendlyCta
                className="w-full"
                variant="outline-inverted"
                href={localizedCtaHref(cta?.outlineButton?.href, locale)}
              >
                {textOr(cta?.outlineButton?.label, FALLBACK.outlineLabel)}
              </CalendlyCta>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full flex justify-center items-center border-t border-white/20">
        {/* Empilha em telas estreitas: o copyright e três ícones não cabem na
            mesma linha em ~390px, e o mockup só define o comportamento
            desktop. */}
        <div className="container py-8 px-4 xl:px-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-normal">
            &copy; {new Date().getFullYear()}{" "}
            {textOr(args.copyrightText, FALLBACK.copyright)}
          </span>
          {socialLinks.length > 0 && (
            <ul className="flex flex-row items-center gap-4">
              {socialLinks.map((social) => (
                <li key={social.id ?? social.url}>
                  <SocialIconLink social={social} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
