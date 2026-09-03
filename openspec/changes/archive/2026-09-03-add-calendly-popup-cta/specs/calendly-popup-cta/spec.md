## ADDED Requirements

### Requirement: O destino Calendly é reconhecido pelo hostname

Um CTA SHALL abrir o popup do Calendly quando, e apenas quando, o hostname do seu `href` é `calendly.com` ou um subdomínio dele. A comparação SHALL ser feita sobre o hostname extraído do URL, nunca por `includes` sobre a string inteira.

Não há campo no Payload que marque a intenção. A consequência aceite é que o comportamento fica invisível no admin, e o `admin.description` dos campos `url` SHALL dizê-lo.

#### Scenario: Destino Calendly abre popup

- **WHEN** um CTA com `href` igual a `https://calendly.com/geral-paradis/30min` é clicado
- **THEN** a navegação é cancelada
- **AND** o calendário abre num popup por cima da página corrente

#### Scenario: Subdomínio do Calendly abre popup

- **WHEN** um CTA aponta para um hostname terminado em `.calendly.com`
- **THEN** o popup abre, como no domínio de topo

#### Scenario: Hostname que apenas contém o texto não abre popup

- **WHEN** um CTA aponta para um hostname como `calendly.com.exemplo.net`
- **THEN** o popup NÃO abre
- **AND** o clique navega normalmente para esse destino

#### Scenario: Destino interno não ganha comportamento de popup

- **WHEN** um CTA aponta para `/get-quote` ou para qualquer outro host
- **THEN** nenhum handler intercepta o clique
- **AND** a navegação acontece como em qualquer link do site

#### Scenario: `href` que não é URL absoluta não quebra a detecção

- **WHEN** o `href` é uma âncora, um `mailto:` ou um caminho relativo
- **THEN** a detecção devolve "não é Calendly" sem lançar excepção

### Requirement: O widget carrega no primeiro clique, não antes

`widget.js` e `widget.css` SHALL ser pedidos apenas depois de o visitante clicar num CTA de Calendly. A página em repouso NÃO SHALL conter nenhum recurso do Calendly, nem no bundle nem em pedidos de rede.

Isto é o que mantém a change fora do regime que `cut-sustained-runtime-cost` mede. Antecipar o carregamento — em hover, em `requestIdleCallback`, ou no `layout` — reabre aquela decisão e exige medida no instrumento dela.

#### Scenario: Página parada não pede nada ao Calendly

- **WHEN** qualquer rota pública é carregada e o visitante não clica em nenhum CTA
- **THEN** nenhum pedido é feito a `assets.calendly.com`
- **AND** nenhum elemento do Calendly existe no DOM

#### Scenario: Primeiro clique carrega o widget

- **WHEN** o primeiro CTA de Calendly da sessão é clicado
- **THEN** `widget.css` e `widget.js` são injectados
- **AND** o popup abre depois de o script estar pronto, sem exigir um segundo clique

#### Scenario: Cliques seguintes reutilizam o que já carregou

- **WHEN** um CTA de Calendly é clicado com o widget já carregado
- **THEN** nenhum pedido novo é feito
- **AND** o popup abre no acto

#### Scenario: Dois CTAs na mesma página partilham o carregamento

- **WHEN** o CTA do `Hero` e o do `Footer` existem na mesma rota
- **THEN** o widget é carregado no máximo uma vez por sessão de página

### Requirement: O CTA continua a funcionar quando o popup não pode abrir

O CTA SHALL ser uma âncora com o `href` do Calendly, e a intercepção do clique SHALL ser um acréscimo a essa âncora, não um substituto. Todo caminho em que o popup falha degrada para navegação até ao mesmo destino.

#### Scenario: Script de terceiros não carrega

- **WHEN** o clique dispara o carregamento e `widget.js` falha ou expira
- **THEN** o visitante é navegado para o `href` do Calendly
- **AND** o CTA não fica sem resposta visível

#### Scenario: JavaScript desligado

- **WHEN** a página é servida sem JavaScript a correr
- **THEN** o CTA é uma âncora funcional para o Calendly

#### Scenario: Clique com modificador abre nova aba

- **WHEN** o CTA é clicado com `Cmd`, `Ctrl` ou `Shift`, ou com o botão do meio
- **THEN** a navegação NÃO é cancelada
- **AND** o comportamento nativo do browser acontece, sem popup

#### Scenario: Navegação por teclado

- **WHEN** o CTA recebe foco por `Tab` e é activado por `Enter`
- **THEN** o popup abre, como num clique sem modificador

### Requirement: O scroll de fundo trava enquanto o popup está aberto

Com o popup aberto, o documento por baixo NÃO SHALL rolar, nem por roda, nem por toque, nem por teclado. Ao fechar, a posição de scroll e o comportamento do Lenis SHALL ser restaurados.

O overlay é DOM de terceiros injectado no `body`, portanto `data-lenis-prevent` não pode ser escrito declarativamente como no menu mobile — a travagem tem de ser aplicada de fora, ao documento.

#### Scenario: Fundo não rola com o popup aberto

- **WHEN** o popup está aberto e o visitante usa a roda do rato
- **THEN** a página por baixo mantém a posição de scroll
- **AND** o conteúdo dentro do popup rola normalmente

#### Scenario: Scroll é restaurado ao fechar

- **WHEN** o popup é fechado, pelo `X` do Calendly ou por clique fora
- **THEN** o scroll da página volta a responder
- **AND** a posição de scroll é a mesma de antes de abrir

#### Scenario: Lenis retoma sem salto

- **WHEN** o popup fecha e o visitante rola
- **THEN** o scroll suave do Lenis funciona como antes de o popup abrir
- **AND** o primeiro gesto não produz um salto por delta acumulado

#### Scenario: Popup fechado sem nunca ter aberto

- **WHEN** o carregamento do widget falha e o popup nunca abre
- **THEN** o scroll do fundo nunca é travado

### Requirement: Os limites do DOM de terceiros são registados, não simulados

O código SHALL tratar o interior do popup como opaco. Gestão de foco, tecla `Escape`, devolução de foco ao fechar e aparência do cursor dentro do overlay são do Calendly, e esta capability NÃO SHALL replicá-las nem prometê-las.

#### Scenario: Foco dentro do overlay não é gerido por este código

- **WHEN** o popup abre
- **THEN** nenhum `focus trap` próprio é instalado
- **AND** a limitação fica registada em vez de contornada com um wrapper por cima do iframe

#### Scenario: Cursor personalizado sobre o iframe

- **WHEN** o ponteiro entra na área do iframe do Calendly
- **THEN** o `CursorFollower` deixa de acompanhar, porque os eventos não atravessam para o documento pai
- **AND** isto é comportamento aceite, não defeito a corrigir aqui

### Requirement: Os estados são verificáveis sem navegar o site

O projecto SHALL disponibilizar uma rota de fixture que exercite o CTA de Calendly em estados degradados, disponível apenas em desenvolvimento.

#### Scenario: Fixture cobre os caminhos que a home não mostra

- **WHEN** a rota de fixture é aberta em desenvolvimento
- **THEN** mostra um CTA de Calendly, um CTA interno e um CTA sem `url`
- **AND** mostra-os nas variantes com `textSwap` e com `circleIcon`, para o item da outra capability ser verificável

#### Scenario: Fixture está fechada em produção

- **WHEN** a rota de fixture é pedida com `NODE_ENV` diferente de `development`
- **THEN** responde 404 através de `notFound()`
- **AND** a guarda é a primeira instrução do corpo do componente
