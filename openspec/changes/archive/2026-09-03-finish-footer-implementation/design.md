## Context

O footer existe, renderiza em toda rota via `src/app/(app)/[locale]/layout.tsx:77`, e produz visualmente quase todo o mockup. O `Footer` global em `src/collections/globals/Footer.ts` foi authorado contra esse mesmo mockup e tem campos que o componente não lê.

O estado atual, campo por campo:

```
  ELEMENTO DO MOCKUP          CAMPO NO GLOBAL         COMPONENTE LÊ?
  ─────────────────────────────────────────────────────────────────────
  Logo                        logo                    ✅  sim
  "Because we were born…"     tagline                 ✅  sim
  3 colunas de links          linkGroups              ✅  sim
  ↗ em Kitenda / DP Angola    links[].isExternal      ❌  ignorado
  "Ready to build?"           cta.heading             ❌  hardcoded
  "Get Quote - For Free"      cta.primaryButton       ❌  hardcoded, sem href
  "Schedule a Call"           cta.outlineButton       ❌  hardcoded, sem href
  "© 2026 Paradis.Labs…"      copyrightText           ❌  hardcoded
  ⚂ ⓛ ⓘ  ícones sociais      —                       ❌  campo não existe
```

Três categorias de trabalho saem dessa tabela, e elas têm custos muito diferentes:

```
┌────────────────────────────────────────────────────────────┐
│  1. FIAÇÃO  (cta, copyright, isExternal)                   │
│     Campo existe. Componente não lê. Zero schema.          │
│     Sem regen de tipos. Sem migração.                      │
├────────────────────────────────────────────────────────────┤
│  2. CAMPO NOVO  (socialLinks no global footer)             │
│     Schema + `npx payload generate:types`.                 │
│     Precedente de forma: Contact.ts:50                     │
├────────────────────────────────────────────────────────────┤
│  3. DEFEITOS ACHADOS NA LEITURA                            │
│     - CTAs são <button>, não navegam                       │
│     - strings EN hardcoded quebram /pt                     │
│     - target="_blank" em todo link, inclusive interno      │
│     - next/link puro ignora prefixo de locale              │
└────────────────────────────────────────────────────────────┘
```

**Restrições vigentes**

- `Footer` é Server Component. `Button` é `"use client"` por conta própria, e é usado a partir do footer sem contaminar o footer. Isso SHALL continuar.
- `client-bundle-budget` (em `optimize-landing-performance`, ainda não sincronizada para `openspec/specs/`) proíbe entrada de biblioteca de ícones por barril. O comentário em `Button/index.tsx:44-49` registra a medição que originou a regra: 12,7 MB, 93% dos bytes de cliente da rota, por um `Icons[nome]` sobre `import * as`.
- Todas as rotas públicas são prefixadas por locale. `src/i18n/navigation.ts` exporta o `Link` que respeita isso; o footer hoje usa `next/link` puro.
- Biome, 2 espaços, organização de imports. `npm run lint` antes de commitar.

## Goals / Non-Goals

**Goals:**

- Fechar a distância entre o schema e o render: todo campo authorado chega na página, no locale corrente.
- Tornar os dois CTAs destinos de navegação reais, sem alterar sua aparência.
- Fazer `isExternal` governar de fato o comportamento externo/interno de cada link, incluindo a seta `↗`.
- Acrescentar `socialLinks` ao global e renderizar os três ícones da barra inferior.
- Não regredir: nem visualmente, nem em custo de cliente, nem para um banco com campos vazios.

**Non-Goals:**

- **Redesenho.** Nenhuma mudança de grid, espaçamento, cor, tipografia ou breakpoint. O `sm:grid-cols-8` / `col-span-2` atual já produz o arranjo do mockup e a barra inferior já tem a borda `border-white/20`. Esta change liga o que está desligado.
- **Refatorar `Contact.socialLinks`.** A opção de extrair um field config compartilhado entre `Contact` e `Footer` foi considerada e ficou fora: obriga a tocar o schema de uma collection já authorada, com conteúdo em produção, para um ganho de DRY que duas listas de nove opções não justificam hoje. Se um terceiro consumidor aparecer, aí é a hora.
- **Novo componente de ícone social genérico.** O mockup pede três ícones num lugar. Um componente reusável para isso é abstração antes da segunda ocorrência.
- **Formulário de quote ou integração de agendamento.** Os CTAs apontam para onde o CMS disser. O que existe no destino é outra change.
- **Traduzir conteúdo.** Authorar os valores em `pt` é trabalho de conteúdo no admin, não de código. Esta change garante que a tradução *chegue*; não a escreve.

