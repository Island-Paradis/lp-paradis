## Context

O navbar é montado por [`Header/index.tsx`](../../../src/components/Header/index.tsx) sobre um namespace de primitivas em `src/components/NavBar/`. Três factos dessa estrutura moldam o desenho:

**1. `children` do `NavBarMobileMenu` é renderizado duas vezes.** Uma na linha desktop (`hidden lg:flex`) e outra dentro do portal mobile (`lg:hidden`). Ou seja, tudo o que entra no navbar existe em duplicado no DOM, com um dos dois escondido por breakpoint. Um `id` fixo dentro do navbar seria duplicado; contadores e efeitos correm duas vezes.

**2. O `ButtonWrap` é `hidden gap-3 lg:flex`.** Dentro do portal mobile ele continua escondido, então os botões do CMS não aparecem em nenhum ecrã pequeno. O switch tem de escapar disto para existir em mobile.

**3. `NavBarRoot`, `NavBarItem` e `NavBarMobileMenu` já são client components.** O navbar já custa JavaScript; o que não pode acontecer é ele passar a custar *mais* do que precisa.

E o facto que pesa mais que os três: `src/i18n/navigation.ts` existe e **não é importado por ninguém**. O footer documenta a razão em [`Footer/index.tsx:55-70`](../../../src/components/Footer/index.tsx#L55-L70) — `Link` e `getPathname` de lá arrastam o parser ICU do `@formatjs`, **+33,6 KB** medidos com build limpo nas duas pontas (34.259 → 67.909 bytes num único chunk). O switch de idioma é a primeira feature com motivo legítimo para usar aquele módulo.

## Goals / Non-Goals

**Goals:**
- Trocar de idioma com um clique, mantendo a página onde o visitante está.
- Os links e botões do navbar passarem a ter destino, com o locale corrente preservado.
- Zero runtime do next-intl no cliente — o navbar está em todas as páginas, então uma regressão de bundle aqui é global.
- Os estados degradados verificáveis sem banco.

**Non-Goals:**
- **Dropdown de idiomas.** Há dois locales; ver decisão 4.
- **Catálogo de mensagens do next-intl.** Continua a não existir; o texto do switch é código.
- **Detecção automática de idioma.** O middleware já faz o que faz; esta mudança não toca em `proxy.ts`.
- **Migrar o footer** para o helper partilhado (ver decisão 7).
- **Um `Pages`/`Menu` novo no CMS.** O schema do global `Menu` já tem tudo.

## Decisions

### 1. A pílula mostra o locale ATUAL; o destino vive no `aria-label`

Decisão do utilizador. Em `/pt` a pílula mostra a bandeira de Angola e "PT"; clicar leva a `/en`.

*Alternativa considerada:* mostrar o locale de destino — que é literalmente o que o print mostra (bandeira de Angola + "PT" numa página com conteúdo em inglês). Rejeitada pelo utilizador em favor da convenção mais comum.

Isto cria um problema de acessibilidade que o rótulo visível não resolve: "PT" ao lado de uma bandeira não diz a um leitor de ecrã o que o clique faz. O `aria-label` SHALL nomear a acção e o destino ("Switch to English" / "Mudar para português"), escrito **no idioma de destino** — é a convenção que ajuda quem não lê o idioma corrente.

Esse texto é código, não CMS: não há catálogo de mensagens (ver o Context de `add-get-quote-page`) e um campo por locale no global `Menu` para duas strings que nunca mudam seria custo sem retorno.

### 2. `usePathname` de `next/navigation`, não de `@/i18n/navigation`

O switch precisa do pathname para construir o destino. As três formas consideradas:

| | de onde vem o pathname | custo |
|---|---|---|
| **A** | `usePathname` de `@/i18n/navigation` | +33,6 KB de runtime ICU, **no chunk de todas as páginas** |
| **B** ✅ | `usePathname` de `next/navigation` | zero; troca do 1.º segmento à mão |
| **C** | header `x-pathname` injectado no `proxy.ts`, render no servidor | zero JS, mas acopla ao middleware |

**B.** O import idiomático (A) é o que o footer já mediu e recusou, e aqui o dano é maior: o navbar está em todas as rotas, então os 33,6 KB entram no chunk compartilhado em vez de numa rota só. (C) é mais barato ainda — o switch seria HTML puro — mas põe o funcionamento do switch a depender do `matcher` do `proxy.ts`, que exclui `_next`, `api`, `admin` e ficheiros estáticos; mexer nesse matcher passaria a poder quebrar o switch sem qualquer aviso. B tem o acoplamento menor dos dois males.

O preço de B é o mesmo que o footer assumiu e documentou: a troca de segmento replica à mão o `localePrefix: "always"`, que é o default do next-intl e que [`routing.ts`](../../../src/i18n/routing.ts) não sobrescreve. **Se `routing.ts` passar a definir `localePrefix`, o helper tem de acompanhar** — não há nada que force isso automaticamente.

Efeito colateral bem-vindo: `usePathname` de `next/navigation` devolve o path **com** prefixo (`/pt/get-quote`), logo o primeiro segmento já é o locale corrente. O switch não precisa de prop de locale — deriva-o do próprio pathname.

### 3. Bandeiras como SVG em `public/`

Decisão do utilizador. Um SVG por locale, versionado no repo, servido como asset estático e renderizado com `next/image`, igual ao [`NavBarLogo`](../../../src/components/NavBar/NavBarLogo.tsx).

*Alternativas consideradas:* (a) emoji `🇦🇴` — **descartado por defeito técnico, não por gosto**: o Windows não tem glifos de bandeira, e Chrome e Edge apresentam as letras "AO" numa caixa; o print mostra o emblema da catana e a estrela, que só existe num desenho real. (b) upload no CMS por locale — rejeitada pelo utilizador; acrescentaria uma relação a popular no navbar de todas as páginas e um estado degradado extra (bandeira em falta).

A bandeira é decoração: `alt=""` e `aria-hidden`, porque o nome acessível do controlo já vem do `aria-label` da decisão 1. Uma bandeira com `alt="Angola"` faria o leitor de ecrã anunciar um país onde a intenção é um idioma.

Nota de conteúdo, não de código: Angola para `pt` (em vez de Portugal ou Brasil) é uma escolha de público, coerente com a "Luanda, Angola" da página de orçamento. Para `en` não existe escolha neutra — a bandeira a colocar em `public/flag-en.svg` é decisão do utilizador, e o componente não se importa com qual é.

### 4. Toggle de dois estados, com o limite declarado no código

Com `locales = ["en", "pt"]`, o destino é "o outro". O helper deriva-o como *o primeiro locale que não é o corrente*.

Isto é correcto **apenas para dois locales**, e é uma bomba de relógio silenciosa: um terceiro locale em `routing.ts` não quebra o build nem lança erro — o switch passa a ignorar o terceiro idioma, e ninguém é avisado. Mitigação: o helper carrega essa condição num comentário e a spec tem um requisito explícito sobre ela, para que acrescentar um locale obrigue a rever o componente em vez de o descobrir em produção.

*Alternativa considerada:* um dropdown desde já. Rejeitada — o print não tem chevron, e um menu para duas opções é pior UX que um toggle. A troca para dropdown é local ao componente quando um terceiro locale existir.

### 5. Um `<Link>`, não um `<button>` com `router.replace`

O switch é um destino, então é um link: funciona sem JavaScript, é rastreável, e ganha de graça o clique do meio e "abrir noutro separador". Um `<button>` com `useRouter` precisaria de JS para funcionar e não seria um destino para nada.

A forma vem do `Button` existente com `variant="outline"` e `asChild` a envolver o `Link` — a pílula do print (`rounded-full`, borda clara, padding horizontal) é exactamente `buttonVariants({ variant: "outline" })`, e por essa via o switch herda o `focus-visible:ring` do resto do site em vez de o reinventar.

Atenção ao que o footer documenta sobre `asChild`: o `Slot` exige **um único** filho React, e um irmão que renderize `undefined` ainda conta como segundo slot. O conteúdo da pílula (bandeira + código) tem de vir dentro de um elemento só.

### 6. O que é preservado na troca: o path e a query; não o hash

O destino é o pathname corrente com o primeiro segmento trocado, mais a query string.

O **hash não é preservado**, e é uma limitação assumida, não um esquecimento: `usePathname` não o inclui, e `window.location.hash` só existe no cliente — usá-lo no render produziria markup diferente no servidor e no cliente, ou seja, erro de hidratação. Como o navbar deste site é quase todo âncoras (`/#services`, `/#products`), trocar de idioma no meio da home leva ao topo da home no outro idioma. Aceitável; corrigi-lo exigiria ler o hash num `useEffect` e reescrever o href depois da montagem.

### 7. `localizedHref` sai para `src/lib/locale-href.ts`, o footer não é tocado

O prefixo de locale é agora precisado em três lugares: o switch, os links do navbar e os botões do navbar. O footer tem a sua própria cópia.

Decisão: o módulo novo serve os três call sites do navbar, e o footer fica como está — `finish-footer-implementation` está em curso sobre aquele ficheiro e extrair de lá criaria conflito. É a mesma decisão, com a mesma justificação, que `add-get-quote-page` tomou para o `textOr`; quando aquela mudança fechar, footer, get-quote e navbar convergem para `src/lib/`.

O módulo expõe duas funções com responsabilidades distintas:
- `localizedHref(href, locale)` — prefixa `href` relativo; devolve intacto o que não começa por `/` (`#ancora`, `mailto:`, URL absoluta), porque prefixar qualquer um deles quebraria o destino.
- `swapLocale(pathname, target)` — troca o primeiro segmento do pathname.

### 8. Os botões do CMS passam a ler `url`, e o `ButtonWrap` aparece em mobile

`btn.url` é lido e prefixado; o `Button` recebe `asChild` a envolver um `Link`; `openInNewTab` decide `target`/`rel`.

O `ButtonWrap` perde o `hidden lg:flex`, passando a coluna em mobile e linha em desktop. Isto entra no escopo porque é o mesmo defeito por outra via: um botão invisível em mobile é tão inalcançável como um botão sem `href`. Corrigir só metade deixaria `/get-quote` sem caminho em telefone — que é onde está a maior parte do tráfego de uma landing page.

### 9. O `Header` recebe `locale` por prop

`layout.tsx` já faz isto para o `Footer` (`<Footer {...footerData} locale={locale} />`) e não para o `Header`. A mudança alinha os dois.

*Alternativa considerada:* `getLocale()` de `next-intl/server` dentro do `Header`. Rejeitada pela razão que o footer já registou — é um segundo import de next-intl, e evitar esses imports é precisamente o que esta mudança está a defender, mesmo sendo do lado do servidor.

## Risks / Trade-offs

**[O cookie `NEXT_LOCALE` não acompanhar a troca]** → O next-intl guarda a preferência num cookie que o middleware escreve. Uma navegação do App Router passa pelo middleware, logo o cookie *deve* actualizar — mas isto é inferência sobre o comportamento do next-intl, não observação. Se não actualizar, o visitante troca para `/en`, navega para `/`, e o middleware devolve-o a `/pt`: o switch parece não ter funcionado. Mitigação: é um passo de verificação explícito nas tarefas, feito antes de fechar a mudança; se falhar, o remédio é o switch escrever o cookie ele mesmo, ou usar `router.replace` em vez do `Link` (perdendo a decisão 5).

**[`localePrefix` deixar de ser o default]** → O `swapLocale` e o `localizedHref` replicam à mão o `localePrefix: "always"`. Uma alteração em `routing.ts` quebra os dois em silêncio — sem erro de tipo, sem teste a falhar. Mitigação: nenhuma automática; o acoplamento é documentado no módulo e há um requisito de spec que o nomeia. É o mesmo risco que o footer já corre hoje.

**[Um terceiro locale]** → O toggle ignora-o sem avisar (decisão 4). Mitigação: comentário no helper e requisito de spec, para que a revisão do componente seja parte de acrescentar um locale.

**[Duplicação no DOM pelo `MobileMenu`]** → O `MobileMenu` põe `children` em dois lugares: a linha desktop, sempre no DOM e escondida por CSS abaixo de 1024px, e o portal mobile, montado só **enquanto o menu está aberto**. Logo o switch existe uma vez em repouso e duas com o menu aberto — verificado no HTML renderizado: uma pílula por navbar. Isso continua a proibir `id` fixo, porque no intervalo em que os dois coexistem o `id` ficaria duplicado. Mitigação: nenhuma mudança estrutural no `MobileMenu` (fora de escopo); o facto é declarado na fixture.

**[Bandeira em vez de idioma]** → 🇦🇴 representa Angola, não o português; um visitante brasileiro ou português pode ler a pílula como "site angolano" e não como "versão em português". Mitigação parcial: a bandeira é `aria-hidden` e o nome acessível fala de idioma, então a leitura assistiva está correcta. Para a leitura visual não há mitigação — é o custo da escolha de design, e o código não a impõe: trocar `public/flag-pt.svg` é um ficheiro.

**[Regressão de bundle no chunk global]** → O objectivo desta mudança inclui não introduzir next-intl no cliente. Se um import descuidado o trouxer, o custo é global, não local à rota. Mitigação: verificação explícita nas tarefas, procurando os marcadores `clonePosition`/`bumpSpace` nos chunks — hoje o build tem zero, e é esse o número que tem de continuar zero.
