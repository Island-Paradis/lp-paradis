import type { Locale } from "@/i18n/routing";
import type { Contact } from "../../payload-types";
import { getPayloadInstance } from ".";
import { GLOBAL_SLUGS, type GlobalSlug } from "./constants";
import type {
  PopulatedFooter,
  PopulatedGetQuotePage,
  PopulatedHomepage,
  PopulatedNavBar,
} from "./types";

// All globals are fetched the same way (depth: 2 to populate relationships).
// `findGlobal` returns the generated `number | object` unions, so callers pick
// the fully-populated `Populated*` shape via the type argument.
async function getGlobal<T>(slug: GlobalSlug, locale: Locale): Promise<T> {
  const payload = await getPayloadInstance();
  const data = await payload.findGlobal({ slug, depth: 2, locale });

  return data as T;
}

function getNavBarPayload(locale: Locale): Promise<PopulatedNavBar> {
  return getGlobal<PopulatedNavBar>(GLOBAL_SLUGS.navBar, locale);
}

function getFooterPayload(locale: Locale): Promise<PopulatedFooter> {
  return getGlobal<PopulatedFooter>(GLOBAL_SLUGS.footer, locale);
}

function getHomepagePayload(locale: Locale): Promise<PopulatedHomepage> {
  return getGlobal<PopulatedHomepage>(GLOBAL_SLUGS.homepage, locale);
}

function getQuotePagePayload(locale: Locale): Promise<PopulatedGetQuotePage> {
  return getGlobal<PopulatedGetQuotePage>(GLOBAL_SLUGS.getQuote, locale);
}

// O primeiro fetcher de **coleção** deste ficheiro; os quatro acima são todos
// `findGlobal`. Não passa pelo helper `getGlobal` de propósito: a assinatura
// dele é `findGlobal({ slug })`, que é outra chamada com outro retorno. Um
// helper que servisse os dois casos teria de ser genérico sobre a operação, e
// não vale escrevê-lo para um único chamador — esse refactor pertence à mudança
// que precisar do segundo fetcher de coleção, não a esta.
//
// `limit: 1` porque quem chama quer um endereço, não uma lista: a faixa de
// contacto direto do footer mostra um só e-mail. `depth: 0` porque nada do que
// ela lê em `Contact` é relação — o `socialLinks` da coleção é um array de
// campos simples, e popular a profundidade seria trabalho para deitar fora.
//
// Devolve `null` com a coleção vazia. O `email` é `required` no schema, mas isso
// vale por documento e não garante que exista documento; quem chama trata a
// ausência.
async function getContactPayload(locale: Locale): Promise<Contact | null> {
  const payload = await getPayloadInstance();
  const { docs } = await payload.find({
    collection: "contact",
    limit: 1,
    depth: 0,
    locale,
  });

  return docs[0] ?? null;
}

export {
  getHomepagePayload,
  getNavBarPayload,
  getFooterPayload,
  getQuotePagePayload,
  getContactPayload,
};
