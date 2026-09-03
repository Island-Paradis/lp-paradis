# idle-runtime-budget Specification

## Purpose

O que a página tem permissão de custar quando nada está acontecendo — loops de animação que continuam agendados sem trabalho, animação fora da viewport que é ignorada em vez de desassinada, e mídia com reprodução automática que não pausa. Cobre a camada 1.

_Introduzida por `cut-sustained-runtime-cost`, sincronizada ao arquivar._

## Requirements

### Requirement: A página ociosa não mantém trabalho agendado

Quando não há nada em movimento na viewport e o ponteiro está parado, a página SHALL NOT manter nenhum `requestAnimationFrame` pendente originado da aplicação ou de suas bibliotecas de animação.

Um loop de animação que se reagenda incondicionalmente não fica barato por ter guards no corpo: o custo de acordar a thread principal 60 vezes por segundo é pago antes de o guard ser lido. Numa aba deixada aberta, esse custo é a soma de tudo o que a página fez pelo tempo em que existiu.

Ficar ocioso SHALL ser o estado de repouso, não uma otimização condicional: qualquer trabalho por frame precisa de uma razão viva para estar agendado, e SHALL se desagendar quando essa razão termina.

#### Scenario: CPU em regime parado

- **WHEN** a home é carregada em desktop, deixada parada no topo por 60 segundos, sem scroll e sem movimento do ponteiro
- **THEN** o `CPU usage` do Performance Monitor permanece indistinguível de zero pelo intervalo inteiro

#### Scenario: Nenhum frame pendente com a página em repouso

- **WHEN** a página está em repouso e o frameloop da biblioteca de animação é inspecionado
- **THEN** não há processo assinado mantendo o batcher acordado

#### Scenario: O trabalho retoma ao primeiro sinal

- **WHEN** o usuário rola, move o ponteiro ou traz um elemento animado para a viewport após um período de repouso
- **THEN** a animação correspondente retoma no frame seguinte, sem atraso perceptível de largada

### Requirement: Animação fora da viewport é desassinada, não ignorada

Um componente que anima por frame SHALL cancelar sua assinatura no loop de animação quando sai da viewport ou quando a aba fica oculta, e SHALL reassinar ao voltar.

Retornar cedo de dentro do callback resolve o custo do trabalho útil e não resolve o custo do agendamento — que é o que impede a thread principal de dormir. A diferença é invisível num perfil que só olha o tempo gasto dentro das funções, e é exatamente o que aparece numa aba parada.

Elementos ocultos por `display: none` em breakpoints estreitos SHALL ser tratados como fora da viewport pelo mesmo mecanismo.

#### Scenario: Marquee fora da tela não custa frames

- **WHEN** a página é rolada até que o marquee de serviços e as colunas de depoimentos estejam completamente fora da viewport
- **THEN** nenhum deles mantém assinatura no loop de animação

#### Scenario: Colunas ocultas por breakpoint não animam

- **WHEN** a home é aberta numa viewport abaixo de `md`, onde a segunda e a terceira colunas de depoimentos estão em `display: none`
- **THEN** essas colunas não assinam o loop de animação

#### Scenario: Aba oculta não anima

- **WHEN** o usuário troca para outra aba com a home aberta
- **THEN** nenhuma animação da página permanece assinada, e todas retomam ao voltar

#### Scenario: A posição é preservada através da desassinatura

- **WHEN** uma linha de marquee sai da viewport, permanece fora por pelo menos 30 segundos, e volta a entrar
- **THEN** ela retoma da posição em que parou, sem salto, sem reinício e sem um frame de avanço desproporcional

### Requirement: O scroll suave não mantém um loop próprio permanente

A biblioteca de scroll suave SHALL NOT executar seu próprio `requestAnimationFrame` auto-reagendado. Seu avanço SHALL ser conduzido pelo mesmo loop que conduz as demais animações, e apenas enquanto houver scroll em curso.

Dois loops permanentes e independentes são duas vezes o custo de agendamento e uma fonte de ordenação indefinida entre escrever a posição de scroll e lê-la. Um único loop resolve os dois, mas só entrega o ganho desta capability se ele também puder dormir.

A captura de entrada do usuário SHALL permanecer ativa enquanto o loop dorme, de modo que o primeiro gesto de scroll acorde o loop em vez de se perder.

