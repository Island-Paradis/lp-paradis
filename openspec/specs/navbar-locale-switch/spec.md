# navbar-locale-switch Specification

## Purpose

O switch de idioma — o que a pílula apresenta, como o destino é derivado do pathname, o que é preservado na troca, as bandeiras, a acessibilidade, e o comportamento nos dois breakpoints.

_Introduzida por `add-navbar-locale-switch`, sincronizada ao arquivar._

## Requirements

### Requirement: A pílula apresenta o locale corrente

O switch SHALL apresentar a bandeira e o código do **locale corrente**, e SHALL NOT apresentar o locale de destino no rótulo visível.

O código do idioma SHALL ser apresentado em maiúsculas (`PT`, `EN`).

#### Scenario: Visitante em português

- **WHEN** o visitante está em `/pt/get-quote`
- **THEN** a pílula apresenta a bandeira de `pt` e o texto `PT`

#### Scenario: Visitante em inglês

- **WHEN** o visitante está em `/en`
- **THEN** a pílula apresenta a bandeira de `en` e o texto `EN`

### Requirement: O destino é o pathname corrente com o locale trocado

O `href` do switch SHALL ser o pathname corrente com o primeiro segmento substituído pelo outro locale, preservando os restantes segmentos e a query string.

O pathname SHALL ser obtido de `usePathname` de `next/navigation`. O switch SHALL NOT importar de `@/i18n/navigation` nem de qualquer módulo de `next-intl` — o navbar existe em todas as rotas, e o runtime ICU do `@formatjs` que aqueles módulos arrastam (+33,6 KB medidos, ver [`Footer/index.tsx`](../../../../src/components/Footer/index.tsx)) entraria no chunk compartilhado de todo o site.

#### Scenario: Troca numa rota interior

- **WHEN** o visitante está em `/pt/get-quote` e a pílula é renderizada
- **THEN** o `href` do switch é `/en/get-quote`

#### Scenario: Troca na raiz do locale

- **WHEN** o visitante está em `/en`
- **THEN** o `href` do switch é `/pt`

#### Scenario: Query string preservada

- **WHEN** o visitante está em `/pt/get-quote?ref=linkedin`
- **THEN** o `href` do switch preserva `?ref=linkedin`

#### Scenario: Hash não preservado

- **WHEN** o visitante está em `/pt/#services` e clica no switch
- **THEN** chega ao topo de `/en`, sem a âncora
- **AND** isto é comportamento assumido, não defeito — `usePathname` não expõe o hash e ler `window.location.hash` no render provocaria erro de hidratação

#### Scenario: Ausência de runtime de i18n no cliente

- **WHEN** os chunks de cliente do build são inspecionados
- **THEN** nenhum contém os marcadores `clonePosition` ou `bumpSpace` do parser ICU do `@formatjs`
- **AND** o módulo do switch não importa de `@/i18n/navigation` nem de `next-intl`

### Requirement: O switch é um link, não um botão

O switch SHALL ser um elemento de navegação (`<a>`, via `Link` de `next/link`), de modo a funcionar sem JavaScript, aceitar clique do meio e "abrir em novo separador".

A forma visual SHALL reusar o `Button` existente com `variant="outline"` e `asChild`, herdando o estado de foco do resto do site. O conteúdo da pílula SHALL ser envolvido num único elemento, porque o `Slot` usado pelo `asChild` exige um filho React único.

#### Scenario: Elemento renderizado

- **WHEN** a pílula é renderizada
- **THEN** o elemento interativo é uma âncora com `href`
- **AND** não é um `<button>` dependente de manipulador de clique

#### Scenario: Foco por teclado

- **WHEN** o visitante navega por `Tab` até ao switch
- **THEN** o anel de foco visível é o mesmo que os outros botões do site apresentam

### Requirement: O nome acessível anuncia a acção e o destino

O switch SHALL ter um `aria-label` que nomeie a troca e o idioma de destino, escrito no idioma de destino. A bandeira SHALL ser decorativa (`alt=""` e escondida da árvore de acessibilidade), porque o nome acessível do controlo já é dado pelo `aria-label`.

Uma bandeira anunciada por nome de país faria o leitor de ecrã dizer um país onde a intenção é um idioma.

#### Scenario: Nome acessível em português

- **WHEN** o visitante está em `/en` e inspeciona o nome acessível do switch
- **THEN** o nome descreve a troca para português, escrito em português

#### Scenario: Nome acessível em inglês

- **WHEN** o visitante está em `/pt`
- **THEN** o nome descreve a troca para inglês, escrito em inglês

#### Scenario: Bandeira não é anunciada

