## Why

O `Button` com `textSwap` inverte apenas duas coisas no hover — a cor do rótulo e o painel que sobe — e o mapa `swapInvert` em `src/components/Button/index.tsx:67-78` não conhece mais nada. Tudo o resto no botão mantém a cor de repouso. O resultado é que **os dois CTAs com ícone da home perdem elementos visíveis no hover**, e por causas diferentes que partilham a mesma raiz: uma cor fixa que passa a coincidir com aquilo que está por trás dela.

- **CTA de Serviços** (`page.tsx:61-69`, `variant="outline"` + `circleIcon`): o disco do ícone tem `bg-primary p-1 text-white` cravado na linha 128, sem qualquer regra de hover. Quando o preenchimento `bg-primary` sobe, o disco fica exactamente da cor do preenchimento — contraste 1:1 — e desaparece. Sobra a seta branca a flutuar, sem badge. A borda sofre o mesmo: `hover:border-primary!` iguala-a ao preenchimento.
- **CTA da ProductsSection** (`ProductsSection/index.tsx:24-35`, `variant="inverted"`): a secção inteira corre dentro de `bg-primary` (`page.tsx:91`) e o preenchimento de hover desta variante é *também* `bg-primary`. A variante não tem borda nenhuma. No hover o botão inteiro dissolve-se no fundo da secção e ficam apenas o rótulo e a seta brancos suspensos, sem silhueta.

A seta nua da ProductsSection já inverte sozinha porque herda `currentColor` (o `IconBase` do `@solar-icons/react` usa `color = "currentColor"` por omissão) — esse é o único comportamento correcto dos dois, e a mudança tem de o preservar em vez de o duplicar.

## What Changes

O princípio é um só: **nada num botão pode ficar da cor daquilo que está imediatamente atrás dele.** Isso obriga a inversão a cobrir mais do que texto e preenchimento.

- **O mapa `swapInvert` passa de dois para quatro slots.** Além de `text` e `fill`, ganha `icon` (o disco do `circleIcon` e o seu glifo) e `rim` (a cor do contorno em hover). Continua a ser indexado por variante, portanto cada variante declara explicitamente como cada camada inverte.
- **O disco do `circleIcon` inverte com o preenchimento.** Em `outline`, o disco passa de `#212528` com seta branca para branco com seta `#212528`. A transição usa a mesma duração e o mesmo easing do painel que sobe, para o disco não saltar para branco enquanto o botão ainda está claro — o que o faria desaparecer no sentido inverso durante a subida.
- **A classe `icon` no `<span>` do ícone deixa de ser morta.** Hoje está no `className` da linha 127 e não corresponde a regra nenhuma em `globals.css`; passa a ser o gancho por onde a inversão do ícone é aplicada.
- **As variantes com `textSwap` passam a ter contorno de 1,5px permanente.** Em repouso e em hover, para a caixa de conteúdo não encolher meio pixel de cada lado a meio da animação — o `border` conta para dentro do box e o `magnetic` já está a deslocar o botão ao mesmo tempo. Só a **cor** da borda muda.
- **A variante `inverted` ganha borda transparente de 1,5px em repouso**, que passa a ter cor no hover. Em repouso o botão continua a ler-se como um bloco branco sem anel; no hover ganha o rebordo que o separa da secção escura. Reservar a espessura em repouso é o que torna a mudança livre de salto de layout.
- **Passa a existir uma rota de fixture para botões**, nos moldes da que já existe para o `Footer`: renderiza cada variante nos dois estados sobre os dois fundos, para os estados degradados serem verificáveis sem navegar a home inteira.

Fora de escopo, deliberadamente: o botão `outline-inverted` do rodapé (não tem `textSwap`, cai no hover da `cva` e é outro ramo do código), as cores de **repouso** do `circleIcon` nas variantes `primary` e `outline-inverted` (nenhuma delas usa `circleIcon` hoje), e qualquer alteração às durações ou ao easing das animações existentes.

## Capabilities

### New Capabilities

- `button-hover-inversion`: O contrato de inversão do `Button` com `textSwap` — que camadas invertem no hover (rótulo, preenchimento, ícone, contorno), qual é a regra de contraste que nenhuma camada pode violar, como as transições se sincronizam com o painel que sobe, e a garantia de que a geometria da caixa não muda entre repouso e hover.

### Modified Capabilities

Nenhuma. `openspec/specs/` contém hoje apenas `homepage-shape-interlock`, cujos requisitos tratam da geometria do encaixe entre `.video_shape` e `.services_shape` e não são tocados aqui.

## Impact

**Código afetado**

- `src/components/Button/index.tsx` — o mapa `swapInvert`, a `cva` `buttonVariants` (espessura da borda em `outline` e `inverted`) e o `<span>` do ícone na linha 126-132. É o único ficheiro de componente alterado.
- `src/app/(app)/[locale]/(pages)/fixtures/buttons/page.tsx` — rota nova, guardada por `NODE_ENV === "development"` como a de `footer`.

**Consumidores verificados, não alterados**

`page.tsx` (CTA de Serviços), `ProductsSection` (CTA de Produtos), `Hero`, `Header`, `Footer`, `QuoteForm`, `NavBarMobileMenu`, `LocaleSwitch` e `bento-grid` passam todos por `buttonVariants`. A mudança na `cva` toca as variantes `outline` e `inverted`, portanto o `Hero` (`outline`, sem ícone) e o `Header` (`outline` com `bg-white` por cima) mudam de 1px para 1,5px de borda em repouso e precisam de conferência visual.

**Caso adjacente conhecido, fora de escopo**

A variante `primary` com `textSwap` tem a mesma falha estrutural da `inverted`: o preenchimento de hover é `bg-white` e o `Hero` corre sobre fundo claro, portanto o botão dissolve-se no sentido oposto. Não foi incluída porque não foi observada como problema e o `Hero` não foi verificado; o slot `rim` fica disponível para a tratar depois sem novo redesenho.

**Sem impacto**

Nenhuma alteração ao esquema do Payload, portanto não é preciso correr `npx payload generate:types`. Nenhuma dependência nova.
