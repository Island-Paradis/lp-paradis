## Context

O footer é montado num único sítio, `(app)/[locale]/layout.tsx`, dentro do `SmoothScroll` e depois de `{children}`:

```
(app)/[locale]/layout.tsx
   └── <SmoothScroll>
         ├── <Header {...headerData} locale />
         ├── {children}          ← page.tsx | get-quote/page.tsx | fixtures/*
         └── <Footer {...footerData} locale />   ◀── um só, igual em toda rota
```

Um layout do App Router não recebe o pathname, e o `Footer` é um server component cujo ficheiro documenta, com números medidos (+33,6 KB), a decisão de **não** importar nada do runtime de cliente do next-intl. Qualquer solução que precise de `usePathname` transforma o footer em client component e queima essa medição. É a restrição dura deste desenho.

A faixa do mockup ocupa a largura do contentor do footer — o e-mail alinha com o logo, e as pills alinham com a coluna do CTA — e é separada do resto por uma linha. Ela pertence visualmente ao bloco do footer, não à página.

Três mudanças em curso tocam este território: `cut-sustained-runtime-cost` (orçamento de queries por request), `add-get-quote-page` (tarefa 10.3: nenhuma string inglesa em `/pt/get-quote`) e `finish-footer-implementation` (conteúdo do footer ainda por authorar, incluindo o Dribbble que o mockup mostra).

## Goals / Non-Goals

**Goals:**

- A faixa aparece em `/en/get-quote` e `/pt/get-quote`, e em nenhuma outra rota.
- O footer das rotas existentes fica inalterado — mesmas classes, mesmo HTML.
- `Footer` continua server component, sem import novo de next-intl.
- O custo de dados da variante não atinge as rotas que não a usam.
- Nenhuma string da faixa aparece em inglês numa página `/pt`.

**Non-Goals:**

- Redesenhar o footer existente. A faixa acrescenta; nada abaixo do divider muda.
- Tornar a faixa configurável por rota no CMS. O mapeamento rota → composição vive em código.
- Uma segunda coleção ou global para a faixa.
- Alterar o `Contact`, o `Header` ou a secção de contacto da homepage.

## Decisions

### 1. Rota paralela `@footer` para a variante por rota

O App Router tem uma feature exatamente para "conteúdo de layout que varia por rota sem mover a página": slots de rota paralela.

```
(app)/[locale]/
   ├── layout.tsx                    ← recebe { children, footer }, renderiza {footer}
   ├── (pages)/                      ← grupo de rota; não altera nenhuma URL
   │     ├── template.tsx            ← DESCE para cá, para não envolver o slot
   │     ├── page.tsx
   │     ├── get-quote/
   │     └── fixtures/**
   └── @footer/
         ├── default.tsx             ← <Footer {...footerData} locale />        (toda rota)
         └── get-quote/page.tsx      ← <Footer {...footerData} locale
                                          directContact={{ email, headings }} />
```

> **Corrigido durante a implementação.** Este desenho afirmava que nenhuma página se movia. Está errado, e a razão é o `template.tsx`: o Next aplica o template do segmento a **todos** os slots do layout, não só a `children`. Com o template em `[locale]/`, o slot `@footer` recebia a sua própria instância dele e o footer passava a sair do servidor dentro de `<div data-reveal style="opacity:0">` — invisível até hidratar, que é exatamente o defeito que a mudança `prevent-invisible-text` existe para impedir. Medido: com o template em `[locale]/`, o HTML de `/en` trazia `</div><div data-reveal="true" style="opacity:0;transform:translateY(12px)"><footer`.
>
> A correção é descer `template.tsx` — e com ele as páginas — para um grupo de rota `(pages)`, que não altera URL nenhuma e deixa o slot fora do alcance do template. Verificado depois da correção: **zero** wrappers `data-reveal` abertos sobre o `<footer>`, e o HTML do `<footer>` byte-a-byte igual à linha de base nas cinco rotas capturadas.
>
> Custo real, que o desenho original não previa: quatro entradas movidas para `(pages)/` e um import absoluto a corrigir — `GetQuote/index.tsx` importa a server action por caminho de rota (`@/app/(app)/[locale]/get-quote/actions`), que passou a `.../(pages)/get-quote/actions`. Continua a ser menos do que o split em route groups exigiria, porque as páginas descem um nível em bloco em vez de se dividirem por dois grupos com dois layouts.