## Decisions

### D1 — `socialLinks` mora no global `footer`, não é lido do `Contact`

`src/collections/Contact.ts:50` já tem um `socialLinks` com a forma `{ platform, url, label }`. Reusá-lo por leitura seria zero schema novo.

Recusado. O footer é renderizado em `layout.tsx`, ou seja, em **toda** rota. O `Contact` é uma collection referenciada pelo global `homepage` numa seção que tem flag `enabled` e pode ser desligada, e o documento pode estar vazio ou ausente. Acoplar um elemento onipresente a um conteúdo opcional troca um campo novo por uma dependência frágil, mais uma busca extra no `layout`. A lista do `Contact` também não tem `dribbble`, que o mockup pede — então "reusar" já exigiria editar aquele schema.

Duplica-se a *forma* do campo, não o dado. Custo: uma definição de array de três campos. É o preço certo.

### D2 — `platform → ícone` é um mapa de imports nomeados

Os três ícones do mockup existem em `lucide-react` como módulos próprios: `dribbble`, `linkedin`, `instagram` (verificado em `node_modules/lucide-react/dist/esm/icons/`). `lucide-react` já é dependência e já é usado em três componentes.

A forma **proibida** é a que `client-bundle-budget` veta e que `Button/index.tsx` documenta ter custado 12,7 MB:

```ts
import * as Icons from "lucide-react";
const Icon = Icons[platform];        // ❌ bundler não prova o que é usado
```

A forma adotada é um registro estático, indexado por chave mas com os valores resolvidos em tempo de build:

```ts
import { Dribbble, Instagram, Linkedin } from "lucide-react";
const ICONS = { dribbble: Dribbble, instagram: Instagram, linkedin: Linkedin };
const Icon = ICONS[platform];        // ✅ três módulos, tree-shakeable
```

A diferença é que o conjunto de ícones possíveis é fechado em código. Uma plataforma authorada sem ícone no mapa cai no tratamento de reserva de D3 — que é por isso que D3 existe.

`@solar-icons/react` é o set dominante do projeto, mas é um set de ícones de interface, não de marcas. Os três aqui são marcas. `lucide-react` é a escolha por disponibilidade, não por preferência estilística.

### D3 — Plataforma sem ícone mapeado degrada para destino textual

`platform` é um `select` com nove opções no `Contact`, e o campo no `Footer` terá dez com `dribbble`. Mapear todas as dez de saída seria trabalho para conteúdo que não existe.

Decisão: mapear as três do mockup. Uma entrada authorada com `platform` fora do mapa continua sendo renderizada como âncora navegável, com o `label` como conteúdo visível em vez do ícone. Isso mantém o requisito de que nenhuma entrada authorada seja omitida, sem exigir dez ícones adiantados, e evita o modo de falha pior: um editor adiciona YouTube e o link simplesmente não aparece, sem erro e sem pista.

Alternativa considerada — restringir as opções do `select` às três com ícone. Recusada: engessa o CMS por uma limitação de render, e a próxima plataforma passaria a exigir mudança de schema e regen de tipos em vez de só um import.

### D4 — Os CTAs viram âncora via `Button asChild`, não via `onClick`

`Button` já tem `asChild` (`Slot.Root` do radix-ui), usado para delegar o elemento renderizado. O CTA passa a ser:

```
Button (variant, className)  ──asChild──▶  Link (href do CMS)
```

Um `onClick` com `router.push` foi descartado: não produz âncora, não expõe destino a tecnologia assistiva, não permite abrir em nova aba nem copiar endereço, e exigiria `"use client"` mais fundo. O requisito é explicitamente "é uma âncora", não "reage a clique".

