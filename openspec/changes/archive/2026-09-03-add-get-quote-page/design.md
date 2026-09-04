## Context

A rota `/[locale]/get-quote` existe como stub de sete linhas. O navbar e o footer já apontam para ela, então o caminho de conversão do site termina em branco.

Três restrições do repo moldam esta mudança mais do que o design da página:

**1. Não existe catálogo de mensagens do next-intl.** [`src/i18n/request.ts`](../../../src/i18n/request.ts) devolve apenas `locale` — nenhum `messages`. Não há `useTranslations` em nenhum ficheiro. Consequência: strings que noutro projeto viveriam num `pt.json` (validação, sucesso, erro) **têm de ser campos do Payload**, ou ficam presas num só idioma.

**2. Cópia lida do CMS inverte o risco de conteúdo em falta.** O footer documenta isto no seu mapa `FALLBACK`: antes, o texto era garantido por estar em código; depois de vir do banco, um campo esvaziado no admin apaga-o do ecrã. O Payload grava string vazia (não `null`) quando um campo de texto é limpo, e `"" ?? x` devolve `""` — daí o helper `textOr`, que trata `""` e só-espaços como vazio.

**3. O bundle de cliente é orçamentado e o projeto já pagou por errar nisso.** [`Button/index.tsx`](../../../src/components/Button/index.tsx) documenta 12,7 MB retidos por resolver ícones via `Icons[nome]` sobre `import * as`. O footer documenta +33,6 KB por importar `Link`/`getPathname` de `@/i18n/navigation`, que arrastam o parser ICU do `@formatjs`. Um formulário é código de cliente — é exatamente onde esse custo reaparece.

Não há test runner. A única superfície de verificação é a rota de fixture dev-only, padrão estabelecido em [`fixtures/footer`](<../../../src/app/(app)/[locale]/fixtures/footer/page.tsx>).

## Goals / Non-Goals

**Goals:**
- A página renderiza o design a partir da global `GetQuotePage`, nos dois locales, sem cópia inventada em runtime.
- Uma submissão válida fica persistida e visível em `/admin` — nenhum lead depende de e-mail.
- Conteúdo em falta ou parcial degrada de forma legível, e esse comportamento é verificável sem banco.
- Zero dependências novas e zero variáveis de ambiente novas.

**Non-Goals:**
- **Notificação por e-mail.** Não há transporte configurado no [`payload.config.ts`](../../../src/payload.config.ts). Fica para mudança própria; o `formRecipientEmail` órfão da `Contact` também não é resolvido aqui.
- **Coleção `Pages` genérica com blocks.** Ver decisão 1.
- **Upload de anexos** no formulário.
- **Migrar o footer** para os helpers partilhados que esta mudança cria (ver decisão 7).
- **Criar as entradas de `Services`** que faltam para os chips — é preenchimento de CMS, do utilizador.

## Decisions

### 1. Global `GetQuotePage`, não coleção `Pages` com blocks

A `HomePage` já é uma global ([`collections/pages/HomePage.ts`](../../../src/collections/pages/HomePage.ts)); seguir o padrão custa um ficheiro e um registo.

*Alternativa considerada:* introduzir agora uma coleção `Pages` com blocks, já que esta é a segunda página. Rejeitada porque o layout do design não é composição de blocos — é uma página desenhada, com um formulário no meio. Blocks genéricos lutariam com ele, e a migração da home entraria no escopo. Quando existirem quatro ou cinco páginas parecidas, a coleção passa a valer; trocar então é migração de dados de um global para um documento, barata.

Slug `get-quote-page`, `admin.group: "Site Settings"` (junto da `HomePage` e do `Menu`), `access.read: () => true` como todas as outras.

### 2. Os chips são `relationship → services`

Decisão do utilizador. Os interesses selecionáveis passam a ser os serviços reais, com `Services` como fonte única de verdade.

*Alternativa considerada:* um array `interests: [{ label, value }]` na própria global, com rótulos livres. Rejeitada pelo utilizador em favor da fonte única.