O layout passa a assinar `{ children, footer }` e renderiza `{footer}` onde hoje está `<Footer>`. `getFooterPayload` sai do layout e entra nos dois ficheiros do slot — a contagem de queries por request não muda, porque só um dos dois corre em cada request.

**Alternativas consideradas:**

| Opção | Porque não |
|---|---|
| **Split em route groups** — `(site)/` e `(quote)/`, cada um com o seu layout e o seu `Footer` | Funciona, mas obriga a mover `page.tsx`, `get-quote/` e as três rotas de fixture para dentro de grupos. Reestrutura toda a árvore pública para acrescentar uma faixa a uma página. O slot obtém o mesmo resultado sem mover ficheiro nenhum. |
| **A página `/get-quote` renderiza a faixa**, acima do footer partilhado | Zero mudanças de arquitetura, e foi a candidata mais forte. Cai por duas razões concretas: a faixa teria de replicar `container px-4 xl:px-0` — o contrato de layout do footer — fora do footer, e a linha divisória do mockup passaria a ser um `border-b` da faixa a fingir ser um `border-t` do footer. Dois componentes obrigados a concordar sobre fundo, gutter e largura, sem nada que force o acordo. Além disso a faixa ficaria fora do `<footer>`, que é onde este conteúdo pertence. |
| **`usePathname` dentro do `Footer`** | Torna o footer client component e anula a medição de +33,6 KB documentada no próprio ficheiro. Descartada sem hesitação. |
| **Flag no CMS** | O utilizador pediu explicitamente âmbito por rota. Uma flag liga em todo o lado ou em lado nenhum. |

O `default.tsx` é o primeiro ficheiro a criar, não o último: sem ele, uma navegação dura para uma rota que o slot não cobre devolve 404. Ele é a rede, e existe antes de haver o que apanhar.

### 2. E-mail do `Contact`, títulos do global `Footer`

A faixa tem três origens de texto, e a divisão não é arbitrária:

```
"Reach Us Directly"   ──▶  global Footer . directContact.reachHeading    (localizado)
"geral@paradis.host"  ──▶  coleção Contact . email                       (não localizado)
"Elsewhere"           ──▶  global Footer . directContact.socialHeading   (localizado)
"Instagram" (pill)    ──▶  mapa SOCIAL_NAMES em código, via `platform`   (nome de marca)
```

O e-mail é um **facto da empresa** e já tem dono: `Contact.email`, `required: true`, não localizado — o mesmo endereço nos dois idiomas. Duplicá-lo num campo do global `Footer` criaria duas fontes de verdade para o mesmo dado, e a que ficasse desatualizada seria descoberta por um cliente a escrever para um endereço morto.

Os títulos são **cópia de apresentação**, mudam por idioma, e não existem em lado nenhum. O global `Footer` já é localizado, já é buscado pelo slot, e é onde vive o resto da cópia do footer. Pô-los ali é zero custo de dados.

Hardcodar os títulos como constantes `FALLBACK`, à maneira dos que já existem no ficheiro, foi rejeitado por um motivo específico e não por gosto: `add-get-quote-page` tarefa 10.3 exige que nenhuma string inglesa apareça em `/pt/get-quote`, e dois títulos em inglês no topo do footer violariam isso no primeiro render. As constantes `FALLBACK` continuam a existir para o caso de campo vazio — mas como piso, não como fonte.

`getContactPayload` é o **primeiro fetcher de coleção** do projeto; os quatro existentes são todos `findGlobal`. Usa `find({ collection: "contact", limit: 1, depth: 0 })`: `limit: 1` porque a faixa quer um endereço e não uma lista, `depth: 0` porque nada em `Contact` que a faixa lê é relação. Envolvido em `cache` do React no ficheiro do slot, pelo mesmo motivo que `get-quote/page.tsx` já o faz.

