import { type Locale, locales, routing } from "@/i18n/routing";
import { hasDestination } from "@/lib/cta-href";

// Prefixo e troca de locale em URLs, montados à mão.
//
// **Por que à mão e não com `@/i18n/navigation`.** O `Link` e o `getPathname`
// daquele módulo arrastam o runtime de cliente do next-intl (o parser ICU do
// `@formatjs`, reconhecível por `clonePosition`/`bumpSpace`): +33,6 KB num único
// chunk, 34.259 → 67.909 bytes, medido com build limpo nas duas pontas. Ver o
// comentário longo em `components/Footer/index.tsx`, que foi onde isto se mediu.
// No navbar o dano seria pior que no footer: está em todas as rotas, logo o
// custo entra no chunk compartilhado do site inteiro em vez de numa página só.
//
// **O acoplamento que isto cria, e que não tem rede.** As duas funções abaixo
// replicam o `localePrefix: "always"` — o default do next-intl, que
// `i18n/routing.ts` não sobrescreve. Se `routing.ts` passar a definir
// `localePrefix`, estas funções ficam erradas **em silêncio**: sem erro de tipo,
// sem teste a falhar, sem aviso do build. Quem mexer em `routing.ts` tem de vir
// aqui.
//
// NOTA DE DÍVIDA: `components/Footer/index.tsx` tem uma cópia local de
// `localizedHref`. Não foi migrada de propósito — `finish-footer-implementation`
// está em curso sobre aquele ficheiro e extrair de lá criaria conflito. Mesma
// situação do `textOr` em `lib/cms-text.ts`. Quando aquela mudança fechar,
// footer, get-quote e navbar convergem para `lib/`.

function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

// Prefixa um `href` do CMS com o locale corrente.
//
// O que NÃO começa por `/` sai intacto — `#ancora`, `mailto:`, `tel:`, URL
// absoluta. Prefixar qualquer um deles quebraria o destino: `/pt#services` não é
// uma âncora na página corrente, e `/ptmailto:...` não é nada.
export function localizedHref(href: string, locale: Locale): string {
  if (!href.startsWith("/")) return href;

  // `/` vira `/pt`, não `/pt/` — a barra final produziria um redirect a mais.
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

// O `href` de um CTA authorado, pronto a entregar ao `Button`.
//
// Junta as duas regras que um CTA precisa e que estavam em módulos diferentes:
// `hasDestination` decide se há destino (`""`, `"   "` e `"#"` não são), e
// `localizedHref` prefixa o que for interno. Devolve `undefined` quando não há
// destino, que é o que faz o `Button` cair no `<button>` inerte.
//
// Vive aqui e não em `lib/cta-href.ts` de propósito: este módulo importa de
// `@/i18n/routing`, e `cta-href.ts` é importado pelo leaf de cliente
// `CalendlyCta`, que tem de ficar livre de qualquer import de i18n.
export function localizedCtaHref(
  href: string | null | undefined,
  locale: Locale,
): string | undefined {
  return hasDestination(href) ? localizedHref(href, locale) : undefined;
}

// O locale corrente, lido do primeiro segmento do pathname.
//
// Funciona porque o `usePathname` de `next/navigation` (ao contrário do de
// next-intl) devolve o path COM prefixo: `/pt/get-quote`. É por isso que o
// switch não precisa de receber o locale por prop — deriva-o do que já tem.
export function currentLocale(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : routing.defaultLocale;
}

// Troca o primeiro segmento do pathname pelo locale de destino.
export function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split("/");

  if (isLocale(segments[1])) {
    segments[1] = target;
    return segments.join("/");
  }

  // Sem prefixo de locale no path. Não deveria acontecer com
  // `localePrefix: "always"`, mas se acontecer o destino ainda tem de ser
  // válido em vez de duplicar barras.
  return pathname === "/" ? `/${target}` : `/${target}${pathname}`;
}

// O locale "do outro lado" do toggle.
//
// **Isto só é correcto com DOIS locales.** Com três, a função devolve o primeiro
// que não é o corrente e os restantes ficam inalcançáveis — e não há nada que
// avise: o build passa, os tipos passam, o switch simplesmente ignora o terceiro
// idioma. Acrescentar um locale a `routing.ts` obriga a trocar o toggle por um
// dropdown, e é este comentário o único lugar onde isso está registado no
// código.
export function otherLocale(current: Locale): Locale {
  return locales.find((locale) => locale !== current) ?? routing.defaultLocale;
}
