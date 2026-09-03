# cms-authored-cta-links Specification

## Purpose

O contrato de que um destino authorado no Payload chega ao DOM como elemento navegável, em todas as superfícies de CTA do site — e de que a aparência do botão não muda por ele ser link.

Existe porque o modo de falha que ela previne é silencioso: um componente que renderiza `label` e descarta `url` produz um botão com `cursor-pointer`, com hover animado, e que não faz nada ao ser clicado. Nada avisa — não há erro de tipo, o build passa, e a superfície parece correcta em revisão de código. Quatro dos seis grupos de CTA do projecto estiveram nesse estado.

A capability é dona de "o destino existe e é alcançável". O que acontece ao clicar num destino específico — o popup do Calendly, por exemplo — é de [`calendly-popup-cta`](../calendly-popup-cta/spec.md).

## Requirements

### Requirement: Um `url` authorado chega ao DOM como elemento navegável

Toda superfície de CTA que lê um `label` do Payload SHALL também ler o `url` do mesmo grupo e produzir um elemento navegável. Um grupo de CTA cujo `label` é renderizado e cujo `url` é descartado é uma violação desta capability, independentemente de o botão parecer correcto.

As superfícies cobertas são: `Hero.primaryCta`, `Hero.secondaryCta`, `HomePage.services.primaryCta`, `HomePage.projects.primaryCta`, `Footer.cta.primaryButton` e `Footer.cta.outlineButton`.

#### Scenario: CTA com destino authorado

- **WHEN** um grupo de CTA tem `label` e `url` preenchidos
- **THEN** o elemento renderizado é uma âncora com esse destino no atributo `href`
- **AND** clicar nele navega, sem depender de JavaScript

#### Scenario: CTA sem destino degrada para elemento inerte

- **WHEN** o `url` de um grupo de CTA é `null`, string vazia ou só espaços
- **THEN** o elemento renderizado é um `<button>` sem atributo `href`
- **AND** NÃO é uma âncora com `href=""`, que recarregaria a página corrente
- **AND** o rótulo continua visível, com a mesma aparência de um CTA com destino

#### Scenario: `#` sozinho conta como ausência de destino

- **WHEN** o `url` de um grupo de CTA é exactamente `#`
- **THEN** o elemento renderizado é um `<button>` inerte, como no cenário anterior
- **AND** NÃO é uma âncora que salte para o topo da página

#### Scenario: Âncora real não é confundida com ausência de destino

- **WHEN** o `url` tem um fragmento com nome, como `/#services` ou `#faqs`
- **THEN** o elemento renderizado é uma âncora com esse destino
- **AND** a navegação para a secção acontece normalmente

#### Scenario: Um destino authorado que não resolve é corrigido no conteúdo

- **WHEN** um `url` authorado aponta para uma rota que não existe no `App Router`
- **THEN** o conserto é reauthorar o `url`, não acrescentar guarda em código
- **AND** o `Button` trata-o como qualquer outro destino, porque distinguir "rota que existe" de "rota que não existe" em tempo de render não é possível sem duplicar a tabela de rotas

### Requirement: A aparência do botão não depende de ele ser link

O `Button` SHALL preservar todas as camadas de hover — painel de preenchimento, deslize duplo de rótulo, disco e glifo do `circleIcon`, e o deslocamento `magnetic` — quando recebe `href`. Nenhuma prop visual perde efeito por o elemento passar a ser âncora.

Esta é a razão de o caminho `href` existir em vez de se reusar `asChild`: os call sites a ligar usam precisamente as props que `asChild` descarta.

#### Scenario: `textSwap` sobrevive ao `href`

- **WHEN** um `Button` recebe `href` junto com `textSwap`
- **THEN** o painel de preenchimento é inserido e sobe em hover
- **AND** o rótulo desliza em duas cópias, como num `Button` sem `href`

#### Scenario: Ícone sobrevive ao `href`

