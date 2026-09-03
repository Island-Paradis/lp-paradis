## 1. Schema do Payload

- [x] 1.1 Criar `src/collections/pages/GetQuotePage.ts` — global slug `get-quote-page`, `label: "Get Quote Page"`, `admin.group: "Site Settings"`, `access.read: () => true`
- [x] 1.2 Adicionar o grupo `seo` (`metaTitle`, `metaDescription`, ambos `localized`), seguindo a forma do grupo `seo` da `HomePage`
- [x] 1.3 Adicionar o grupo `hero`: `headline` (textarea, localized — o design mostra duas linhas) e `intro` (textarea, localized)
- [x] 1.4 Adicionar o grupo `availability`: `enabled` (checkbox, default `true`), `label` (text, localized), `location` (text, localized), com `admin.condition` a esconder os dois últimos quando `enabled` é falso
- [x] 1.5 Adicionar o grupo `form` com os rótulos: `eyebrow`, `nameLabel`, `emailLabel`, `interestsLabel`, `messageLabel`, `submitLabel`, `privacyNote` — todos `localized`
- [x] 1.6 Adicionar `form.interests` como `relationship` para `services`, `hasMany: true`, com `admin.description` a explicar que os chips saem de Services e que um interesse novo exige uma entrada de serviço
- [x] 1.7 Adicionar `form.enabled` (checkbox, default `true`) com `admin.description` a identificá-lo como a válvula de fecho da única escrita pública do site
- [x] 1.8 Adicionar o grupo `form.messages`: `success`, `error`, e uma mensagem por código de validação (`nameRequired`, `emailRequired`, `emailInvalid`, `messageRequired`, `tooLong`) — todos `localized`
- [x] 1.9 Confirmar que nenhum campo não-visível ficou `localized` (flags, e nada de `href`/e-mail neste schema)

## 2. Coleção de submissões

- [x] 2.1 Criar `src/collections/QuoteRequests.ts` — slug `quote-requests`, labels singular/plural, `admin.group: "Submissions"`
- [x] 2.2 Definir o access control da decisão 5 do design: `create: () => true`, e `read`/`update`/`delete` exigindo `req.user`
- [x] 2.3 Campos de conteúdo: `name` (text, required), `email` (email, required), `message` (textarea, required)
- [x] 2.4 Campos de interesse: `services` (`relationship → services`, `hasMany`) e `serviceSlugs` (array de text ou text `hasMany`) para o snapshot de slugs
- [x] 2.5 Metadados `readOnly`: `submittedLocale` (select `en`/`pt`), derivado no servidor e nunca aceite do cliente
- [x] 2.6 `admin.defaultColumns` com nome, e-mail e `createdAt`; `admin.useAsTitle` no e-mail ou no nome

## 3. Registo e tipos

- [x] 3.1 Registar `GetQuotePage` em `globals` e `QuoteRequests` em `collections` no `src/payload.config.ts`
- [x] 3.2 Adicionar `getQuote: "get-quote-page"` a `GLOBAL_SLUGS` em `src/service/constants.ts`
- [x] 3.3 Correr `npx payload generate:types` e confirmar que `payload-types.ts` ganhou `GetQuotePage` e `QuoteRequest`
- [x] 3.4 Adicionar `PopulatedGetQuotePage` a `src/service/types.ts`, substituindo o relationship de interesses pelo array de `Service` populado
- [x] 3.5 Adicionar `getQuotePagePayload(locale)` a `src/service/payload-functions.ts`, reusando o `getGlobal` genérico, e exportá-lo

## 4. Helper de texto partilhado

- [x] 4.1 Criar `src/lib/cms-text.ts` exportando `textOr(value, fallback)` com a semântica de vazio do footer — `null`/`undefined`/`""`/só-espaços caem no piso, valor com conteúdo sai intacto
- [x] 4.2 Comentar no módulo por que existe (o Payload grava `""` ao limpar um campo, e `"" ?? x` devolve `""`) e que o footer tem uma cópia local a migrar depois de `finish-footer-implementation` fechar
- [x] 4.3 NÃO alterar `src/components/Footer/index.tsx` nesta mudança

## 5. Validação partilhada

- [x] 5.1 Criar o schema `zod` da submissão num módulo partilhado (nome, e-mail, mensagem, interesses, honeypot) com limites máximos de comprimento e teto no número de interesses
- [x] 5.2 Definir os códigos de erro do schema como um conjunto fechado, para casarem com os campos de `form.messages` da global
- [x] 5.3 Criar o mapa de pisos em código para cada mensagem de validação, de sucesso e de erro

## 6. Server Action