- **WHEN** um leitor de ecrã percorre o switch
- **THEN** nenhum nome de país é anunciado
- **AND** o único texto anunciado é o nome acessível do controlo

### Requirement: As bandeiras são assets estáticos, não emoji

Cada locale SHALL ter um ficheiro SVG em `public/`, renderizado com `next/image` como no [`NavBarLogo`](../../../../src/components/NavBar/NavBarLogo.tsx).

O switch SHALL NOT usar emoji de bandeira. O Windows não possui glifos de bandeira e os navegadores baseados em Chromium apresentam as letras do código do país numa caixa — a bandeira de Angola, com o emblema e a estrela, não existe como emoji renderizável nessa plataforma.

#### Scenario: Bandeira renderizada

- **WHEN** a pílula é renderizada em qualquer sistema operativo
- **THEN** a bandeira apresentada é a imagem SVG do locale, recortada em círculo

#### Scenario: Nenhum emoji no markup

- **WHEN** o markup do switch é inspecionado
- **THEN** não existe caractere de emoji de bandeira

### Requirement: O toggle assume exactamente dois locales

O locale de destino SHALL ser derivado como o primeiro locale de `routing.locales` que não é o corrente.

Esta derivação é correcta apenas para dois locales. Um terceiro locale SHALL NOT quebrar o build nem lançar erro em runtime — o switch passaria a ignorá-lo em silêncio. O módulo que faz a derivação SHALL registar essa condição em comentário, para que acrescentar um locale a `routing.ts` obrigue a rever o componente em vez de descobrir a omissão em produção.

#### Scenario: Dois locales configurados

- **WHEN** `routing.locales` é `["en", "pt"]` e o locale corrente é `pt`
- **THEN** o destino é `en`

#### Scenario: Locale desconhecido no pathname

- **WHEN** o primeiro segmento do pathname não corresponde a nenhum locale suportado
- **THEN** o switch não lança erro
- **AND** apresenta o locale padrão como corrente

### Requirement: O switch existe nos dois breakpoints

O switch SHALL ser visível no navbar em desktop, à esquerda dos botões do CMS, e SHALL ser visível dentro do menu mobile.

O `NavBarMobileMenu` renderiza os seus `children` em dois lugares: a linha desktop, sempre presente no DOM e escondida por CSS abaixo de 1024px, e o portal mobile, que só é montado **enquanto o menu está aberto** (`isOpen && createPortal(...)`). Os dois coexistem apenas nesse intervalo — o suficiente para que o switch SHALL NOT usar `id` fixo.

#### Scenario: Desktop

- **WHEN** a página é vista a partir de 1024px
- **THEN** o switch aparece na linha do navbar, antes dos botões do CMS

#### Scenario: Mobile

- **WHEN** a página é vista abaixo de 1024px e o menu é aberto
- **THEN** o switch aparece dentro do menu

#### Scenario: Sem identificadores duplicados

- **WHEN** o DOM de qualquer página é inspecionado
- **THEN** nenhum `id` aparece duas vezes por causa do switch

### Requirement: A preferência de idioma sobrevive à navegação seguinte

Depois de trocar de locale, uma navegação subsequente para uma rota sem prefixo SHALL levar o visitante ao locale escolhido, e não ao anterior.

O next-intl guarda a preferência num cookie escrito pelo middleware. Este requisito existe porque o comportamento é inferido e não observado: se a navegação do switch não actualizar esse cookie, o visitante troca para `/en`, navega para `/`, e é devolvido a `/pt` — o switch pareceria não ter funcionado.

#### Scenario: Preferência persistida

- **WHEN** o visitante em `/pt` clica no switch e depois navega para `/`
- **THEN** chega à versão em `en`

### Requirement: Fixture dev-only para o navbar

SHALL existir uma rota `/[locale]/fixtures/navbar` que renderiza o navbar com props fabricadas, cobrindo a pílula em cada locale e os estados degradados de `navbar-link-destinations`.

A rota SHALL chamar `notFound()` a menos que `NODE_ENV === "development"`, e essa guarda SHALL ser a primeira coisa no corpo do componente. A fixture SHALL indicar a contagem esperada de elementos, incluindo a duplicação causada pelo `NavBarMobileMenu`, e apontar em comentário para os cenários de spec que cobre.

#### Scenario: Acesso em produção

- **WHEN** a rota da fixture é pedida com `NODE_ENV` diferente de `development`
- **THEN** a resposta é 404

#### Scenario: Acesso em desenvolvimento

- **WHEN** a rota é aberta no dev server
- **THEN** apresenta os casos fabricados, cada um identificado
- **AND** a contagem esperada declarada na página corresponde ao que é renderizado
