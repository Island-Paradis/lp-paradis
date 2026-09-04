# scroll-frame-budget Specification

## Purpose

O que a página tem permissão de custar por frame enquanto o usuário rola ou move o ponteiro — ausência de layout forçado em handlers de scroll, ausência de animação sobre propriedades de layout, `will-change` com escopo temporal, e limite de efeitos de paint contínuo. Cobre a camada 2.

_Introduzida por `optimize-landing-performance`, sincronizada ao arquivar._

## Requirements

### Requirement: Handlers de scroll não leem geometria de layout

Um listener de `scroll` SHALL NOT chamar API que force o browser a recalcular layout de forma síncrona — `getBoundingClientRect()`, `offsetTop`, `scrollHeight` e equivalentes.

A restrição é mais dura neste projeto do que seria em geral. Com scroll nativo, eventos de scroll são esporádicos e coalescidos pelo browser. Com Lenis, o scroll é conduzido por `requestAnimationFrame` e emite evento **a cada frame**, durante todo o easing. Uma leitura de geometria que seria ocasional passa a ser um layout forçado por frame, dentro do próprio frame de animação.

Geometria que precise ser conhecida SHALL vir de fonte observacional — `ResizeObserver`, `IntersectionObserver` — ou ser medida em eventos discretos de baixa frequência, como `mouseenter`.

#### Scenario: Nenhuma leitura de geometria em listener de scroll

- **WHEN** todos os `addEventListener("scroll", ...)` do codebase são inspecionados
- **THEN** nenhum handler chama API de leitura de layout de forma síncrona

#### Scenario: A medida continua correta após o elemento se mover

- **WHEN** a página é rolada de forma que o elemento de referência do `CursorGlow` mude de posição, e o ponteiro entra nele em seguida
- **THEN** o halo aparece alinhado ao ponteiro, sem o deslocamento que um rect obsoleto causaria

#### Scenario: Ausência de forced layout no trace

- **WHEN** um trace de performance é gravado durante scroll contínuo no perfil de referência
- **THEN** não há entradas de *forced reflow* atribuídas a handlers de scroll da aplicação

### Requirement: Animação contínua usa apenas propriedades compositáveis

Uma animação que roda por vários frames SHALL animar apenas `transform` e `opacity`. Propriedades que disparam layout — `width`, `height`, `margin`, `top`, `left`, `padding` — SHALL NOT ser alvo de animação contínua, incluindo molas e transições.

Animar `width` e `height` com mola parece inofensivo porque o elemento é pequeno, mas o custo não é proporcional ao elemento: cada frame invalida o layout e obriga um repaint. `transform: scale` produz o mesmo crescimento visual sem sair da etapa de composição.

#### Scenario: O cursor cresce sobre alvos interativos

- **WHEN** o ponteiro entra em um elemento `[data-cursor="hover"]` e depois em um `[data-cursor="view"]`
- **THEN** o ponto cresce para os mesmos tamanhos aparentes de hoje, com a mesma curva de mola, e o label "View" continua legível e centrado

#### Scenario: Nenhuma propriedade de layout sob animação

- **WHEN** os alvos de `animate`, `variants` e `transition` do codebase são inspecionados
- **THEN** nenhum inclui `width`, `height`, `margin*`, `top`, `left` ou `padding*`

#### Scenario: O crescimento não produz layout no trace

- **WHEN** um trace é gravado enquanto o ponteiro atravessa repetidamente alvos `[data-cursor]`
- **THEN** os frames da transição não contêm etapa de layout atribuída ao cursor

### Requirement: Eventos de ponteiro de alta frequência são coalescidos por frame

Trabalho disparado por `mousemove` — travessia de DOM, atualização de estado React, leitura de atributos — SHALL ser executado no máximo uma vez por frame.

`mousemove` dispara mais rápido que a taxa de atualização em telas de alta frequência, e cada disparo que atualiza estado React agenda uma renderização. O trabalho útil por frame é um só: nada além do último evento do frame é observável.

Isto não se aplica à atualização de `MotionValue`, que não passa pelo ciclo de render e já é lida no frame.

