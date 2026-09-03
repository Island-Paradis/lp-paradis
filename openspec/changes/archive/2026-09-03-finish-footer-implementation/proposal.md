## Why

O footer do mockup **já está 80% implementado** — e a parte que falta não é código novo, é código que deixou de ser escrito. O `Footer` global em `src/collections/globals/Footer.ts` foi authorado contra este mockup exato: tem `cta.heading`, `cta.primaryButton`, `cta.outlineButton`, `copyrightText` e `links[].isExternal`. O componente em `src/components/Footer/index.tsx` **ignora todos eles** e hardcoda os valores em JSX.

Isso não é dívida cosmética. Duas consequências já estão em produção:

1. **`/pt` está quebrado no footer.** Quatro strings visíveis são literais em inglês no JSX — `"Ready to build?"`, `"Get Quote - For Free"`, `"Schedule a Call"` e `"© {ano} Paradis.Labs - All rights reserved."`. Os campos correspondentes no CMS são todos `localized: true`. O editor pode traduzir; a tradução não chega na página. `tagline` e `linkGroups` traduzem, o que torna o resultado pior que uniformemente inglês: é um footer meio traduzido.
2. **Os dois CTAs não navegam.** `Footer/index.tsx:57-62` renderiza `<Button variant="inverted">` sem `href` e sem handler. `Button` sem `asChild` monta um `<button>`. Os dois elementos mais importantes do footer são inertes — não são links, não aparecem para um leitor de tela como destino, não abrem em nova aba, não fazem nada. Os campos `href` dos dois botões são `required: true` no schema e não são lidos em lugar nenhum.

Somando: o schema está mais completo que o render. O trabalho é fechar essa distância, não abrir uma nova.

Fora dessa distância sobra **um** item genuinamente novo: os ícones sociais no canto inferior direito (Dribbble, LinkedIn, Instagram) não existem no `Footer` global de forma alguma.

## What Changes

**Camada 1 — campos que existem e não são lidos (zero mudança de schema)**

- ① `cta.heading`, `cta.primaryButton.label` e `cta.outlineButton.label` passam a vir do global, com os literais atuais virando *fallback* e não valor. Fecha o rombo de localização em `/pt`.
- ② `copyrightText` passa a vir do global. O ano continua computado em runtime (`new Date().getFullYear()`) e é concatenado ao texto authorado — o mockup mostra `© 2026 Paradis.Labs - All rights reserved.`, e o default do campo é exatamente a metade que não é o ano.
- ③ Os dois botões do CTA passam a ser links reais, via `Button asChild` + `Link`, apontando para `cta.primaryButton.href` e `cta.outlineButton.href`. Sem rota hardcoded: o destino é decisão de quem edita, que é o motivo dos campos serem `required`.
- ④ `links[].isExternal` passa a governar o comportamento de cada link, hoje uniforme e errado. Ver camada 3.

**Camada 2 — o único campo novo**

- ⑤ `socialLinks` entra no `Footer` global como `array` de `{ platform, url, label }`, espelhando a forma já estabelecida em `src/collections/Contact.ts:50` e acrescentando `dribbble` às opções de `platform` (o mockup pede Dribbble; a lista do `Contact` não o tem). Renderiza como ícones na barra inferior, alinhados à direita, na mesma linha do copyright.
- O campo mora no `Footer` global, **não** é lido do `Contact`. A alternativa de reusar `Contact.socialLinks` foi considerada e recusada: acoplaria o footer — que aparece em toda rota, via `layout.tsx` — a uma seção que o `HomePage` global pode marcar `enabled: false`, e a um documento que pode estar vazio.

**Camada 3 — o que a leitura revelou**

- ⑥ `Footer/index.tsx:40` aplica `target="_blank" rel="noopener noreferrer"` a **todo** link de `linkGroups`, incluindo os internos. No mockup, `Home`, `Products`, `Services`, `About`, `Members` e `Contacts` são navegação interna; `Kitenda` e `DP Angola` são externos e o mockup os marca com uma seta `↗`. O flag `isExternal` existe para exatamente essa distinção. Passa a ser: externo ganha `target`/`rel` e o afixo `↗`; interno usa o `Link` locale-aware de `@/i18n/navigation` e não ganha nenhum dos dois.
- ⑦ Os links internos hoje usam `next/link` puro, não o `Link` de `src/i18n/navigation.ts`. Num site cujas rotas são todas prefixadas por locale, um `href="/products"` vindo do CMS aterra fora do locale corrente.

**Fora de escopo**

