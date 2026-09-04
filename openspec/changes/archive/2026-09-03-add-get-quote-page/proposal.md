## Why

O botão "Get Quote" já existe no navbar ([NavBar.ts](../../../src/collections/globals/NavBar.ts) `buttons`) e no footer ([Footer/index.tsx:34](../../../src/components/Footer/index.tsx#L34)), ambos apontando para `/get-quote` — mas a rota é um stub que renderiza a palavra "page". O caminho de conversão principal do site termina numa página vazia.

Além disso, o site não tem nenhuma superfície de captação: a `Contact` já pede um `formRecipientEmail` ([Contact.ts:93](../../../src/collections/Contact.ts#L93)) que **nenhum código consome** — um campo órfão. Um pedido de orçamento hoje não chega a ninguém.

## What Changes

- **Nova global `GetQuotePage`** (slug `get-quote-page`, grupo "Site Settings") com todo o texto da página: headline, parágrafo de introdução, pill de disponibilidade, eyebrow, rótulos de cada campo do formulário, rótulo do botão, nota de privacidade, e as mensagens de sucesso/erro/validação. A cópia passa a ser editável no CMS; os literais do design continuam em código como **piso** de cada campo, pela mesma razão documentada no footer ([Footer/index.tsx](../../../src/components/Footer/index.tsx) `FALLBACK`) — ler do CMS inverte o risco, e um campo esvaziado no admin não pode apagar um rótulo do ecrã.
- **A rota `/[locale]/get-quote`** deixa de ser stub e passa a renderizar o layout do design a partir dessa global, com `generateMetadata` a partir do grupo `seo`.
- **Os chips "I'm interested in…"** são um `relationship` para a coleção `Services` existente (`hasMany`), não uma lista própria. Os serviços passam a ser a fonte única de verdade dos interesses selecionáveis. **Consequência operacional:** interesses que não existam hoje em `Services` (o design mostra "API & Integrations" e "AI Solutions") precisam de ser criados como entradas de serviço no CMS antes de aparecerem como chips.
- **Nova coleção `QuoteRequests`** que persiste as submissões: nome, e-mail, serviços de interesse (relationship), mensagem, locale de origem, e metadados. Visível em `/admin` — o admin é a inbox. `create` público, `read`/`update`/`delete` só autenticado.
- **Server Action** que valida com `zod` (já nas dependências) e grava via `payload.create`, com honeypot e guarda de tamanho contra spam. Nenhum transporte de e-mail é introduzido nesta mudança.
- **Toda a cópia visível é `localized: true`**, sem exceção — a página existe em `/en` e `/pt` e as coleções atuais são inconsistentes nisso.
- **Nova rota de fixture dev-only** `/[locale]/fixtures/get-quote`, no mesmo padrão do footer, exercitando os estados degradados: global vazia, sem serviços ligados, pill desativada, rótulos em branco.

Não há mudança de comportamento em nenhuma superfície existente. Nada de **BREAKING**.

## Capabilities

### New Capabilities
- `get-quote-page`: a página `/get-quote` inteiramente dirigida pelo CMS — a forma da global `GetQuotePage`, o mapeamento de cada campo para o design, o comportamento com conteúdo em falta ou parcial, a localização por locale, e os metadados de SEO.
- `quote-request-intake`: o caminho de submissão — validação, persistência em `QuoteRequests`, controlo de acesso da coleção, resistência a spam, e os estados de sucesso e de erro apresentados ao visitante.

### Modified Capabilities
Nenhuma. `homepage-shape-interlock` não é tocada.

## Impact

**Novos ficheiros**
- `src/collections/pages/GetQuotePage.ts` — a global
- `src/collections/QuoteRequests.ts` — a coleção de submissões
- `src/components/GetQuote/index.tsx` — o server component da página
- `src/components/GetQuote/QuoteForm.tsx` — o client component do formulário (precisa de estado)
- `src/app/(app)/[locale]/get-quote/actions.ts` — a Server Action
- `src/app/(app)/[locale]/fixtures/get-quote/page.tsx` — fixture dev-only

**Ficheiros alterados**
- `src/payload.config.ts` — registar a global e a coleção
- `src/service/constants.ts` — `GLOBAL_SLUGS.getQuote`
- `src/service/payload-functions.ts` — `getQuotePagePayload` (reusa o `getGlobal` genérico)
- `src/service/types.ts` — `PopulatedGetQuotePage` (o relationship de serviços vem populado a `depth: 2`)
- `src/app/(app)/[locale]/get-quote/page.tsx` — substitui o stub
- `payload-types.ts` — regenerado via `npx payload generate:types`

**Base de dados.** Postgres ganha as tabelas da global (`get_quote_page` + `_locales` + join de relationship para `services`) e da coleção (`quote_requests` + join para `services`). Em dev o push é automático; em produção o schema tem de ser aplicado antes do deploy da página.

**Dependências.** Nenhuma nova — `zod@^4.4.3` já está no `package.json`.

**Dados de CMS a preencher pelo utilizador** (fora do escopo do código): o texto de todos os campos da global nos dois locales, as entradas de `Services` que faltam para os chips, e a URL `/get-quote` no botão do navbar.
