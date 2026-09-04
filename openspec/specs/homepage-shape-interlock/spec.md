# homepage-shape-interlock Specification

## Purpose

O recorte entrelaçado entre o bloco de vídeo (`.video_shape`) e o bloco escuro de serviços (`.services_shape`) na home — a largura do respiro entre eles, o comportamento dos cantos, e como o recorte acompanha os breakpoints e a altura do conteúdo vindo do CMS.

## Requirements

### Requirement: Respiro uniforme entre os shapes entrelaçados

O recorte entre `.video_shape` e `.services_shape` SHALL manter uma faixa de respiro de largura constante de **18px** ao longo de todo o contorno compartilhado, nos três trechos do encaixe: a borda inferior do corpo do vídeo, a borda vertical entre a aba do vídeo e o entalhe do serviços, e a borda inferior da aba do vídeo.

Os 18px derivam do espaçamento já existente entre a base do corpo do vídeo (`y=390` no path) e o topo do bloco de serviços (`sm:pt-102` = 408px). Esse trecho SHALL permanecer como está e ser a referência para os outros dois.

#### Scenario: Trecho horizontal superior

- **WHEN** a página é renderizada em qualquer viewport a partir de 768px
- **THEN** a distância vertical entre a borda inferior do corpo do vídeo e a borda superior do painel esquerdo do bloco de serviços é de 18px

#### Scenario: Trecho vertical

- **WHEN** a página é renderizada em qualquer viewport a partir de 768px
- **THEN** a distância horizontal entre a borda esquerda da aba do vídeo e a borda direita do entalhe do bloco de serviços é de 18px

#### Scenario: Trecho horizontal inferior

- **WHEN** a página é renderizada em qualquer viewport a partir de 768px
- **THEN** a distância vertical entre a borda inferior da aba do vídeo e a borda superior do painel direito do bloco de serviços é de 18px

#### Scenario: Consistência entre breakpoints

- **WHEN** o viewport é redimensionado atravessando os breakpoints `md` (768px), `lg` (1024px) e `xl` (1280px)
- **THEN** os três trechos medem 18px em todos eles, sem que nenhum breakpoint apresente um valor diferente dos demais

### Requirement: Cantos concêntricos no encaixe

Nos dois cantos onde a faixa de respiro muda de direção, o arco convexo de um shape e o arco côncavo correspondente do outro SHALL compartilhar o mesmo centro, de modo que a faixa mantenha 18px também na diagonal do canto e não apenas nas retas.

Isso implica que o raio do arco côncavo SHALL ser igual ao raio do arco convexo somado à largura da faixa: com raio base de 16px (`--radius-2xl`), o arco côncavo usa raio 34px.

#### Scenario: Canto superior do encaixe

- **WHEN** o contorno do vídeo passa da sua borda inferior para a borda esquerda da aba
- **THEN** o filete côncavo do vídeo (raio 34) e o canto convexo do painel esquerdo do bloco de serviços (raio 16) são concêntricos, e a faixa branca entre eles mede 18px em toda a curva

#### Scenario: Canto inferior do encaixe

- **WHEN** o contorno do vídeo passa da borda esquerda da aba para a sua borda inferior
- **THEN** o canto convexo do vídeo (raio 16) e o filete côncavo do painel direito do bloco de serviços (raio 34) são concêntricos, e a faixa branca entre eles mede 18px em toda a curva

#### Scenario: Contorno sem artefatos

- **WHEN** qualquer um dos seis `path()` é inspecionado
- **THEN** todo comando de arco descreve um quarto de círculo cujos extremos estão a exatamente um raio de distância do centro em cada eixo, e não existe nenhum segmento que retroceda sobre o traçado anterior

### Requirement: Largura do path acompanha a largura real do elemento

O recorte SHALL ser indiferente à largura que o elemento assume. Nenhum `path()` SHALL terminar em uma coordenada horizontal que pretenda representar a largura do elemento.

A largura útil dos blocos é fluida — a `section` usa `px-4 xl:px-0` sobre um `container` limitado a 80rem, de modo que ela vale `min(1280, vw) − 32` abaixo de `xl` e `1280` a partir dele. Um `path()` desenhado para a largura exata de um breakpoint só coincide com o elemento no primeiro pixel daquele breakpoint; em qualquer largura maior dentro da mesma faixa o browser descarta a parte do elemento que fica além do path, removendo os cantos arredondados daquele lado e escondendo o conteúdo que continua sendo layoutado na largura cheia.

Em `md` e `lg`, os trechos do contorno ancorados à direita SHALL se estender horizontalmente além de qualquer largura plausível, e o arredondamento das bordas direitas SHALL ser responsabilidade do `border-radius` do elemento — o mesmo recurso já usado no eixo vertical para acomodar a altura vinda do CMS.

Onde um canto arredondado visível NOT coincidir com um canto do box do elemento, ele SHALL ser restaurado por outro meio que não dependa da largura, e SHALL ser visualmente indistinguível de um canto produzido por `border-radius`.

