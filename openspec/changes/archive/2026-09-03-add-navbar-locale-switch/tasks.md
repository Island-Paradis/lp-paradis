## 1. Helper de href por locale

- [x] 1.1 Criar `src/lib/locale-href.ts` com `localizedHref(href, locale)`: prefixa `href` que comece por `/`, devolve intacto o resto (`#ancora`, `mailto:`, `tel:`, URL absoluta)
- [x] 1.2 Tratar a raiz: `/` torna-se `/<locale>`, não `/<locale>/`
- [x] 1.3 Acrescentar `swapLocale(pathname, target)` que substitui o primeiro segmento do pathname
- [x] 1.4 Acrescentar `otherLocale(current)` que devolve o primeiro locale de `routing.locales` diferente do corrente, e um fallback para o padrão quando o corrente não é reconhecido
- [x] 1.5 Comentar no módulo os dois acoplamentos que não têm rede: a réplica manual de `localePrefix: "always"` (uma alteração a `routing.ts` quebra isto em silêncio) e o facto de `otherLocale` só ser correcto com dois locales
- [x] 1.6 Comentar a dívida: `src/components/Footer/index.tsx` tem cópia local de `localizedHref`, não migrada por `finish-footer-implementation` estar em curso — igual à nota do `textOr` em `src/lib/cms-text.ts`
- [x] 1.7 NÃO alterar `src/components/Footer/index.tsx`

## 2. Bandeiras

- [x] 2.1 Adicionar `public/flag-pt.svg` — bandeira de Angola (escolha de público, coerente com "Luanda, Angola" na página de orçamento)
- [x] 2.2 Adicionar `public/flag-en.svg` — a bandeira é decisão do utilizador; o componente não depende de qual seja
- [x] 2.3 Confirmar que os SVG renderizam legíveis a ~20px e recortados em círculo, sem depender de detalhe fino

## 3. O switch

- [x] 3.1 Criar `src/components/NavBar/LocaleSwitch.tsx` como client component, obtendo o pathname de `usePathname` de `next/navigation`
- [x] 3.2 Derivar o locale corrente do primeiro segmento do pathname, sem receber prop de locale
- [x] 3.3 Montar o `href` com `swapLocale`, preservando os segmentos seguintes e a query string
- [x] 3.4 Renderizar como `Button variant="outline"` com `asChild` a envolver um `Link` de `next/link`, com UM único filho React (restrição do `Slot`)
- [x] 3.5 Apresentar a bandeira do locale CORRENTE com `next/image` (como o `NavBarLogo`), recortada em círculo, com `alt=""` e escondida da árvore de acessibilidade
- [x] 3.6 Apresentar o código do locale corrente em maiúsculas
- [x] 3.7 Definir o `aria-label` com a acção e o idioma de DESTINO, escrito no idioma de destino, com os dois textos em código (não há catálogo de mensagens no projeto)
- [x] 3.8 Não usar `id` fixo — o `NavBarMobileMenu` renderiza `children` duas vezes e o `id` ficaria duplicado
- [x] 3.9 Confirmar que o módulo não importa de `@/i18n/navigation` nem de `next-intl`
- [x] 3.10 Exportar o switch no namespace `NavBar` de `src/components/NavBar/index.tsx`

## 4. Destinos dos links e botões

- [x] 4.1 Adicionar a prop `locale` ao `Header` e passá-la do `layout.tsx`, como já é feito para o `Footer`
- [x] 4.2 No `Header`, ler `btn.url` e renderizar cada botão como `Button asChild` a envolver um `Link` com o href prefixado
- [x] 4.3 Tratar `openInNewTab` nos botões, com `target` e `rel` adequados
- [x] 4.4 Botão sem `url` authorada continua a renderizar com o rótulo, sem âncora de destino vazio e sem erro
- [x] 4.5 Passar `locale` ao `NavBarItem` e prefixar o `href` dos links com `localizedHref`
- [x] 4.6 Preservar a lógica de `activeHash` do `NavBarItem` — o cálculo do hash tem de continuar a funcionar com o href prefixado
- [x] 4.7 Inserir o switch no `Header`, à esquerda dos botões do CMS
- [x] 4.8 Tornar o `NavBarButtonWrap` visível em mobile (coluna em mobile, linha em desktop), sem alterar a disposição em desktop
- [x] 4.9 Confirmar que o `Header` não importa `next-intl` nem `@/i18n/navigation`

## 5. Fixture

- [x] 5.1 Criar `src/app/(app)/[locale]/fixtures/navbar/page.tsx` com `notFound()` sob `NODE_ENV !== "development"` como primeira instrução do corpo
- [x] 5.2 Definir um caso base "conteúdo completo" e derivar dele cada caso degradado, alterando um só campo por caso
- [x] 5.3 Cobrir: sem links, sem botões, botão sem `url`, link externo, link `mailto:`, âncora sem barra inicial, e a pílula em cada locale
- [x] 5.4 Declarar na página a contagem esperada de elementos, incluindo a duplicação causada pelo `NavBarMobileMenu` (cada navbar renderiza os children duas vezes)
- [x] 5.5 Comentar no topo quais cenários das specs a fixture cobre e o aviso de que campos novos no global `Menu` não quebram o build da fixture

## 6. Verificação

- [x] 6.1 `npm run lint` sem erros novos nos ficheiros desta mudança (o baseline do repo já falha em ficheiros gerados sob `(payload)/` e em `src/service/index.ts`)
- [x] 6.2 `npm run build` sem erros de tipo
- [x] 6.3 **Verificação de bundle:** procurar `clonePosition`, `bumpSpace`, `formatjs`, `intl-messageformat` e `next-intl` nos chunks de cliente — o build actual tem ZERO e é esse o número que tem de continuar
- [x] 6.4 Abrir `/en` e clicar no switch: chega a `/pt` na mesma rota, e a pílula passa a mostrar `PT`
- [x] 6.5 Abrir `/en/get-quote` e clicar no switch: chega a `/pt/get-quote`, não à raiz
- [x] 6.6 Abrir `/pt/get-quote?ref=teste` e confirmar que a query sobrevive à troca
- [x] 6.7 **Verificar o cookie `NEXT_LOCALE`** (o risco inferido do design): trocar para `pt`, depois navegar para `/` e confirmar que chega a `/pt` e não a `/en`. Se falhar, PAUSAR — o remédio muda a decisão 5 do design (o `Link` passa a `router.replace`, ou o switch escreve o cookie)
- [x] 6.8 Clicar no botão "Get Quote" do navbar e confirmar que chega a `/get-quote` no locale corrente
- [x] 6.9 Clicar num link de âncora do navbar em `/pt` e confirmar que não volta a `/en`
- [ ] 6.10 Abrir em viewport < 1024px, abrir o menu, e confirmar que o switch e os botões do CMS estão visíveis e funcionam
- [ ] 6.11 Navegar por `Tab` até ao switch e confirmar o anel de foco e o nome acessível anunciado
- [x] 6.12 Confirmar que nenhum `id` aparece duplicado no DOM por causa do switch
- [x] 6.13 Percorrer os casos da fixture e confrontar cada um com o cenário correspondente das specs

## 7. Entrega

- [x] 7.1 Listar ao utilizador o que preencher no CMS: a URL `/get-quote` no botão do global `Menu` — que a partir desta mudança passa a ter efeito — e as URL dos restantes links
- [x] 7.2 Registar as limitações assumidas: o hash não sobrevive à troca de idioma, e um terceiro locale exige rever o switch
