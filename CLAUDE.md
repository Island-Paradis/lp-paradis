# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server (http://localhost:3000; Payload admin at /admin)
- `npm run build` — production build (`output: "standalone"`, used by the Dockerfile)
- `npm run start` — run the built app
- `npm run lint` — Biome check (lint + import organization)
- `npm run format` — Biome format with `--write`
- `npx payload generate:types` — regenerate `payload-types.ts` after any change to a collection/global schema

No test runner is configured.

## Architecture

Next.js 16 App Router site whose content is fully driven by **Payload CMS 3** (Postgres + S3 media), localized to English/Portuguese with **next-intl**. React 19 with the React Compiler enabled (`next.config.ts`).

### Two route groups under `src/app/`
- `(app)/[locale]/` — the public marketing site. Every route is locale-prefixed (`/en`, `/pt`).
- `(payload)/` — Payload's admin UI (`/admin`) and REST/GraphQL API (`/api`). These are generated Payload routes; avoid hand-editing files under `(payload)/admin` and the `api` route handlers.

`next.config.ts` composes the plugins: `withNextIntl(withPayload(nextConfig))`. Both wrappers are required.

### Content model (`src/collections/`, registered in `src/payload.config.ts`)
- The **homepage is a Payload Global** (`HomePage.ts`, slug `homepage`) in `src/collections/pages/`. It is the source of truth for page composition: each section (hero, services, projects, testimonials, faqs, contact) is a `group` with an `enabled` flag plus `relationship` fields pointing at collections.
- **Collections** (`Media`, `Hero`, `Contact`, `Projects`, `Services`, `Testimonials`, `FAQs`) hold the reusable content referenced by the homepage global.
- Other **Globals**: `Menu` (NavBar) and `Footer` in `src/collections/globals/`.
- To add/extend a section: edit the collection (or the relevant group in `HomePage.ts`), register new collections in `payload.config.ts`, then run `npx payload generate:types`.

### Data fetching (`src/service/`)
- `index.ts` exposes `getPayloadInstance()`, a module-level memoized `getPayload({ config })` — reuse it instead of calling `getPayload` directly.
- `payload-functions.ts` has `getHomepagePayload` / `getNavBarPayload` / `getFooterPayload`, all `findGlobal({ slug, depth: 2, locale })`. Server components call these (see `(app)/[locale]/page.tsx` and `layout.tsx`).
- `types.ts` defines `Populated*` types that override the generated relationship fields (which are `id | object`) with their fully-populated object shapes. The raw generated types live in `payload-types.ts` (do not edit by hand).

### i18n
- `src/i18n/routing.ts` — locales `['en','pt']`, default `en`. `request.ts` (server config) and `navigation.ts` (locale-aware `Link`/`redirect`/`useRouter`) wrap next-intl.
- Routing middleware lives in **`src/proxy.ts`** (Next.js 16's renamed `middleware`), and excludes `_next`, `api`, `admin`, and static files from locale handling.
- Payload has its own `localization` config (pt/en) in `payload.config.ts`, separate from next-intl; fields marked `localized: true` are translated per-locale in the CMS.

### UI
- shadcn/ui ("new-york" style, RSC) with components in `src/components/ui/`; the `@magicui` registry is also configured (`components.json`). Tailwind v4 (via `@tailwindcss/postcss`), `lucide-react` + `@solar-icons/react` icons, `motion` for animation.
- Feature components live in `src/components/<Name>/index.tsx`. Custom `Gilroy` font in `src/fonts/`.
- Use the `cn` helper from `src/lib/utils.ts` for class merging.

## Conventions
- Path aliases: `@/*` → `src/*`, `@payload-config` → `src/payload.config.ts`.
- Formatting/linting is **Biome** (`biome.json`), not ESLint/Prettier: 2-space indent, import organization on. Run `npm run lint` before committing.
- Required env vars (see `.env`): `DATABASE_URL`, `PAYLOAD_SECRET`, and `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION` / `S3_BUCKET` / `S3_ENDPOINT` for media storage.

## Deployment
Multi-stage `Dockerfile` (Node 24 alpine, lockfile-agnostic) builds the Next.js standalone output and runs `node server.js` as a non-root user.