O custo desta escolha é operacional e não é evitável em código: os sete chips do design incluem "API & Integrations" e "AI Solutions", que provavelmente não existem hoje em `Services`. Enquanto não existirem como entradas de serviço, não aparecem como chips. A página tem de tratar "nenhum serviço ligado" como estado normal, não como erro.

O rótulo do chip vem de `Service.title` (que é `localized`); a identidade estável para persistência é `Service.slug`, não o título — um título reescrito no CMS não pode invalidar submissões antigas.

### 3. Uma Server Action, não um route handler

O formulário submete para uma Server Action em `get-quote/actions.ts`, que valida com `zod` e chama `payload.create`.

*Alternativa considerada:* um route handler em `/api`. Rejeitada porque `(payload)/api` é território gerado pelo Payload — o CLAUDE.md pede para não editar à mão — e porque a Server Action dispensa serializar um contrato HTTP à parte.

A action reusa `getPayloadInstance()` de [`src/service/index.ts`](../../../src/service/index.ts), o `getPayload` memoizado, em vez de chamar `getPayload` direto.

### 4. Validação em duas camadas, com o mesmo schema zod

O schema zod vive num módulo partilhado e é importado pela action (autoridade) e pelo componente de cliente (feedback imediato). O cliente nunca é a autoridade: a action revalida tudo, porque o cliente é contornável.

As **mensagens** de validação não vêm do zod — vêm da global, por locale, e são associadas ao código de erro do zod. Sem isto, uma página em português mostra "Invalid email" (ver restrição 1).

### 5. `QuoteRequests`: `create` público, leitura fechada

```
access: {
  create: () => true,        // o visitante submete anónimo
  read:   ({ req }) => Boolean(req.user),
  update: ({ req }) => Boolean(req.user),
  delete: ({ req }) => Boolean(req.user),
}
```

`create` público é inerente a um formulário anónimo. O que **não** pode acontecer é `read` público: a coleção guarda nome, e-mail e a descrição do projeto de terceiros, e as outras coleções deste repo usam `read: () => true` por serem conteúdo de marketing. Copiar esse padrão aqui expõe leads no `/api/quote-requests`. É a decisão de segurança desta mudança.

O campo de serviços na submissão é `relationship → services` (`hasMany`), mais o `slug` textual de cada um copiado no momento da submissão — a relação para navegar no admin, o slug para sobreviver a um serviço apagado.

`admin.defaultColumns` mostra nome, e-mail e data; `admin.group: "Submissions"`, separado de "Content".

### 6. Spam: honeypot + limites de tamanho, sem serviço externo

Um endpoint `create` público sem qualquer guarda é convite a lixo. Três medidas de custo zero:
- campo honeypot escondido no formulário — preenchido ⇒ a action devolve sucesso e **não** grava;
- limites de comprimento no zod (nome, e-mail, mensagem) e um teto no número de serviços;
- `hidden`/`readOnly` nos metadados para não serem forjáveis pelo cliente.

*Alternativa considerada:* CAPTCHA (Turnstile/hCaptcha). Rejeitada por agora — dependência, chaves de ambiente e um script de terceiros no bundle, para um volume de spam que ainda não se observou. Se aparecer, é mudança própria.

Rate-limiting real não é feito aqui: o app corre num container único ([Dockerfile](../../../Dockerfile), `output: "standalone"`) mas sem store partilhado para contadores, e um contador em memória perde-se a cada deploy. Assumido como risco (ver Riscos).

### 7. `textOr` sai para um módulo partilhado novo, o footer não é tocado

A página precisa da mesma semântica de "vazio" do footer. O helper vive hoje dentro de [`components/Footer/index.tsx`](../../../src/components/Footer/index.tsx).

Decisão: criar `src/lib/cms-text.ts` com `textOr`, usá-lo no `GetQuote`, e **deixar o footer como está**. Extrair do footer agora colidiria com `finish-footer-implementation`, que está em curso (68/78 tarefas). A duplicação temporária é o preço de não criar conflito; a migração do footer é anotada como dívida.

