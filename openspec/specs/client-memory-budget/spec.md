# client-memory-budget Specification

## Purpose

O que a página tem permissão de reter durante uma sessão, e por quanto tempo — duplicação de DOM para efeito visual, camadas de composição permanentes, retenção de buffers de mídia, e crescimento monotônico de heap com a página parada. Cobre a camada 2.

_Introduzida por `cut-sustained-runtime-cost`, sincronizada ao arquivar._

## Requirements

### Requirement: O heap não cresce com a página parada

Com a home carregada e sem interação, o heap de JavaScript SHALL permanecer estável ao longo do tempo. Crescimento monotônico com a página ociosa SHALL ser tratado como retenção indevida e investigado até a causa, não compensado.

A divisa desta capability com `idle-runtime-budget` é deliberada, e vale principalmente para o vídeo, que aparece nas duas: **`idle-runtime-budget` é dona de "não roda"; `client-memory-budget` é dona de "não retém".**

Alocação por frame também pertence aqui. Um valor efêmero criado a cada frame por cada elemento animado não aparece como CPU média alta — aparece como pausas periódicas de coleta, que é como o sintoma "piora quanto mais tempo fica aberta" costuma se manifestar. Valores animados SHALL ser produzidos sem alocar quando o tipo aceito pela biblioteca permitir.

#### Scenario: Heap estável em dez minutos de ociosidade

- **WHEN** a home é carregada e deixada parada por 10 minutos, e dois heap snapshots são comparados por *Retained Size*
- **THEN** não há crescimento monotônico atribuível a componentes da aplicação

#### Scenario: Nenhuma alocação por frame em valor animado

- **WHEN** as transformações que produzem valores animados por frame são inspecionadas
- **THEN** nenhuma monta uma string nova a cada frame quando a biblioteca aceita um número para a mesma propriedade

#### Scenario: Observadores e listeners são liberados

- **WHEN** os componentes que instalam `IntersectionObserver`, `ResizeObserver` ou listeners de janela são desmontados
- **THEN** a contagem de `JS event listeners` do Performance Monitor volta ao patamar anterior à montagem

### Requirement: Duplicação de conteúdo para efeito visual cobre a viewport e não mais

Conteúdo replicado para produzir um laço contínuo SHALL ser replicado apenas o suficiente para cobrir a área visível mais a costura do laço. Cópias de folga além disso SHALL NOT ser mantidas.

Cada cópia é DOM completo: elementos, imagens decodificadas, bordas, sombras e o custo de estilo de tudo isso. Numa coluna replicada em três eixos — colunas × cópias × itens — o excedente multiplica em vez de somar, e o multiplicador é invisível na leitura do código.

#### Scenario: Contagem de cópias justificada pela geometria

- **WHEN** o número de cópias de uma linha de laço é calculado
- **THEN** ele é derivado da razão entre o tamanho do contêiner e o do bloco, mais a cópia de costura, sem folga adicional

#### Scenario: O laço continua sem emenda visível

- **WHEN** as colunas de depoimentos são observadas em movimento nos breakpoints `sm`, `md` e `lg`, nas duas direções, incluindo o estado de velocidade máxima produzido por scroll rápido
- **THEN** não há vão, salto ou costura visível em nenhum ponto do ciclo

#### Scenario: Queda mensurável de nós de DOM

- **WHEN** a contagem `DOM Nodes` do Performance Monitor é comparada antes e depois na mesma viewport
- **THEN** ela cai proporcionalmente às cópias removidas

### Requirement: Camadas de composição existem enquanto há o que compor

Promoção a camada de composição SHALL existir enquanto o elemento promovido tem conteúdo em movimento, e SHALL ser liberada quando não tem.

`will-change: transform` permanente reserva memória de GPU pela vida inteira da página. Num elemento que segura frames de vídeo decodificados, a reserva é grande e o conteúdo pode estar parado — a promoção passa a custar memória sem comprar nada.

Este requisito completa, e não contradiz, o requisito de escopo temporal de `will-change` estabelecido em `scroll-frame-budget`: a exceção concedida ao elemento de parallax valia enquanto sua animação era contínua, e deixa de valer quando a mídia que ele carrega pausa fora da viewport.

#### Scenario: Sem promoção permanente em elemento de mídia pausável

- **WHEN** o bloco de vídeo está fora da viewport e o vídeo está pausado
- **THEN** o elemento interno de parallax não declara `will-change`

#### Scenario: A promoção antecede a visibilidade

- **WHEN** o bloco de vídeo se aproxima da viewport durante o scroll
- **THEN** a promoção acontece antes de o elemento se tornar visível, e não há pop, piscada ou serrilhado no primeiro frame visível

#### Scenario: O parallax mantém a mesma amplitude

- **WHEN** o bloco de vídeo atravessa a viewport de baixo para cima
- **THEN** o deslocamento vertical do vídeo tem a mesma amplitude e a mesma suavidade de hoje

#### Scenario: Queda mensurável de memória de GPU

- **WHEN** a coluna *GPU memory* do Chrome Task Manager é comparada antes e depois, com a página rolada para longe do bloco de vídeo
- **THEN** ela é menor depois

### Requirement: O custo de memória é medido no instrumento que o enxerga

Cada item desta capability SHALL apresentar um antes/depois medido em desktop, no protocolo fixo registrado na baseline da change, usando Performance Monitor, Chrome Task Manager e heap snapshots comparativos.

Ferramentas de auditoria de carregamento SHALL NOT ser usadas como evidência aqui: elas observam os primeiros segundos de uma página e vão embora, e o regime que esta capability governa é o que sobra depois.

Um item que não apresentar ganho mensurável no instrumento correto SHALL ser revertido, e não defendido por argumento teórico.

#### Scenario: Protocolo reprodutível registrado

- **WHEN** um item desta capability é avaliado
- **THEN** a medida foi tirada no mesmo protocolo da baseline — build de produção, aba anônima, `/pt`, viewport fixa, três regimes cronometrados — e está registrada em `baseline.md`

#### Scenario: Item sem ganho é revertido

- **WHEN** a medição de fecho mostra que um item não produziu diferença mensurável
- **THEN** ele é revertido, e a reversão fica registrada com o número que a motivou

### Requirement: A redução de memória não remove conteúdo nem efeito

Nenhum item desta capability SHALL remover conteúdo da página, reduzir a quantidade de informação apresentada, ou enfraquecer um efeito visual.

Cortar cópias de um laço não é cortar depoimentos: os mesmos depoimentos continuam todos presentes e todos passando pela tela. Liberar uma camada não é remover o parallax. Se um item só rende memória ao custo do que o usuário vê, ele SHALL ser revertido.

#### Scenario: Todos os depoimentos continuam aparecendo

- **WHEN** uma coluna de depoimentos completa um ciclo inteiro do laço
- **THEN** todos os depoimentos publicados no CMS aparecem nele, na mesma ordem

#### Scenario: Inventário de movimento preservado

- **WHEN** a lista de efeitos da página é percorrida após a implementação
- **THEN** cursor, halo do hero, marquee, parallax, revelações, transição de página, swap de texto e magnetismo continuam presentes com o mesmo comportamento aparente

#### Scenario: `prefers-reduced-motion` continua respeitado

- **WHEN** a preferência de movimento reduzido está ativa
- **THEN** cada componente tocado por esta capability mantém exatamente o caminho degradado que já tinha
