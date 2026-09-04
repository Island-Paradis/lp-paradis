## ADDED Requirements

### Requirement: Os botões do navbar navegam para a sua URL do CMS

Cada botão do array `buttons` do global `Menu` SHALL renderizar um destino navegável usando o seu campo `url`.

Hoje [`Header/index.tsx`](../../../../src/components/Header/index.tsx) mapeia `args.buttons` para `<Button>` sem `asChild`, sem `onClick` e sem ler `btn.url` — o campo é preenchível no admin e o botão é inerte. O botão "Get Quote" é o caminho de conversão principal do site.

O `Button` SHALL receber `asChild` a envolver um `Link`, com um único filho React, pela restrição do `Slot` que o footer documenta.

#### Scenario: Botão com URL

- **WHEN** o global `Menu` tem um botão com `label: "Get Quote"` e `url: "/get-quote"`, e o visitante está em `/en`
- **THEN** o botão é uma âncora para `/en/get-quote`
- **AND** clicar nele navega para a página de orçamento

#### Scenario: Botão sem URL authorada

- **WHEN** um botão do CMS não tem `url`
- **THEN** o botão continua a ser renderizado com o seu rótulo
- **AND** não produz uma âncora com destino vazio nem lança erro

#### Scenario: Botão que abre em novo separador

- **WHEN** um botão tem `openInNewTab` ligado
- **THEN** a âncora abre num novo separador com `rel` adequado

### Requirement: Links e botões relativos recebem o prefixo de locale

Um `href` que comece por `/` SHALL ser prefixado com o locale corrente. Um `href` que não comece por `/` SHALL ser devolvido intacto — `#ancora`, `mailto:`, `tel:` e URL absoluta, porque prefixar qualquer um deles quebraria o destino.

A raiz `/` SHALL tornar-se `/<locale>`, e não `/<locale>/`.

O prefixo SHALL ser montado por um helper partilhado em `src/lib/locale-href.ts`, com a mesma semântica que o footer já aplica. O helper replica à mão o `localePrefix: "always"` que é o default do next-intl e que [`routing.ts`](../../../../src/i18n/routing.ts) não sobrescreve — o módulo SHALL registar esse acoplamento em comentário, porque uma alteração a `routing.ts` quebraria o prefixo sem erro de tipo nem teste a falhar.

#### Scenario: Link relativo

- **WHEN** um link do CMS tem `url: "/about"` e o visitante está em `/pt`
- **THEN** a âncora aponta para `/pt/about`

#### Scenario: Link para a raiz

- **WHEN** um link do CMS tem `url: "/"` e o visitante está em `/pt`
- **THEN** a âncora aponta para `/pt`

#### Scenario: Âncora na mesma página

- **WHEN** um link do CMS tem `url: "/#services"` e o visitante está em `/pt`
- **THEN** a âncora aponta para `/pt/#services`

#### Scenario: Âncora sem barra inicial

- **WHEN** um link do CMS tem `url: "#services"`
- **THEN** a âncora aponta para `#services`, sem prefixo

#### Scenario: URL externa

- **WHEN** um link do CMS tem `url: "https://kitenda.paradis.host/"`
- **THEN** a âncora aponta para essa URL, sem prefixo de locale

#### Scenario: Destino mailto

- **WHEN** um link do CMS tem `url: "mailto:hello@paradis.host"`
- **THEN** a âncora aponta para esse `mailto:`, sem prefixo

### Requirement: O locale corrente chega ao navbar por prop

O `Header` SHALL receber o locale como prop, passada pelo `layout.tsx`, tal como já acontece com o `Footer` (`<Footer {...footerData} locale={locale} />`).

O `Header` SHALL NOT obter o locale através de `getLocale()` de `next-intl/server` — evitar imports de next-intl é precisamente o que esta mudança defende, mesmo do lado do servidor.

#### Scenario: Locale propagado

- **WHEN** o layout renderiza o `Header` na rota `/pt`
- **THEN** o `Header` recebe `locale: "pt"` e os seus links são prefixados com `pt`

#### Scenario: Sem import de next-intl no Header

- **WHEN** o módulo do `Header` e os seus imports são inspecionados
- **THEN** não existe import de `next-intl` nem de `@/i18n/navigation`

### Requirement: Os botões do navbar são visíveis em mobile

Os botões do CMS e o switch de idioma SHALL ser visíveis dentro do menu mobile.

O `NavBarButtonWrap` é hoje `hidden gap-3 lg:flex`, e o `NavBarMobileMenu` renderiza `children` duas vezes — na linha desktop e no portal mobile. No portal o wrap continua `hidden`, pelo que os botões do CMS **nunca aparecem em ecrã pequeno**: é o mesmo defeito de "botão sem destino" por outra via, e deixa `/get-quote` inalcançável em telefone.

#### Scenario: Menu mobile aberto

- **WHEN** a página é vista abaixo de 1024px e o menu é aberto
- **THEN** os botões do CMS são visíveis dentro do menu

#### Scenario: Layout em desktop preservado

- **WHEN** a página é vista a partir de 1024px
- **THEN** os botões continuam dispostos em linha na barra, como antes desta mudança

### Requirement: Navegar depois de trocar de idioma mantém o idioma

Depois de o visitante trocar de locale, clicar num link do navbar SHALL mantê-lo nesse locale.

Este requisito é a razão de os links entrarem no mesmo escopo do switch: um switch que funciona seguido de navegação que o desfaz é pior do que não ter switch.

#### Scenario: Trocar e navegar

- **WHEN** o visitante em `/en` troca para `/pt` e depois clica no link "Services" do navbar
- **THEN** chega ao destino no locale `pt`
- **AND** não é devolvido a `en`