#### Scenario: Um único loop enquanto há scroll

- **WHEN** o usuário rola a página continuamente
- **THEN** existe um único loop de `requestAnimationFrame` conduzindo tanto o scroll suave quanto as animações

#### Scenario: Nenhum loop após o scroll terminar

- **WHEN** o scroll suave termina seu easing e a página fica parada
- **THEN** o condutor do scroll se desassina e nenhum frame permanece agendado por causa dele

#### Scenario: O primeiro gesto após uma pausa longa

- **WHEN** a página fica parada por pelo menos 30 segundos e o usuário dá uma rolada curta de roda
- **THEN** o scroll começa com a mesma suavidade e a mesma resposta de hoje, sem salto de posição e sem atraso perceptível de largada

#### Scenario: `prefers-reduced-motion` continua caindo no scroll nativo

- **WHEN** a preferência de movimento reduzido está ativa
- **THEN** o scroll suave continua não sendo montado, exatamente como hoje

### Requirement: Mídia com reprodução automática pausa quando não é vista

Um elemento de mídia que reproduz automaticamente em laço SHALL pausar quando sai da viewport e quando a aba fica oculta, e SHALL retomar da posição em que parou ao voltar a ser visível.

Decodificação de vídeo é custo contínuo de CPU e de GPU que não depende de o vídeo estar sendo olhado. Um laço de vários megabytes decodificando enquanto o usuário lê o rodapé é trabalho cuja utilidade é exatamente zero, e ele dura o quanto durar a sessão.

O comportamento antes da hidratação SHALL permanecer o de hoje: o atributo de reprodução automática continua no HTML servido, e o controle é anexado por cima.

#### Scenario: Vídeo pausa fora da viewport

- **WHEN** a página é rolada até que o bloco de vídeo esteja completamente fora da viewport
- **THEN** o vídeo está pausado e não há decodificação em curso

#### Scenario: Vídeo pausa com a aba oculta

- **WHEN** o usuário troca para outra aba com o vídeo visível
- **THEN** o vídeo pausa, e retoma ao voltar para a aba

#### Scenario: Retomada sem reinício

- **WHEN** o vídeo pausa por sair da viewport e depois volta a entrar
- **THEN** ele retoma do frame em que parou, e não do início

#### Scenario: A reprodução continua parecendo automática

- **WHEN** o usuário rola até a seção de serviços pela primeira vez
- **THEN** o vídeo está tocando em laço quando ele chega, sem que nenhuma ação seja necessária

#### Scenario: O HTML servido não muda

- **WHEN** o HTML renderizado no servidor para a home é comparado com o de antes desta mudança
- **THEN** o elemento de vídeo e seu `<source media>` são idênticos, e não há aviso de divergência de hidratação no console

### Requirement: A redução de trabalho ocioso não altera o movimento percebido

Nenhum item desta capability SHALL remover, encurtar, desacelerar ou enfraquecer uma animação. O que é cortado é trabalho gasto produzindo efeito fora do campo de visão.

Esta é a mesma restrição de fechamento que `client-bundle-budget` e `scroll-frame-budget` carregam, e aqui ela é barata de honrar por construção: tudo o que esta capability desliga é, por definição, algo que ninguém está vendo. Se um item só rende performance ao custo de movimento visível, ele SHALL ser revertido, e não negociado.

#### Scenario: Inventário de movimento preservado

- **WHEN** a lista de efeitos da página é percorrida após a implementação — cursor, halo do hero, marquee de velocidade reativa ao scroll, parallax do vídeo, revelações de bloco e de palavra, transição de página, swap de texto e magnetismo dos botões
- **THEN** todos continuam presentes, com a mesma duração, a mesma curva e o mesmo alcance

#### Scenario: A reatividade do marquee à velocidade do scroll é preservada

- **WHEN** a página é rolada rápido e depois devagar com o marquee visível
- **THEN** as linhas aceleram, desaceleram e invertem de direção exatamente como hoje, incluindo a zona morta que impede oscilação em micro-scroll

#### Scenario: `prefers-reduced-motion` continua respeitado

- **WHEN** a preferência de movimento reduzido está ativa
- **THEN** cada componente tocado por esta capability mantém exatamente o caminho degradado que já tinha, incluindo a garantia de visibilidade de texto que `prevent-invisible-text` estabelece
