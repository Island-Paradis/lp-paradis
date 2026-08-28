# Estado de partida — split-and-land-working-tree

Capturado antes de qualquer operação de git. Dev server (PID 11540, `next dev`) encerrado antes desta captura.

## Posição
```
HEAD:        76fd5688fa8e8c1ae9f08c381ff4aebe54a70b4a
HEAD short:  76fd568 2026-08-25 20:12:36 +0100 Add OPSX OpenSpec commands and skills
branch:      chore/implementation-openspec-on-codebase
origin/main: ae8f186 2026-02-08 03:18:50 +0000 Ensure public dir exists and simplify COPY
rev-list --left-right --count origin/main...HEAD  =  0	41
   (esquerda = commits só em origin/main; direita = commits só em HEAD)
```

## git status --short
```
 M package-lock.json
 M package.json
 M payload-types.ts
 M src/app/(app)/[locale]/layout.tsx
 M src/app/(app)/[locale]/page.tsx
 M src/app/(app)/[locale]/template.tsx
 M src/app/(app)/globals.css
 M src/components/Badge/index.tsx
 M src/components/Button/index.tsx
 M src/components/CursorFollower/index.tsx
 M src/components/Hero/index.tsx
 M src/components/NavBar/NavBarRoot.tsx
 M src/components/ProductsSection/index.tsx
 M src/components/SectionHeading/index.tsx
 M src/components/ServicesSection/index.tsx
 M src/components/ui/cursor-glow.tsx
 M src/components/ui/reveal.tsx
 M src/components/ui/text-reveal.tsx
 M src/fonts/gilroy.ts
D  src/fonts/gilroy/Gilroy-Black.ttf
D  src/fonts/gilroy/Gilroy-BlackItalic.ttf
D  src/fonts/gilroy/Gilroy-Bold.ttf
D  src/fonts/gilroy/Gilroy-BoldItalic.ttf
D  src/fonts/gilroy/Gilroy-ExtraBold.ttf
D  src/fonts/gilroy/Gilroy-ExtraBoldItalic.ttf
D  src/fonts/gilroy/Gilroy-Heavy.ttf
D  src/fonts/gilroy/Gilroy-HeavyItalic.ttf
D  src/fonts/gilroy/Gilroy-Light.ttf
D  src/fonts/gilroy/Gilroy-LightItalic.ttf
D  src/fonts/gilroy/Gilroy-Medium.ttf
D  src/fonts/gilroy/Gilroy-MediumItalic.ttf
D  src/fonts/gilroy/Gilroy-Regular.ttf
D  src/fonts/gilroy/Gilroy-RegularItalic.ttf
D  src/fonts/gilroy/Gilroy-SemiBold.ttf
D  src/fonts/gilroy/Gilroy-SemiBoldItalic.ttf
D  src/fonts/gilroy/Gilroy-Thin.ttf
D  src/fonts/gilroy/Gilroy-ThinItalic.ttf
D  src/fonts/gilroy/Gilroy-UltraLight.ttf
D  src/fonts/gilroy/Gilroy-UltraLightItalic.ttf
?? openspec/changes/
?? openspec/specs/
?? pnpm-lock.yaml
?? pnpm-workspace.yaml
?? src/components/HydrationSignal/
?? src/fonts/gilroy/
```

## git diff --stat (não-staged)
```
 package-lock.json                        | 762 +++++++++++++++++++++++++++----
 package.json                             |   2 +-
 payload-types.ts                         |  10 +-
 src/app/(app)/[locale]/layout.tsx        |  33 ++
 src/app/(app)/[locale]/page.tsx          |  52 ++-
 src/app/(app)/[locale]/template.tsx      |   5 +
 src/app/(app)/globals.css                | 196 +++++++-
 src/components/Badge/index.tsx           |  12 +-
 src/components/Button/index.tsx          |  18 +-
 src/components/CursorFollower/index.tsx  |  68 ++-
 src/components/Hero/index.tsx            |  23 +-
 src/components/NavBar/NavBarRoot.tsx     |  17 +-
 src/components/ProductsSection/index.tsx |   3 +-
 src/components/SectionHeading/index.tsx  |   3 +-
 src/components/ServicesSection/index.tsx |  42 +-
 src/components/ui/cursor-glow.tsx        |  35 +-
 src/components/ui/reveal.tsx             |  16 +
 src/components/ui/text-reveal.tsx        |  39 +-
 src/fonts/gilroy.ts                      | 105 +----
 19 files changed, 1174 insertions(+), 267 deletions(-)
```

## índice (staged) antes do reset
```
 src/fonts/gilroy/Gilroy-UltraLight.ttf       | Bin 149692 -> 0 bytes
 src/fonts/gilroy/Gilroy-UltraLightItalic.ttf | Bin 167608 -> 0 bytes
 20 files changed, 0 insertions(+), 0 deletions(-)
```