Atenção a uma interação com o código existente: `Button/index.tsx:76` define `const swap = textSwap && !asChild`, e o caminho `asChild` encaminha `children` intacto, sem o wrapper de ícone. Os CTAs do footer não usam `textSwap` nem `trailingIcon` hoje, então a troca é neutra — mas isso é uma propriedade do estado atual a verificar, não a presumir.

O destino vem do CMS. Se o `href` authorado for interno, ele passa pelo `Link` locale-aware; se for absoluto, não. Mesma bifurcação de D5.

### D5 — Interno e externo são dois caminhos de render, decididos por `isExternal`

Hoje há um caminho só, e ele está errado para a maioria dos links:

```
  ATUAL                          ALVO
  ─────                          ────
  todo link                      isExternal?
    │                              │
    ├─ next/link                   ├─ true ──▶ <a> nativo
    ├─ target="_blank"    ❌       │            target="_blank"
    └─ rel="noopener…"    ❌       │            rel="noopener noreferrer"
                                   │            + seta ↗ (aria-hidden)
                                   │
                                   └─ false ─▶ Link de @/i18n/navigation
                                                sem target, sem rel
                                                sem seta
```

Duas correções distintas caem juntas neste ponto, e vale nomeá-las separadamente porque poderiam ser confundidas com uma:

1. **`target`/`rel`/seta** passam a ser condicionais em `isExternal` (hoje: incondicionais os dois primeiros, ausente o terceiro).
2. **O componente de link** passa a ser escolhido pelo mesmo flag: `Link` locale-aware para interno, âncora nativa para externo. Um `href` absoluto não deve passar pelo roteador de locale.

A seta é `aria-hidden`. O nome acessível do link é o `name` authorado, sem sufixo — está no spec de `footer-link-semantics` como requisito próprio porque é fácil de errar acrescentando o glifo dentro do texto do link.

### D6 — O ano do copyright continua em runtime; só o texto vem do CMS

`copyrightText` tem default `"Paradis.Labs - All rights reserved."` — exatamente a porção do mockup que não é o ano. Essa divisão já estava projetada no schema.

```
  "©"  +  new Date().getFullYear()  +  copyrightText
   │              │                          │
  fixo        runtime                    authorado, localizado
```

Authorar o ano no CMS criaria uma edição obrigatória por ano e um jeito silencioso de o site ficar desatualizado. O ano fica em código; o texto fica no CMS.

### D7 — Fallback é declarado, não incidental

O componente hoje já usa `??` em dois lugares (`args.logo?.url ?? "/logo-white.svg"`, `args.tagline ?? "…"`), e é o padrão certo — mas ele precisa passar a ser **deliberado e completo**, porque a change inverte o risco.

Hoje o texto do CTA está garantido: está no JSX. No instante em que a leitura do global substitui o literal, um banco sem o campo preenchido troca texto visível por vazio. Um botão sem rótulo é uma regressão pior que um botão em inglês numa página em português.

Por isso: os literais atuais tornam-se os valores de fallback. Nada é perdido no pior caso, e o caminho felizmente authorado passa a funcionar. Vale também para string vazia, não só `null` — o Payload salva `""` para um campo de texto limpo no admin, e `"" ?? x` devolve `""`.

### D9 — O prefixo de locale é montado à mão, não pelo `@/i18n/navigation`

**Decisão tomada durante a implementação, contra o que D5 previa.** D5 dizia "interno relativo passa pelo `Link` de `src/i18n/navigation.ts`". Medido, isso custa **+33.690 bytes** de JS de cliente — 3.589.441 → 3.623.131, builds limpos nas duas pontas, determinístico ao byte.

A atribuição levou três tentativas, e as duas primeiras hipóteses estavam erradas:

| Hipótese | Teste | Resultado |
|---|---|---|
| O `Link` do next-intl é Client Component | Trocar por `getPathname` + `next/link` | **Errada** — exatamente os mesmos 3.623.131 bytes |
| Ícones do lucide vazam para o cliente | Procurar as assinaturas de path no bundle | **Errada** — `M19.13 5.09` e `M7 7h10v10` ausentes |
| O campo novo arrasta UI do admin | Reverter só o schema, manter o componente | **221 bytes** dos 33.690 |