Não há mudança de layout, grid, espaçamento, cor ou tipografia. O `sm:grid-cols-8` / `col-span-2` atual já produz o arranjo do mockup, e a linha inferior já é uma barra com borda superior `border-white/20`. Esta change não redesenha o footer — ela liga o que está desligado. Redesenho, se for preciso, é outra change com outro instrumento.

## Capabilities

### New Capabilities

- `footer-content-authority`: de onde vem cada coisa visível no footer. Nenhuma string, rótulo ou destino apresentado ao usuário nasce no JSX quando existe campo authorável para ele; todo campo `localized: true` do global chega na página no locale corrente; e um campo vazio degrada para um fallback declarado em vez de renderizar buraco. Cobre as camadas 1 e 2.
- `footer-link-semantics`: como cada link do footer se comporta como navegação. Um destino é um elemento de âncora e não um `<button>`; externo e interno se distinguem por `target`, `rel` e afordância visual, governados por um único flag authorável; rota interna respeita o prefixo de locale; e um link cujo conteúdo é só um ícone carrega nome acessível. Cobre as camadas 1 ③④ e 3.

A divisa entre as duas é deliberada e vale para os ícones sociais, que aparecem nas duas: **`footer-content-authority` é dona de "o que aparece"; `footer-link-semantics` é dona de "para onde vai e como"**. A URL e a plataforma de um ícone social são a primeira; o `<a>`, o `rel` e o nome acessível são a segunda.

Ambas herdam a restrição de `client-bundle-budget` (definida em `optimize-landing-performance`, requirement *"Bibliotecas de ícones não entram no bundle por barril"*). Ela é vinculante e específica aqui: um mapa `platform → ícone` é a forma canônica de acidentalmente reter um namespace inteiro de ícones, e é o erro que o comentário em `Button/index.tsx:44-49` documenta ter custado **12,7 MB, 93% dos bytes de cliente da rota**. Os três ícones do mockup existem em `lucide-react` como módulos próprios (`dribbble`, `linkedin`, `instagram`), então honrar a restrição não custa nada — mas exige que o mapa seja de imports nomeados, não de resolução dinâmica sobre um `import *`.

Uma segunda restrição de fechamento: o `Footer` é hoje um Server Component e **permanece** um. Nada nesta change pode exigir `"use client"` no footer. Os ícones são estáticos e o `Button` já é client por conta própria; a barra inferior não precisa de interatividade.

### Modified Capabilities

Nenhuma. `homepage-shape-interlock` é a única capability já sincronizada em `openspec/specs/`, e esta change não toca nenhum dos shapes da home. `client-bundle-budget` é herdada como restrição, não alterada — nenhum dos seus requirements muda de conteúdo.

## Impact

**Código**

- `src/collections/globals/Footer.ts` — acrescenta `socialLinks` (⑤). Único arquivo de schema tocado.
- `payload-types.ts` — regenerado por `npx payload generate:types` após ⑤. Não editado à mão.
- `src/components/Footer/index.tsx` — o coração da change. Passa a ler `cta`, `copyrightText`, `isExternal` e `socialLinks`; troca os dois `<Button>` por `Button asChild` + `Link`; separa link interno de externo.
- `src/service/types.ts` — `PopulatedFooter` já faz `Omit<Footer, "logo">` e só reescreve `logo`. `socialLinks` não é relacionamento, então o tipo gerado passa direto e o `Populated*` provavelmente não muda. A verificar na implementação, não a assumir.

**Dados / CMS**

Requer conteúdo authorado no admin para os campos que hoje são hardcoded. É a única parte da change com risco de regressão visível: assim que ① e ② passam a ler o global, um campo vazio no banco troca o literal em inglês por um fallback — e é por isso que o fallback é requisito, e não um `??` acidental. A barra inferior e o CTA não podem regredir para vazio em nenhum locale.

Também requer authorar `isExternal` nos links de `Kitenda` e `DP Angola`, que hoje não têm o flag marcado e cujo comportamento externo vem, por acidente, do `target="_blank"` uniforme. **Enquanto ⑥ não for acompanhado desse authoring, os dois links deixam de abrir em nova aba.** A ordem importa: dado antes de código, ou os dois no mesmo deploy.

**Não afetado**

Sem mudança de dependências (`lucide-react` já está instalado e já é usado em três componentes). Sem migração de banco além do que o Payload faz por si para um `array` novo. Sem mudança em `NavBar`, `Header`, ou em qualquer seção da home. Sem mudança de rota, de `proxy.ts`, ou de configuração de i18n.