### 8. Fronteira servidor/cliente

```
 page.tsx  (server)
   │  getQuotePagePayload(locale)   ← findGlobal depth 2, serviços populados
   ▼
 GetQuote/index.tsx  (server)
   │  headline, intro, pill, eyebrow — texto puro, nada de JS no cliente
   │
   └─▶ QuoteForm.tsx  ("use client")
          recebe: labels já resolvidas por textOr, chips [{slug,title}],
                  mensagens de validação/sucesso/erro
          detém:  seleção dos chips, estado de submissão, erros de campo
```

Só o formulário é cliente, e recebe **strings já resolvidas** — o `PopulatedGetQuotePage` inteiro não atravessa a fronteira, para não serializar campos que o cliente não usa.

Restrições de bundle aplicadas nesta fronteira, cada uma por um erro já pago neste repo:
- nenhum import de `@/i18n/navigation` no formulário (+33,6 KB de runtime ICU);
- ícones importados nominalmente, nunca `import * as` com indexação dinâmica (12,7 MB);
- o `Button` existente é reusado para o "Send enquiry" em vez de um botão novo.

### 9. SEO por `generateMetadata`

O `layout.tsx` exporta uma `metadata` estática (`title: "Paradis"`). A página exporta `generateMetadata` lendo o grupo `seo` da global, com o título estático do layout como piso. Segue a forma do grupo `seo` da `HomePage`, para o admin ser reconhecível.

### 10. Todos os campos visíveis `localized: true`

As coleções atuais são inconsistentes (`Footer.tagline` é localizado, `HomePage.projects.title` não é). Aqui é uniforme: tudo o que aparece no ecrã é localizado, incluindo as mensagens de erro. `href`s, `slug` e o e-mail destinatário não são.

## Risks / Trade-offs

**[Sem rate-limiting, `create` é público]** → Honeypot e limites de tamanho apanham lixo automatizado trivial, não um ataque dirigido. Mitigação disponível se acontecer: a coleção é a única escrita pública e pode ser desligada por uma flag `formEnabled` na global sem deploy de código. A flag entra nesta mudança precisamente para ser essa válvula.

**[Fuga de leads por `read` público]** → Risco de repetição, não de estreia: sete das oito coleções/globals deste repo usam `read: () => true`, e copiar o padrão por hábito exporia as submissões em `/api/quote-requests`. Mitigação: o access control da decisão 5 é requisito de spec com cenário próprio, verificável por um GET anónimo ao endpoint.

**[Chips vazios em produção no primeiro render]** → Consequência direta da decisão 2 e o cenário mais provável no dia do deploy, já que "API & Integrations" e "AI Solutions" não existem em `Services`. Mitigação: a secção de interesses desaparece inteira (rótulo incluído) quando não há serviços ligados, em vez de deixar um cabeçalho a apontar para o nada; e o formulário continua submissível sem nenhum interesse.

**[Schema Postgres em produção]** → A global e a coleção criam tabelas novas, incluindo `_locales` e tabelas de junção. Em dev o push é automático; em produção o schema tem de ser aplicado **antes** de a página ir ao ar, senão o primeiro `findGlobal` falha e a rota rebenta em 500. Mitigação: ordenar o deploy — schema primeiro, depois preencher o CMS, depois publicar a URL no botão do navbar (que hoje pode continuar a apontar para outro destino).

**[A fixture envelhece em silêncio]** → O mesmo risco que a fixture do footer documenta: campos novos na global não quebram o build da fixture, que passa a exercitar uma página desatualizada sem avisar. Mitigação: nenhuma automática. Um comentário no topo da fixture aponta para os cenários de spec que ela cobre, para quem mexer no schema os reconferir.

**[Duplicação de `textOr`]** → Duas cópias da mesma semântica de vazio até o footer migrar (decisão 7). Trade-off aceite conscientemente contra conflito com uma mudança em curso; anotado como dívida nas tarefas.
