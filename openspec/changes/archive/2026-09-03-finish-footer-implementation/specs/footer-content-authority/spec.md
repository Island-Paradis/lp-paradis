## ADDED Requirements

### Requirement: Todo conteúdo visível do footer vem do global

Cada string, rótulo, destino e asset apresentado ao usuário no footer SHALL ser lido do global `footer` quando existir campo authorável correspondente. Nenhum desses valores SHALL nascer como literal em JSX.

Os campos hoje authorados e não lidos são `cta.heading`, `cta.primaryButton.label`, `cta.primaryButton.href`, `cta.outlineButton.label`, `cta.outlineButton.href`, `copyrightText` e `linkGroups[].links[].isExternal`. Todos SHALL passar a ser lidos.

O critério é verificável por leitura: em `src/components/Footer/index.tsx` não SHALL restar nenhum texto voltado ao usuário fora de uma expressão que leia o global ou o seu fallback declarado.

#### Scenario: Rótulo do CTA authorado no admin aparece na página

- **WHEN** um editor define `cta.primaryButton.label` como um valor diferente do default e a página é renderizada
- **THEN** o botão primário do footer exibe o valor authorado, e não `"Get Quote - For Free"`

#### Scenario: Heading do CTA authorado no admin aparece na página

- **WHEN** um editor define `cta.heading` e a página é renderizada
- **THEN** o texto acima dos dois botões é o valor authorado, e não `"Ready to build?"`

#### Scenario: Copyright authorado no admin aparece na barra inferior

- **WHEN** um editor define `copyrightText` e a página é renderizada
- **THEN** a barra inferior exibe o valor authorado, e não `"Paradis.Labs - All rights reserved."` fixo em código

#### Scenario: Nenhum literal voltado ao usuário sobra no componente

- **WHEN** `src/components/Footer/index.tsx` é inspecionado após a implementação
- **THEN** todo texto que chega à tela é uma leitura do global ou o fallback declarado dessa leitura, e nenhuma string de interface está escrita diretamente no JSX

### Requirement: Campo localizado chega na página no locale corrente

Todo campo do global marcado `localized: true` SHALL ser renderizado no locale da rota. O footer é montado em `src/app/(app)/[locale]/layout.tsx`, que já resolve o `locale` do segmento de rota e o repassa a `getFooterPayload(locale)`; o componente SHALL consumir esse resultado sem reintroduzir valor fixo por cima dele.

Isso corrige o estado atual, em que `tagline` e `linkGroups` traduzem mas `cta.heading`, os dois rótulos de botão e `copyrightText` não — produzindo um footer parcialmente traduzido em `/pt`.

#### Scenario: Footer em português exibe os quatro campos traduzidos

- **WHEN** os campos `cta.heading`, `cta.primaryButton.label`, `cta.outlineButton.label` e `copyrightText` têm valor no locale `pt` e a rota `/pt` é renderizada
- **THEN** os quatro exibem o texto em português

#### Scenario: Footer em inglês e em português diferem

- **WHEN** os quatro campos têm valores distintos em `en` e em `pt`, e as rotas `/en` e `/pt` são renderizadas
- **THEN** cada rota exibe os valores do seu próprio locale, e nenhum dos quatro é idêntico entre as duas por estar fixo em código

#### Scenario: Nenhum campo do footer fica preso em inglês

- **WHEN** a rota `/pt` é renderizada com todos os campos localizados authorados em português
- **THEN** nenhum texto do footer aparece em inglês

### Requirement: Campo vazio degrada para fallback declarado

Para todo campo lido do global, o componente SHALL declarar um valor de fallback usado quando o campo estiver ausente, nulo ou string vazia. O footer SHALL NOT renderizar elemento vazio, rótulo em branco ou botão sem texto por conta de dado não authorado.

Este requisito existe porque a mudança tem risco de regressão na direção oposta à do defeito: no momento em que a leitura do global substitui o literal, um banco sem o campo preenchido troca texto visível por buraco. O fallback SHALL ser explícito e intencional, não um efeito colateral.

#### Scenario: CTA sem heading authorado

- **WHEN** `cta.heading` está vazio ou ausente e a página é renderizada
- **THEN** o bloco do CTA exibe o fallback declarado e não um espaço em branco no lugar do título

#### Scenario: Copyright sem texto authorado

- **WHEN** `copyrightText` está vazio ou ausente e a página é renderizada
- **THEN** a barra inferior exibe o fallback declarado, mantendo o ano, e não fica reduzida a um símbolo de copyright solto

#### Scenario: Botão sem rótulo authorado

- **WHEN** `cta.primaryButton.label` está vazio ou ausente e a página é renderizada
- **THEN** o botão exibe o fallback declarado e permanece um destino rotulado, nunca uma pílula sem texto

#### Scenario: Global inteiro sem conteúdo