- [x] 6.1 Criar `src/app/(app)/[locale]/get-quote/actions.ts` com a action de submissão
- [x] 6.2 Sair com sucesso e sem gravar quando o honeypot vem preenchido
- [x] 6.3 Rejeitar sem gravar quando `form.enabled` está desligado na global — a verificação corre no servidor, não só no cliente
- [x] 6.4 Revalidar toda a entrada com o schema zod, independentemente do que o cliente validou
- [x] 6.5 Resolver os interesses recebidos contra `services`, descartando identificadores que não correspondam a nenhum serviço e mantendo os válidos
- [x] 6.6 Gravar via `payload.create` usando `getPayloadInstance()`, derivando `submittedLocale` no servidor
- [x] 6.7 Devolver um estado tipado (sucesso, erro de validação por campo, erro de gravação) consumível pelo cliente

## 7. Componentes

- [x] 7.1 Criar `src/components/GetQuote/index.tsx` como server component, recebendo `PopulatedGetQuotePage & { locale }`
- [x] 7.2 Resolver todos os rótulos com `textOr` no servidor e montar a lista de chips como `{ slug, title }`
- [x] 7.3 Renderizar headline, intro e eyebrow conforme o layout do design
- [x] 7.4 Renderizar a pill de disponibilidade: omitida por completo com `enabled` desligado; sem separador quando `location` está vazio
- [x] 7.5 Criar `src/components/GetQuote/QuoteForm.tsx` com `"use client"`, recebendo apenas strings resolvidas e a lista de chips
- [x] 7.6 Inputs de nome e e-mail no estilo underline do design, com os rótulos recebidos
- [x] 7.7 Chips de interesse com estado de seleção; a secção inteira (rótulo incluído) não renderiza quando a lista está vazia
- [x] 7.8 Textarea da mensagem e nota de privacidade
- [x] 7.9 Botão de submissão reusando `src/components/Button`, desativado durante a submissão
- [x] 7.10 Campo honeypot escondido, fora da ordem de tabulação e dos leitores de ecrã
- [x] 7.11 Estados de sucesso, de erro de gravação e de erro por campo, com o texto recebido; em erro de gravação os valores escritos permanecem no formulário
- [x] 7.12 Confirmar que o módulo de cliente não importa de `@/i18n/navigation` e que nenhum ícone é resolvido por indexação dinâmica sobre `import * as`

## 8. Rota

- [x] 8.1 Substituir o stub de `src/app/(app)/[locale]/get-quote/page.tsx` por um server component que chama `getQuotePagePayload(locale)` e renderiza `GetQuote`
- [x] 8.2 Exportar `generateMetadata` a partir do grupo `seo`, com o título estático do layout como piso
- [x] 8.3 Confirmar que a página renderiza inteira com a global vazia, sem lançar erro

## 9. Fixture

- [x] 9.1 Criar `src/app/(app)/[locale]/fixtures/get-quote/page.tsx` com `notFound()` sob `NODE_ENV !== "development"` como primeira instrução do corpo
- [x] 9.2 Definir um caso base "conteúdo completo" e derivar dele cada caso degradado, alterando um só campo por caso
- [x] 9.3 Cobrir: global vazia, sem serviços ligados, pill desativada, pill sem localidade, `submitLabel` em branco, formulário desligado
- [x] 9.4 Identificar cada caso no ecrã e comentar no topo quais cenários das specs a fixture cobre, mais o aviso de que campos novos na global não quebram o build da fixture

## 10. Verificação

- [x] 10.1 `npm run lint` sem erros
- [x] 10.2 `npm run build` sem erros de tipo
- [ ] 10.3 Abrir `/en/get-quote` e `/pt/get-quote` com a global preenchida nos dois locales e confirmar que nenhuma string em inglês aparece na rota `/pt`
- [x] 10.4 Percorrer os casos da fixture no dev server e confrontar cada um com o cenário correspondente das specs
- [ ] 10.5 Submeter o formulário e confirmar o documento em `/admin`, com locale e slugs de serviço corretos
- [x] 10.6 Fazer um GET anónimo a `/api/quote-requests` e confirmar que nenhuma submissão é devolvida
- [ ] 10.7 Submeter com o honeypot preenchido (via devtools) e confirmar sucesso no cliente sem documento criado
- [ ] 10.8 Desligar `form.enabled`, confirmar que o formulário desaparece e que a action invocada diretamente não grava
- [ ] 10.9 Clicar duas vezes no botão de submissão e confirmar que só um documento é criado
- [ ] 10.10 Verificar o peso do chunk de cliente da rota e confirmar que não aparece runtime do `@formatjs` nem namespace de ícones

## 11. Entrega

- [x] 11.1 Documentar a ordem de deploy: aplicar o schema Postgres antes de publicar a página, para o primeiro `findGlobal` não rebentar em 500
- [x] 11.2 Listar ao utilizador o que falta preencher no CMS: os campos da global nos dois locales, as entradas de `Services` para os interesses que ainda não existem (o design mostra "API & Integrations" e "AI Solutions"), e a URL `/get-quote` no botão do navbar