O custo real apareceu no diff de chunk. Os nomes são hasheados por conteúdo, então a comparação foi por conjunto de tamanhos: **um chunk foi de 34.259 para 67.909 bytes**. Ele contém o Lenis (`animatedScroll`, `targetScroll`, `emitter`) e passou a conter `clonePosition`, `bumpSpace`, `numeric` — o parser ICU do `@formatjs`, isto é, o runtime de cliente do next-intl.

A causa é **importar qualquer coisa de `@/i18n/navigation`**. `Link` e `getPathname` saem do mesmo módulo, que chama `createNavigation(routing)`; é o que explica os dois números idênticos.

Decisão: o footer não importa next-intl. O prefixo é uma linha —

```ts
href === "/" ? `/${locale}` : `/${locale}${href}`
```

— e o `locale` vem por prop do layout, que já o resolveu para buscar este mesmo global. Resultado: **3.589.441 bytes, idêntico ao baseline**. Zero crescimento, contra o "compatível com três SVGs" que o requisito de fechamento admitia.

O preço é acoplamento: a linha replica o `localePrefix: "always"` que é o default do next-intl e que `routing.ts` não sobrescreve. Se `routing.ts` passar a definir `localePrefix`, esta função precisa acompanhar, e nada força isso. Está documentado no código, onde quem editar `routing.ts` tem chance de ver.

Alternativa considerada e recusada: aceitar os 33,6 KB em nome de usar a API idiomática. Num repositório que mantém uma capability de orçamento de bundle e um incidente de 12,7 MB documentado em comentário, 33,6 KB de parser de mensagens ICU para prefixar oito links de footer não passa.

### D8 — `PopulatedFooter` provavelmente não muda; verificar

`src/service/types.ts:48` faz `Omit<Footer, "logo">` e reescreve só `logo`, porque `logo` é o único relacionamento do global. `socialLinks` é um array de campos escalares — sem `relationTo`, sem `upload` — então o tipo gerado passa direto pelo `Omit` e o `Populated*` não precisa de nada.

Registrado como decisão porque a tentação é acrescentar `socialLinks` ao `PopulatedFooter` por simetria com os outros campos, o que só adicionaria uma segunda fonte de verdade para o mesmo tipo. A verificar contra o `payload-types.ts` regenerado, não a assumir.

## Risks / Trade-offs

**[Dado precisa preceder ou acompanhar o código]** → ~~O risco central da change.~~ **Retirado pela leitura da linha de base.** Ver `baseline.md`.

Este risco supunha que o flag `isExternal` de `Kitenda` e `DP Angola` não estivesse marcado no banco, e que portanto o `target` condicional de ⑥ os faria abrir na mesma aba até alguém authorar. A leitura somente-leitura do Postgres mostrou o contrário: **os dois externos já são `true` e os seis internos já são `false`**. A task 3.1 já está satisfeita em dado, e ⑥ não tem dependência de conteúdo.

Sobra do risco original apenas o caso protegido, que continua valendo:

- *CTA e copyright*: protegidos por D7. Um campo vazio cai no fallback, que é o texto atual. Sem regressão visível. `cta_heading` é de fato `null` no banco, então o caminho de fallback é exercitado desde o primeiro render — D7 não é precaução teórica.

**[Conteúdo em `pt` não existe]** → Achado da linha de base, e é o limite do que esta change entrega. Não há nenhuma linha `pt` em `footer_locales`, nem `name` em `pt` para nenhum link. Com `fallback: true` e `defaultLocale: "en"`, `/pt` recebe inglês por fallback do Payload. Depois desta change o footer em `/pt` **continua em inglês** — mas por conteúdo não traduzido, não porque o código fixa a string. → Mitigação: nenhuma no código. É trabalho de authoring, declarado como non-goal. O que a change garante é que a tradução passe a *chegar* quando existir.

**[Os `href` de CTA valem `#`]** → Achado da linha de base. Os dois CTAs viram âncoras conforme o requisito, mas apontam para `#` porque é o que está authorado. Cumprem a semântica e não levam a lugar nenhum. → Mitigação: nenhuma no código; é pendência de conteúdo. Registrado para não ser lido como defeito de implementação.