Em `xl` as duas larguras são fixas por outros meios — o vídeo por uma classe de largura e o bloco de serviços pelo teto de 80rem do `container` — e o `path()` SHALL permanecer com coordenadas finitas nessa faixa.

#### Scenario: Nenhum conteúdo amputado em largura intermediária

- **WHEN** a página é renderizada em qualquer viewport entre 768px e 1279px, incluindo 900px, 960px, 1023px, 1150px e 1279px
- **THEN** o fundo escuro do bloco de serviços e o bloco de vídeo se estendem até a borda direita da área útil da `section`
- **AND** nenhum texto, card de serviço ou elemento do grid é renderizado fora da superfície escura

#### Scenario: Cantos direitos do vídeo preservados em md

- **WHEN** a página é renderizada em um viewport entre 768px e 1023px
- **THEN** os cantos superior direito e inferior direito do bloco de vídeo aparecem arredondados em 16px, e não cortados em ângulo reto

#### Scenario: Cantos direitos do vídeo preservados em lg

- **WHEN** a página é renderizada em um viewport entre 1024px e 1279px
- **THEN** os cantos superior direito e inferior direito do bloco de vídeo aparecem arredondados em 16px, e não cortados em ângulo reto

#### Scenario: Canto superior direito do painel direito de serviços

- **WHEN** a página é renderizada em qualquer viewport a partir de 768px
- **THEN** o canto onde a borda superior do painel direito do bloco de serviços encontra a borda direita da área útil aparece arredondado em 16px

#### Scenario: Redimensionamento contínuo

- **WHEN** o viewport é redimensionado continuamente de 768px até 1600px
- **THEN** a borda direita dos dois blocos acompanha a borda da área útil em todo o percurso, sem nenhuma largura em que o recorte fique aquém dela

### Requirement: Recorte independente da altura do conteúdo

O `clip-path` do `.services_shape` SHALL NOT depender de uma altura fixa em pixels. O recorte SHALL cobrir qualquer altura que o bloco venha a assumir conforme o conteúdo vindo do Payload cresce ou encolhe.

O arredondamento dos cantos inferiores SHALL ser responsabilidade do `border-radius` já aplicado ao elemento, e não do `path()`.

#### Scenario: Conteúdo cresce além da altura originalmente estimada

- **WHEN** um projeto, serviço ou depoimento é adicionado no Payload, aumentando a altura do bloco de serviços
- **THEN** o fundo escuro acompanha o conteúdo até o fim, sem ser cortado pelo recorte

#### Scenario: Cantos inferiores arredondados

- **WHEN** o bloco de serviços é renderizado em qualquer altura
- **THEN** os cantos inferior esquerdo e inferior direito aparecem arredondados em 16px

### Requirement: Encaixe estável acima de 1280px

O encaixe SHALL manter sua geometria em viewports acima de 1280px.

A largura do bloco que contém os dois shapes SHALL permanecer limitada a 1280px a partir de `xl`, de forma que o `path()` de `xl` continue correspondendo à largura real dos elementos. Esse teto já é garantido pelo `@utility container { max-width: 80rem }` em `globals.css`; o requisito existe para que uma futura alteração nesse override não quebre o encaixe silenciosamente.

#### Scenario: Viewport largo

- **WHEN** a página é renderizada em um viewport de 1600px ou mais
- **THEN** o encaixe entre os dois shapes tem a mesma aparência que em 1280px, com os 18px de respiro preservados e nenhum canto cortado

### Requirement: Faixas sem entalhe permanecem inalteradas

Abaixo de 768px NOT SHALL existir encaixe entrelaçado, e o bloco de vídeo NOT SHALL ser exibido.

A visibilidade do bloco de vídeo SHALL coincidir com a faixa em que a geometria de encaixe existe. Exibi-lo em uma faixa sem geometria produz sobreposição: o vídeo tem 470px de altura e o bloco de serviços começa em 408px, de modo que os últimos 62px do vídeo ficam atrás do bloco escuro, sem a faixa branca de respiro que define o encaixe.

#### Scenario: Abaixo de sm

- **WHEN** a página é renderizada em um viewport menor que 640px
- **THEN** o bloco de vídeo permanece oculto e o bloco de serviços é um retângulo com cantos arredondados, sem entalhe

#### Scenario: Entre sm e md

- **WHEN** a página é renderizada em um viewport entre 640px e 767px
- **THEN** o bloco de vídeo permanece oculto
- **AND** o bloco de serviços é um retângulo com cantos arredondados, sem entalhe
- **AND** não existe espaço vertical reservado acima do bloco de serviços para um vídeo que não é exibido

#### Scenario: Transição em 768px

- **WHEN** o viewport cruza 768px
- **THEN** o bloco de vídeo passa a ser exibido no mesmo ponto em que a geometria de encaixe entra em vigor
- **AND** não existe nenhuma largura em que o vídeo esteja visível sobrepondo o bloco de serviços sem a faixa de respiro de 18px