#### Scenario: Uma travessia de DOM por frame

- **WHEN** o ponteiro é movido continuamente sobre a página
- **THEN** a resolução do alvo `[data-cursor]` acontece no máximo uma vez por frame, independentemente de quantos eventos chegaram

#### Scenario: O cursor continua colado ao ponteiro

- **WHEN** o ponteiro é movido rapidamente através da viewport
- **THEN** o ponto segue com a mesma responsividade de hoje, sem atraso perceptível introduzido pela coalescência

### Requirement: `will-change` tem escopo temporal

`will-change` SHALL ser aplicado apenas enquanto a mudança anunciada está prestes a ocorrer ou está ocorrendo, e removido depois. Elementos grandes SHALL NOT carregar `will-change: transform` permanente em folha de estilo.

`will-change` não é uma otimização declarativa: ele instrui o browser a promover o elemento a uma camada de composição e mantê-la. Permanente, em um elemento do tamanho dos blocos de vídeo e serviços, é memória de GPU reservada pela vida inteira da página — e o aparelho de referência é justamente onde essa memória é escassa.

Onde a promoção de camada for de fato necessária e contínua, a intenção SHALL ser expressa por um meio que não peça reserva antecipada, e a razão SHALL ficar registrada junto da regra.

#### Scenario: Nenhum `will-change` permanente em folha de estilo

- **WHEN** `globals.css` é inspecionado
- **THEN** nenhuma regra aplica `will-change` de forma incondicional a um elemento de página inteira

#### Scenario: O recorte entrelaçado permanece correto

- **WHEN** a home é renderizada nos breakpoints `md`, `lg` e `xl` após a remoção
- **THEN** o encaixe entre `.video_shape` e `.services_shape` mantém a geometria definida por `homepage-shape-interlock`, sem serrilhado ou deslocamento novo

### Requirement: Efeitos de paint contínuo são limitados em superfícies persistentes

Uma superfície que permanece visível durante todo o scroll — nav sticky, overlays fixos — SHALL NOT aplicar um efeito de paint cujo custo se repita a cada frame em que o conteúdo atrás dela se move, quando existir alternativa de aparência equivalente.

`backdrop-filter` reprocessa o que está atrás dele sempre que aquele conteúdo muda. Numa nav sticky de largura total, sobre uma página com scroll suave, "sempre que muda" é todo frame de todo scroll — a maior superfície de repaint contínuo da página.

#### Scenario: A nav mantém a leitura de vidro

- **WHEN** a página é rolada além do limiar de `scrolled`
- **THEN** a nav continua se distinguindo do conteúdo por trás dela, com a mesma hierarquia visual e a mesma transição de entrada

#### Scenario: Custo de paint durante scroll

- **WHEN** um trace é gravado durante scroll contínuo no perfil de referência
- **THEN** o custo de paint atribuído à nav é substancialmente menor que na baseline

### Requirement: Redução de custo por frame não altera o movimento percebido

Nenhum item desta capability SHALL remover, encurtar ou enfraquecer uma animação. O cursor, o halo, o parallax, o marquee e as revelações continuam existindo com a mesma duração, a mesma curva e o mesmo alcance.

O único item com efeito visual admitido é o tratamento da nav, e mesmo ele está sujeito ao cenário de leitura de vidro acima.

Este requisito é o fecho da change: se um item só rende performance ao custo de movimento, ele SHALL ser revertido, e não negociado.

#### Scenario: Inventário de movimento preservado

- **WHEN** a lista de efeitos da página é percorrida após a implementação — cursor, halo do hero, marquee de velocidade, parallax do vídeo, revelações de bloco e de palavra, transição de página, swap de texto e magnetismo dos botões
- **THEN** todos continuam presentes e com o mesmo comportamento aparente

#### Scenario: `prefers-reduced-motion` continua respeitado

- **WHEN** a preferência de movimento reduzido está ativa
- **THEN** cada componente tocado por esta change mantém exatamente o caminho degradado que já tinha, incluindo a garantia de visibilidade de texto que `prevent-invisible-text` estabelece