- **WHEN** o global `footer` não tem nenhum campo authorado e a página é renderizada
- **THEN** o footer renderiza sem lançar erro, exibindo os fallbacks declarados de cada campo, e o layout da página permanece íntegro

### Requirement: O ano do copyright é composto em runtime

A barra inferior SHALL exibir o ano corrente obtido em tempo de execução, composto com o texto authorado em `copyrightText`. O ano SHALL NOT ser parte do valor authorado, e `copyrightText` SHALL NOT precisar ser editado na virada do ano.

O default do campo — `"Paradis.Labs - All rights reserved."` — é exatamente a porção do mockup que não é o ano, o que confirma essa divisão de responsabilidade.

#### Scenario: Ano corrente é renderizado sem authoring

- **WHEN** `copyrightText` vale `"Paradis.Labs - All rights reserved."` e a página é renderizada
- **THEN** a barra inferior exibe o símbolo de copyright, o ano corrente e o texto authorado, na ordem do mockup

#### Scenario: Virada do ano não exige edição de conteúdo

- **WHEN** o ano do sistema avança e nenhum campo do CMS é alterado
- **THEN** o ano exibido acompanha a virada

### Requirement: Links sociais são conteúdo authorável do footer

O global `footer` SHALL expor um campo `socialLinks` do tipo `array`, cada entrada com `platform` (select, obrigatório), `url` (text, obrigatório) e `label` (text, obrigatório, `localized: true`). O campo SHALL espelhar a forma já estabelecida em `src/collections/Contact.ts` e SHALL incluir `dribbble` entre as opções de `platform`, ausente naquela lista.

O campo SHALL residir no global `footer`. O footer SHALL NOT obter seus links sociais do documento `Contact`, porque o footer é renderizado em toda rota via `layout.tsx` enquanto a seção de contato pode ser desabilitada pelo global `homepage` ou estar vazia.

Cada entrada authorada SHALL renderizar um ícone na barra inferior. Nenhuma entrada authorada SHALL ser omitida, e nenhum ícone SHALL aparecer sem entrada correspondente.

#### Scenario: As três plataformas do mockup são authoráveis

- **WHEN** um editor abre o global Footer no admin
- **THEN** pode adicionar entradas de `socialLinks` para Dribbble, LinkedIn e Instagram, cada uma com URL e rótulo

#### Scenario: Entradas authoradas renderizam na barra inferior

- **WHEN** três entradas de `socialLinks` estão authoradas e a página é renderizada
- **THEN** três ícones aparecem na barra inferior, alinhados à direita, na mesma linha do copyright, na ordem em que foram authorados

#### Scenario: Nenhum link social authorado

- **WHEN** `socialLinks` está vazio ou ausente e a página é renderizada
- **THEN** nenhum ícone é renderizado, a barra inferior permanece com o copyright alinhado à esquerda, e nenhum espaço reservado vazio aparece à direita

#### Scenario: Plataforma sem ícone mapeado

- **WHEN** uma entrada é authorada com um `platform` para o qual não existe ícone definido no componente
- **THEN** a entrada continua sendo renderizada como destino navegável com um tratamento de reserva, e a página não quebra

### Requirement: Fechamento — o footer não regride em custo de cliente

A introdução dos ícones sociais SHALL NOT alterar a natureza de renderização do footer nem o seu custo de bundle.

O componente `Footer` é hoje um Server Component e SHALL permanecer um: nenhuma diretiva `"use client"` SHALL ser adicionada a `src/components/Footer/index.tsx`. Os ícones são estáticos e a barra inferior não tem interatividade.

O mapeamento de `platform` para ícone SHALL usar imports nomeados, resolvidos estaticamente. SHALL NOT usar resolução dinâmica sobre um namespace (`import * as` seguido de acesso por chave), forma que impede o tree-shaking. Esta restrição é herdada de `client-bundle-budget` (requirement *"Bibliotecas de ícones não entram no bundle por barril"*) e é o erro documentado em `src/components/Button/index.tsx:44-49` como tendo custado 12,7 MB e 93% dos bytes de cliente da rota.

#### Scenario: Footer permanece Server Component

- **WHEN** `src/components/Footer/index.tsx` é inspecionado após a implementação
- **THEN** o arquivo não contém a diretiva `"use client"`

#### Scenario: Ícones entram por import nomeado

- **WHEN** os imports de ícone do footer são inspecionados
- **THEN** cada ícone usado é um import nomeado e nenhum namespace de biblioteca de ícones é importado inteiro nem indexado por chave em runtime

#### Scenario: Bundle de cliente da rota não cresce materialmente

- **WHEN** o first-load JS da rota é medido antes e depois da change
- **THEN** o crescimento é compatível com três ícones SVG, e nenhum namespace de biblioteca de ícones aparece no bundle
