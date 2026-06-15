import type { Locale } from "@/i18n/routing";
import { getPayloadInstance } from ".";
import { GLOBAL_SLUGS, type GlobalSlug } from "./constants";
import type {
  PopulatedFooter,
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

export { getHomepagePayload, getNavBarPayload, getFooterPayload };