**[Um `href` interno authorado como URL absoluta ignora o locale]** → D5 escolhe o componente de link por `isExternal`, não por inspeção do `href`. Um editor que authore `https://paradis.host/products` com `isExternal` desmarcado obtém uma âncora nativa que sai do locale. → Mitigação: o `admin.description` dos campos de URL orienta a convenção (caminho relativo para interno, URL absoluta para externo). Validar formato de `href` contra o flag é tentador e fica fora: acopla o schema a uma decisão de render e falha em casos legítimos como `mailto:` e `#ancora`.

**[`Button asChild` interage com `textSwap` e `trailingIcon`]** → **O risco estava subestimado, e a mitigação que ele propunha — "não consertar `Button` nesta change" — teve de ser abandonada.** Ver D10.

`Button/index.tsx:76` desliga `swap` quando `asChild` está setado, e o caminho `asChild` encaminha `children` sem o wrapper de ícone. Os CTAs do footer não usam nenhum dos dois, então essa parte é de fato neutra. O que o risco não previu é que o caminho `asChild` **não funcionava de forma alguma**. Fica de pé apenas a limitação original: se alguém acrescentar `textSwap` a um CTA com `asChild`, ele continua sendo silenciosamente ignorado. Isso permanece não consertado, e de propósito — é a limitação documentada, não um defeito novo.

### D10 — Consertar o `asChild` do `Button` deixou de ser opcional

**Descoberto renderizando, não lendo.** Com a implementação pronta, o build limpo e os quatro arquivos passando no Biome, `GET /en` devolvia **HTTP 500**:

```
Error: Slot failed to slot onto its children.
Expected a single React element child or `Slottable`.
```

A causa está no próprio `Button`. O `Comp` recebia dois filhos:

```
<Comp>              ← Slot.Root quando asChild
  {invert && <span/>}     ← irmão nº 1: `undefined` quando asChild,
  {asChild ? children …}  ← irmão nº 2      porque swap é false
</Comp>
```

`invert` é `undefined` sempre que `asChild` está setado (`swap = textSwap && !asChild`), então o primeiro filho não renderiza nada — mas **continua contando como um segundo slot de filho**, e o Slot do radix exige exatamente um. O comentário em `Button/index.tsx:166` já declarava a intenção correta ("Slot requires a single React element child"); a implementação não a cumpria.

Isso nunca havia aparecido porque **nenhum call site usava `asChild`**. O footer é o primeiro, e a capacidade que D4 tratou como pronta (`Button` já tem `asChild`) existia na assinatura e não no comportamento.

Correção, mínima: mover o `span` de `invert` para dentro do ramo não-`asChild`, de modo que o ramo `asChild` entregue um único filho. O caminho não-`asChild` fica idêntico — um Fragment não altera o DOM — e todos os outros call sites de `Button` seguem inalterados. Medido depois: **3.589.356 bytes, 85 bytes MENOS que o baseline**.

A decisão de não tocar o componente compartilhado era certa enquanto a premissa era "`asChild` funciona e só tem uma limitação". Com a premissa falsa, as opções passaram a ser consertar `Button` ou abandonar o requisito de âncora — e o requisito não é negociável. Não tocar em código compartilhado é uma preferência; renderizar 500 não é uma opção.

Alternativa considerada e recusada: aplicar `buttonVariants` direto na âncora, sem `asChild`, evitando mexer no `Button`. Não funciona aqui — `Button/index.tsx` é `"use client"`, e todo export de um módulo cliente vira referência de cliente quando importado por um Server Component, então chamar `buttonVariants(...)` no servidor falha. Viabilizá-la exigiria extrair o `cva` para um módulo próprio: mais refatoração de código compartilhado que o conserto de três linhas, não menos.

**[Regen de tipos toca um arquivo grande e compartilhado]** → `npx payload generate:types` reescreve `payload-types.ts` inteiro, e o diff pode capturar mudanças de schema pendentes de *outras* changes em andamento (há cinco `in-progress`). → Mitigação: inspecionar o diff do regen e confirmar que ele contém só `socialLinks` no `Footer` e `FooterSelect`. Se aparecer mais, é sinal de que o arquivo estava desatualizado em relação aos schemas — o que é informação útil, mas não é desta change.