### 3. Rótulo da pill derivado de `platform`, não de `label`

O mockup mostra `Instagram`, `LinkedIn`, `Dribbble` como texto dentro das pills. O campo que existe hoje para texto é `socialLinks[].label`, e a sua descrição no admin instrui o editor ao contrário:

> "**Not shown on screen** — it is the link's accessible name, read by screen readers (e.g. 'Paradis on LinkedIn')."

O conteúdo já authorado segue essa instrução. Reusar `label` na pill mostraria *"Paradis on LinkedIn"* dentro da pill, no dia em que a mudança fosse aplicada, sem ninguém ter editado nada.

Um mapa de strings resolve, e é barato de uma forma que o mapa de ícones não é:

```
SOCIAL_ICONS  →  3 entradas.  Cada entrada é um import de componente: custa bundle.
SOCIAL_NAMES  →  9 entradas.  Cada entrada é uma string: custa bytes, não módulos.
```

Por isso `SOCIAL_NAMES` cobre as nove plataformas nomeáveis do enum (`dribbble`, `linkedin`, `instagram`, `github`, `twitter`, `facebook`, `youtube`, `discord`, `whatsapp`) enquanto `SOCIAL_ICONS` continua com três. A décima opção, `other`, não tem nome derivável — para essa, e só para essa, a pill mostra o `label`. É cópia imperfeita, mas visível: o comentário que já está no ficheiro chama "o pior modo de falha possível" a um link authorado que não renderiza sem erro e sem pista, e omitir a pill seria exatamente isso.

Nomes de marca não se traduzem, então derivar em código não perde localização — "LinkedIn" é "LinkedIn" em `pt`.

Dentro da pill, o ícone é `aria-hidden` e o nome acessível continua a ser o `label` authorado, via `aria-label` na âncora. O texto visível e o nome acessível divergem de propósito: "Instagram" na tela, "Paradis Labs on Instagram" para o leitor de ecrã.

### 4. Ordem: a do CMS, nos dois sítios

O mockup mostra as pills como `Instagram → LinkedIn → Dribbble` e os ícones da barra inferior como `Dribbble → LinkedIn → Instagram` — invertidos. O código atual renderiza na ordem do array do CMS, e a descrição do campo promete isso ao editor ("in the order added here").

A faixa mantém essa promessa: **os dois sítios renderizam na ordem do array**. A inversão do mockup é tratada como ruído de Figma, não como requisito. Inverter um dos dois exigiria explicar ao editor porque a ordem que ele escolhe só vale em metade do footer. Está registado em Open Questions.

### 5. A faixa é uma prop opcional, não um modo

`Footer` ganha `directContact?: FooterDirectContact`. Sem a prop, o componente renderiza o que renderiza hoje — a composição atual é o caminho normal, e a faixa é o acréscimo. Isto mantém `@footer/default.tsx` trivial, mantém a fixture existente válida sem alteração, e faz do "footer sem faixa" o estado que não pode regredir por omissão.

A faixa renderiza dentro do `<footer>`, como primeiro filho do contentor, com `border-b border-white/20` — a mesma cor de linha que a barra inferior já usa.

## Risks / Trade-offs

**[Slot sem `default.tsx` devolve 404 em navegação dura]** → `default.tsx` é a primeira tarefa de implementação, antes de qualquer coisa específica do `/get-quote`. A verificação inclui carregar `/en`, `/pt` e as três rotas de fixture com recarga completa, não só navegação por clique — o modo de falha só aparece na navegação dura.

**[Rotas paralelas são a feature menos percorrida do App Router aqui]** → Nenhum outro slot existe no projeto. Mitigação: o slot não tem estado, não tem `loading.tsx` nem `error.tsx`, e as suas duas folhas são server components que só buscam e renderizam. É a forma mais simples possível da feature.

