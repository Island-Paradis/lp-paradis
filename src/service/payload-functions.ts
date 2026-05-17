import { getPayloadInstance } from ".";
import { PopulatedFooter, PopulatedHomepage, PopulatedNavBar } from "./types";




async function getNavBarPayload(
  locale: "en" | "pt",
): Promise<PopulatedNavBar> {
  const payload = await getPayloadInstance();
  const data = await payload.findGlobal({ slug: "menu", depth: 2, locale });

  return data as PopulatedNavBar;
}

async function getFooterPayload(
  locale: "en" | "pt",
): Promise<PopulatedFooter> {
  const payload = await getPayloadInstance();
  const data = await payload.findGlobal({ slug: "footer", depth: 2, locale });

  return data as PopulatedFooter;
}

async function getHomepagePayload(
  locale: "en" | "pt",
): Promise<PopulatedHomepage> {
  const payload = await getPayloadInstance();
  const data = await payload.findGlobal({ slug: "homepage", depth: 2, locale });

  return data as PopulatedHomepage;
}

export { getHomepagePayload, getNavBarPayload, getFooterPayload };
