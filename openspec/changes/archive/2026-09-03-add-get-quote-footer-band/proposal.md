## Why

O mockup da página de orçamento mostra o footer com uma faixa de topo — "Reach Us Directly" com o e-mail da empresa, e "Elsewhere" com as redes sociais em pills rotuladas — que **não existe em lugar nenhum do código**. Quem chega ao `/get-quote` está a um passo de contactar; a faixa oferece o caminho direto (e-mail, redes) para quem não quer preencher o formulário, sem competir com ele.

A faixa é pedida **só para o `/get-quote`**. O footer hoje é montado uma única vez em `(app)/[locale]/layout.tsx`, depois de `{children}`, e serve todas as rotas com a mesma composição — não existe nenhum mecanismo para variar o footer por rota. Essa é a maior parte do trabalho.

## What Changes

- **Slot de footer por rota.** `Footer` sai de `(app)/[locale]/layout.tsx` e passa a ser servido por uma rota paralela `@footer`. `@footer/default.tsx` serve a composição atual a todas as rotas; `@footer/get-quote/page.tsx` serve a composição com faixa. **Nenhuma URL muda**, mas — ao contrário do que este proposal afirmava antes da implementação — as páginas **descem** para um grupo de rota `(pages)/`, junto com o `template.tsx`. É obrigatório: o Next aplica o template do segmento a todos os slots, e com o template acima do slot o footer sairia do servidor invisível (`opacity:0`) à espera de hidratar. Ver a correção registada em `design.md`, decisão 1.
- **Faixa de contacto direto** no componente `Footer`, atrás de uma prop opcional `directContact`. Ausente a prop, o footer renderiza exatamente como hoje — a composição atual é o default, não um caso especial.
- **E-mail lido da coleção `Contact`** (`Contact.email`, que já existe e é `required`), por um novo fetcher `getContactPayload`. A query acontece **só no slot do `/get-quote`**, não no layout partilhado, então nenhuma outra rota ganha custo.
- **Dois campos localizados novos no global `Footer`** (`directContact.reachHeading`, `directContact.socialHeading`) para os títulos da faixa. Os títulos são cópia traduzível e o global `Footer` já é localizado e já é buscado; o e-mail não é traduzível e fica no `Contact`.
- **Rótulos visíveis das pills derivados de `platform`** por um mapa de strings em código, ao lado do `SOCIAL_ICONS` que já existe. Nenhum campo novo no array `socialLinks`, e o contrato documentado de `label` ("not shown on screen") permanece intacto.
- **Fixture estendida.** `/[locale]/fixtures/footer` ganha os casos degradados da faixa (sem e-mail, sem socials, plataforma sem nome mapeado), seguindo a convenção que o `CLAUDE.md` fixa como única superfície de verificação.
- **`payload-types.ts` regenerado** após os campos novos do global.

Não é breaking para o utilizador final: nenhuma rota muda de URL e o footer das rotas existentes fica pixel-a-pixel igual.

## Capabilities

### New Capabilities

- `route-scoped-footer`: como uma rota escolhe a composição do seu footer. Cobre o ponto de montagem único, o default que serve todas as rotas não-especializadas, a garantia de que nenhuma rota fica sem footer, e a garantia de que o custo de dados de uma variante não vaza para as outras rotas.
- `footer-direct-contact-band`: o conteúdo e a degradação da faixa. Cobre a origem de cada texto (e-mail no `Contact`, títulos no global `Footer`, nomes de plataforma em código), o comportamento quando cada peça falta, a localização em `/pt`, e a relação entre as pills da faixa e os ícones da barra inferior.

### Modified Capabilities

Nenhuma. As capabilities de footer existentes (`footer-content-authority`, `footer-link-semantics`, `footer-state-fixture`) vivem em mudanças ainda **não arquivadas** e nenhuma delas descreve o ponto de montagem nem a faixa; os seus requisitos continuam válidos sem alteração. O acoplamento com elas é de texto, não de requisito, e está listado em Impact.

## Impact

**Código**

| Ficheiro | Mudança |
|---|---|
| `src/app/(app)/[locale]/layout.tsx` | Aceita o slot `footer`; deixa de importar `Footer` e de chamar `getFooterPayload` |
| `src/app/(app)/[locale]/@footer/default.tsx` | **novo** — footer sem faixa, para todas as rotas |
| `src/app/(app)/[locale]/@footer/get-quote/page.tsx` | **novo** — footer com faixa, busca `Contact` |
| `src/components/Footer/index.tsx` | Prop `directContact` opcional, subcomponente da faixa, mapa `SOCIAL_NAMES` |
| `src/collections/globals/Footer.ts` | Grupo `directContact` com dois campos de texto localizados |
| `src/service/payload-functions.ts` | `getContactPayload` — o primeiro fetcher de **coleção**; os quatro existentes são todos de global |
| `src/service/types.ts` | `PopulatedContact`, tipo da prop `directContact` |
| `src/app/(app)/[locale]/fixtures/footer/page.tsx` | Casos da faixa; corrigir o comentário que diz que o footer herdado vem do `layout.tsx` |
| `payload-types.ts` | Regenerado |

**Conteúdo (CMS)** — a faixa depende de conteúdo que hoje não está authorado:

- `directContact.reachHeading` e `directContact.socialHeading` em `en` **e** `pt`.
- Um documento em `Contact` com `email` preenchido. Se a coleção estiver vazia, a faixa degrada.
- O mockup mostra **três** socials; `finish-footer-implementation` tarefa 3.5 regista que o **Dribbble ainda não foi authorado** e que falta o `label` em `pt` para os dois existentes. A faixa torna essa lacuna visível em dois sítios em vez de um.

**Mudanças em curso**

- `cut-sustained-runtime-cost`: a faixa adiciona **uma** query por request, e só em `/get-quote`. O número de queries do layout partilhado não muda — `getFooterPayload` muda de sítio, não de contagem.
- `add-get-quote-page` (58/64): a tarefa 10.3 exige que nenhuma string em inglês apareça em `/pt/get-quote`. Os títulos da faixa entram nesse âmbito, e é por isso que são campos localizados em vez de literais em código.
- `verify-footer-edge-cases` (completa): o comentário da fixture conta "CINCO footers fabricados, mais UM real herdado do `layout.tsx`". A contagem continua seis; a origem do sexto passa a ser o slot.

**Risco principal**

Rotas paralelas são a feature menos percorrida do App Router neste projeto. Um slot sem `default.tsx` faz o Next devolver 404 em navegação dura — a mitigação é que `default.tsx` é o primeiro ficheiro criado e cobre tudo. O `template.tsx` existente envolve só o slot `children`, o que é o comportamento desejado: o footer não deve reanimar a cada navegação.