**[`template.tsx` envolve `children` e não o slot]** → ~~Hoje o footer está dentro do `template` e reanima a cada navegação; depois da mudança deixa de reanimar, o que é uma alteração de comportamento visível.~~ **Corrigido durante a implementação: a premissa era falsa.** No App Router o `template.tsx` fica *entre* o layout e a página, então `{children}` no layout já é `<Template>{page}</Template>` e o `<Footer>` que vem a seguir é **irmão** do template, não filho. Verificado no HTML renderizado de `/en`: o `<div data-reveal>` do template abre no byte 6513 e fecha no 85569, exatamente onde o `<footer>` começa. O footer já hoje está fora da animação e já não reanima. O slot preserva esse arranjo em vez de o mudar, e o risco não existe. O requisito na spec continua a valer — como invariante a **preservar**, não como mudança a introduzir.

**[A faixa expõe conteúdo por authorar]** → `finish-footer-implementation` 3.5 regista que o Dribbble não está no CMS e que falta `label` em `pt`. A faixa mostra os socials num segundo sítio, então uma lacuna passa a ser visível duas vezes. Mitigação: as tarefas de authoring vêm antes da verificação visual, e a fixture cobre o caso "socials em falta".

**[Coleção `Contact` vazia]** → `email` é `required`, mas isso é por documento, não garante que exista documento. Sem documento, ou sem e-mail, o bloco "Reach Us Directly" não renderiza e a faixa mostra só as redes; sem redes **e** sem e-mail a faixa inteira desaparece, incluindo o divider. Coberto por cenário na spec e por caso na fixture.

**[Duas fontes para uma faixa]** → Um editor que queira mudar a faixa mexe em dois sítios do admin: `Contact` para o e-mail, global `Footer` para os títulos. É o preço de não duplicar o e-mail. Mitigado por texto de `admin.description` nos campos novos, a dizer de onde vem o e-mail.

**[Primeiro fetcher de coleção]** → `payload-functions.ts` está construído à volta de `getGlobal<T>`; `getContactPayload` não cabe nesse helper. Fica como função própria ao lado, sem refactor do helper existente — o refactor pertence à mudança que precisar do segundo fetcher de coleção, não a esta.

## Migration Plan

Sem migração de dados. O schema ganha dois campos de texto opcionais num grupo novo; Payload adiciona colunas nulas e nenhuma linha existente fica inválida. `npx payload generate:types` depois.

Rollback: reverter o commit. O único estado fora do código são os dois campos novos no Postgres, que ficam órfãos e inertes — nenhum código os lê depois do reverter, e nenhum código existente falha por eles existirem.

Ordem de implementação, e a razão de cada passo vir onde vem:

1. `@footer/default.tsx` + layout a receber o slot. **Sem faixa nenhuma.** Isola a mudança arquitetural arriscada num passo verificável sozinho: se algo partir aqui, partiu por causa do slot e não da faixa.
2. Campos no global `Footer` + `generate:types`.
3. `getContactPayload` + tipos.
4. Faixa no componente, atrás da prop.
5. `@footer/get-quote/page.tsx` liga as peças.
6. Fixture e authoring de conteúdo.

## Open Questions

- **Ordem das pills vs. ícones.** A decisão 4 segue o CMS nos dois sítios e trata a inversão do mockup como ruído. Se for intencional, é uma linha (`.toSlice().reverse()`) — mas precisa de resposta de quem desenhou.
- **Socials duplicados no mesmo footer.** A faixa e a barra inferior passam a mostrar as mesmas três redes, a ~700px de distância vertical. O mockup mostra os dois, então é o que se implementa. Vale confirmar que não é sobra de iteração do Figma — a alternativa seria a barra inferior perder os ícones quando a faixa existe.
- **Destino do e-mail.** O mockup mostra o e-mail sublinhado, o que sugere `mailto:`. Assumido `mailto:`; nada no mockup o contradiz.
- **Comportamento em ecrã estreito.** O mockup só define desktop, tal como aconteceu com a barra inferior. Assumido o mesmo tratamento que já lá está: empilhar (`flex-col` → `sm:flex-row`), com as pills a quebrar linha.
