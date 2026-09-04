import { defineRouting } from "next-intl/routing";

// A list of all locales that are supported
export const locales = ["en", "pt"] as const;

export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,

  // Used when no locale matches
  defaultLocale: "en",
});