**[Ícones de marca em `lucide-react` são um conjunto legado]** → As marcas no lucide são um grupo em depreciação upstream; podem sair numa major futura. → Mitigação: nenhuma agora. Estão presentes na versão instalada, entram por três imports nomeados isolados, e o dia em que saírem o conserto é substituir três SVGs inline. Trocar por SVG inline já agora seria pagar hoje um custo que talvez nunca chegue, e perder o alinhamento com o resto do projeto.

**[A barra inferior passa a ter dois filhos e vira flex]** → Hoje é um `container` com uma única `div` de texto. Acrescentar ícones à direita exige `justify-between`, o que mexe num nó que hoje é trivial. Em telas estreitas, copyright e três ícones podem não caber na mesma linha. → Mitigação: o mockup é desktop; o comportamento estreito precisa de decisão explícita (empilhar, ou manter em linha), e está nas tasks como verificação em viewport pequeno, não como suposição.

## Migration Plan

Sem migração de banco além do que o Payload faz por si para um `array` novo — `socialLinks` é aditivo e opcional, então nenhum documento existente fica inválido.

A ordenação "conteúdo antes de código" que esta seção originalmente impunha **caiu** com a leitura da linha de base: `isExternal` já está authorado, então nenhum passo de código depende de authoring. A ordem restante é só de dependência técnica:

```
  1. Schema:  socialLinks no Footer global  +  generate:types
                          │
                          ▼
  2. Código:  ler cta / copyrightText  (protegido por fallback, D7)
              CTAs viram âncora
                          │
                          ▼
  3. Código:  target/rel/seta condicionais em isExternal
              Link locale-aware para interno
                          │           (sem dependência de conteúdo — flags já authorados)
                          ▼
  4. Render:  ícones sociais na barra inferior
                          │
                          ▼
  5. Admin:   authorar socialLinks, cta.*.href reais, e o conteúdo em pt
              (depois do código; nada no código depende disso)
```

O authoring migrou do início para o fim. Sem `socialLinks` authorado, nenhum ícone renderiza — que é o comportamento especificado para conjunto vazio, não uma falha. Sem conteúdo `pt`, o Payload serve inglês por fallback. Nenhum dos dois bloqueia o deploy do código.

**Rollback**: reverter o commit do componente restaura o comportamento atual por completo. O campo `socialLinks` pode ficar no schema sem consequência — sem nada authorado, nada renderiza, conforme o requisito de conjunto vazio. Não há passo de rollback de dados.

## Open Questions

1. **Para onde apontam os dois CTAs?** Resolvido em decisão de escopo: para o que o CMS disser. **A linha de base mostrou que os dois valem `#` hoje** — os CTAs cumprem a semântica de âncora e não levam a lugar nenhum. Pendência de conteúdo (task 3.6), não de código.
2. ~~**A barra inferior empilha em telas estreitas?**~~ **Resolvido na implementação: empilha.** `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`. Copyright mais três ícones não cabem em ~390px, e o mockup só define o desktop. Não verificado em viewport real — a verificação desta change foi código + build.
3. **A ordem dos ícones sociais é a de authoring?** Mantido: sim, é o comportamento natural de um `array` do Payload e o que o spec registra.
4. **`socialLinks[].label` é só nome acessível?** Mantido: sim, ícone sempre. O tratamento de reserva de D3 é a única situação em que o rótulo aparece na tela.
5. **Novo — como a tabela de `socialLinks` chega ao banco?** O adaptador Postgres do Payload está sem `push: false` e o projeto não tem diretório de migrations. Fora de produção o adaptador faz push automático, o que significa que **rodar `npm run dev` com o `DATABASE_URL` atual criaria as tabelas novas direto no Postgres remoto**. Por isso o dev server não foi executado nesta sessão. Antes do deploy, alguém precisa decidir entre gerar uma migration ou deixar o push acontecer num ambiente onde isso seja aceitável. Não verificado empiricamente — verificar exigiria justamente a escrita que foi evitada.