- **WHEN** um `Button` recebe `href` junto com `trailingIcon` e `circleIcon`
- **THEN** o `<span>` do ícone é inserido dentro da âncora
- **AND** o disco inverte de cor ao mesmo ritmo do painel

#### Scenario: `magnetic` sobrevive ao `href`

- **WHEN** um `Button` recebe `href` junto com `magnetic`
- **THEN** o elemento acompanha o ponteiro com a mesma força de hoje
- **AND** o rótulo não salta lateralmente à entrada do cursor

### Requirement: O caminho `asChild` mantém exactamente o comportamento actual

O `asChild` SHALL continuar a repassar apenas `children` para o `Slot`, sem inserir painel de preenchimento nem `<span>` de ícone. Esta capability acrescenta um caminho novo; não altera o existente.

#### Scenario: Call site com `asChild` não muda

- **WHEN** um `Button` é renderizado com `asChild`, como no `FooterHref` dos `linkGroups`
- **THEN** nenhuma camada é inserida
- **AND** o filho único exigido pelo `Slot` é preservado

#### Scenario: `href` e `asChild` no mesmo `Button`

- **WHEN** se tenta passar `href` e `asChild` ao mesmo `Button`
- **THEN** a combinação falha em compilação
- **AND** nenhuma regra de precedência existe em runtime, porque a combinação não chega lá

#### Scenario: `openInNewTab` sem destino

- **WHEN** se tenta passar `openInNewTab` a um `Button` sem `href`
- **THEN** a combinação falha em compilação
- **AND** um `<button>` nunca recebe `target` nem `rel`, atributos que não lhe pertencem

### Requirement: O prefixo de locale aplica-se só a destinos internos

Um `href` de CTA SHALL receber o prefixo do locale corrente quando começa por `/`, e SHALL sair intacto em qualquer outra forma — âncora (`#servicos`), esquema (`mailto:`, `tel:`) ou URL absoluta. É a regra que `localizedHref` já implementa, e passa a valer para todas as superfícies de CTA.

O prefixo SHALL ser resolvido no servidor. Nenhum componente de cliente que renderize um CTA pode ler o locale corrente, porque importar `@/i18n/navigation` no cliente arrasta o runtime ICU do next-intl — 33,6 KB medidos, registados em `components/Footer/index.tsx`.

#### Scenario: Destino interno num locale não-omisso

- **WHEN** um CTA com `url` igual a `/get-quote` é renderizado em `/pt`
- **THEN** o `href` produzido é `/pt/get-quote`

#### Scenario: URL absoluta não é prefixada

- **WHEN** um CTA tem `url` igual a `https://calendly.com/geral-paradis/30min`
- **THEN** o `href` produzido é exactamente esse valor
- **AND** nenhum prefixo de locale é acrescentado

#### Scenario: Âncora na página corrente não é prefixada

- **WHEN** um CTA tem `url` igual a `/#services`
- **THEN** o prefixo é aplicado ao caminho e a parte após `#` fica intacta

#### Scenario: O leaf de cliente recebe o destino já resolvido

- **WHEN** um CTA é renderizado por um componente de cliente
- **THEN** o `href` chega-lhe por prop, já prefixado
- **AND** esse componente não importa nada de `@/i18n`

### Requirement: Abertura em nova aba é authorável onde já existe

Um CTA cujo grupo no Payload tem o campo `openInNewTab` SHALL abrir em nova aba quando esse campo está marcado, com `rel` que impeça o acesso ao `window` de origem.

#### Scenario: Nova aba marcada no CMS

- **WHEN** um CTA authorado tem `openInNewTab` marcado
- **THEN** a âncora leva `target="_blank"`
- **AND** leva `rel="noopener noreferrer"`

#### Scenario: Grupo sem o campo mantém navegação na mesma aba

- **WHEN** o grupo de CTA não define `openInNewTab`
- **THEN** a âncora não leva `target`
- **AND** nenhum campo novo é acrescentado ao schema por causa desta capability
