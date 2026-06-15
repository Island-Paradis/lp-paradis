// Slugs of the Payload globals, kept in one place so the fetchers and the
// collection configs cannot drift apart.
export const GLOBAL_SLUGS = {
  navBar: "menu",
  footer: "footer",
  homepage: "homepage",
} as const;

export type GlobalSlug = (typeof GLOBAL_SLUGS)[keyof typeof GLOBAL_SLUGS];
