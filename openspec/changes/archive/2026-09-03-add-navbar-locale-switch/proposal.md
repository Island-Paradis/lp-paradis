## Why

O site é bilingue (`en`/`pt`) e **não tem como trocar de idioma**. A versão em português só é alcançável escrevendo `/pt` na barra de endereço, ou por um palpite do middleware a partir do `Accept-Language`. Metade do conteúdo — todos os campos `localized: true` do CMS — é praticamente invisível.

A investigação do navbar encontrou dois defeitos adjacentes que tornam o switch inútil se não forem corrigidos com ele:

1. **O botão "Get Quote" do navbar é inerte.** [`Header/index.tsx`](../../../src/components/Header/index.tsx) mapeia `args.buttons` para `<Button>` sem `asChild`, sem `onClick` e **sem ler `btn.url`** — o campo existe no global `Menu`, é preenchível no admin, e não vai a lado nenhum. O caminho de conversão principal do site não sai do navbar.
2. **Os links do navbar não carregam locale.** [`NavBarItem.tsx`](../../../src/components/NavBar/NavBarItem.tsx) usa `next/link` com o `href` cru do CMS. Trocar para `/pt` e clicar "Services" devolve o visitante ao locale que o cookie ditar — um switch que funciona seguido de navegação que o desfaz é pior que não ter switch.

Também apareceu, na mesma leitura: o `NavBarButtonWrap` é `hidden gap-3 lg:flex` e o `NavBarMobileMenu` renderiza `children` duas vezes (linha desktop + portal mobile). No portal, o `ButtonWrap` continua `hidden` — os botões do CMS **nunca aparecem em mobile**. É o mesmo defeito do ponto 1 por outra via: nenhum caminho para `/get-quote`.

## What Changes

- **Novo componente de switch de idioma** no navbar, à esquerda dos botões, com a forma da pílula do design: bandeira circular + código do idioma.
- **A pílula mostra o idioma ATUAL** (em `/pt` mostra a bandeira de Angola e "PT"); o clique leva ao outro locale, e o destino é anunciado no `aria-label`, não no rótulo visível.
- **As bandeiras são SVG versionados em `public/`**, um por locale. Emoji está descartado: 🇦🇴 não renderiza como bandeira no Windows — Chrome e Edge mostram as letras "AO" numa caixa.
- **O destino é derivado do pathname corrente** trocando o primeiro segmento, com `usePathname` de `next/navigation` — **não** de `@/i18n/navigation`. Ver a decisão 2 do design: o import idiomático custa +33,6 KB medidos, e no navbar isso entra no chunk de todas as páginas.
- **Os botões do navbar passam a navegar**: `btn.url` é lido, prefixado com o locale, e o `Button` recebe `asChild` a envolver um `Link`.
- **Os links do navbar passam a ser prefixados** com o locale corrente, com a mesma semântica que o footer já aplica (`href` relativo recebe prefixo; `#ancora`, `mailto:` e URL absoluta saem intactos).
- **O `Header` ganha uma prop `locale`**, passada pelo `layout.tsx` exactamente como já acontece com o `Footer`.
- **O `ButtonWrap` passa a ser visível no menu mobile**, para o switch e os botões existirem nos dois breakpoints.
- **Novo helper partilhado** `src/lib/locale-href.ts` com o prefixo e a troca de locale. O footer **não** é alterado (ver Impact).
- **Nova rota de fixture dev-only** `/[locale]/fixtures/navbar`, no padrão do footer e do get-quote, para os estados degradados: sem links, sem botões, `href` externo, âncora, e a pílula em cada locale.

Nada de **BREAKING**: o navbar renderiza hoje os mesmos links e botões, apenas sem destino.

## Capabilities

### New Capabilities
- `navbar-locale-switch`: o switch de idioma — o que a pílula apresenta, como o destino é derivado do pathname, o que é preservado na troca, as bandeiras, a acessibilidade, e o comportamento nos dois breakpoints.
- `navbar-link-destinations`: os destinos do navbar — os botões do CMS passarem a navegar, o prefixo de locale nos links e nos botões, quais `href` são deixados intactos, e a visibilidade em mobile.

### Modified Capabilities
Nenhuma. `homepage-shape-interlock` e as capabilities de `add-get-quote-page` não são tocadas.

## Impact

**Novos ficheiros**
- `src/components/NavBar/LocaleSwitch.tsx` — o switch (client component: precisa do pathname)
- `src/lib/locale-href.ts` — prefixo e troca de locale
- `public/flag-pt.svg`, `public/flag-en.svg` — as bandeiras
- `src/app/(app)/[locale]/fixtures/navbar/page.tsx` — fixture dev-only

**Ficheiros alterados**
- `src/components/Header/index.tsx` — prop `locale`, `btn.url` lido, switch inserido
- `src/components/NavBar/NavBarItem.tsx` — `href` prefixado
- `src/components/NavBar/NavBarButtonWrap.tsx` — visível em mobile
- `src/components/NavBar/index.tsx` — exportar o switch no namespace `NavBar`
- `src/app/(app)/[locale]/layout.tsx` — passar `locale` ao `Header`

**Não alterado, de propósito**
- `src/components/Footer/index.tsx` tem a sua própria cópia de `localizedHref`. A mudança `finish-footer-implementation` está em curso sobre esse ficheiro (68/78 tarefas) e extrair de lá criaria conflito. A duplicação é dívida anotada, igual à do `textOr` em `add-get-quote-page`.
- `src/i18n/navigation.ts` continua sem call sites. Esta mudança é a primeira que teria motivo para o usar e escolhe não o fazer; ver decisão 2.

**Dependências.** Nenhuma nova.

**CMS.** Nenhuma alteração de schema — o global `Menu` já tem `label`, `url`, `variant` e `openInNewTab` em links e botões, e nenhum deles é usado hoje na íntegra. Fica a preencher: a URL `/get-quote` no botão, que a partir desta mudança passa a ter efeito.

**Risco de regressão a vigiar.** O bundle de cliente do chunk compartilhado: se o `@formatjs` aparecer lá, esta mudança falhou o seu próprio critério. Hoje o build tem zero chunks com esse runtime.
