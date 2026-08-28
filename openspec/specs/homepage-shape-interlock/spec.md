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

Cada `path()` SHALL ser desenhado para a largura em pixels que o elemento efetivamente ocupa no seu breakpoint, considerando o padding horizontal da `section` que o contém.

A `section` usa `px-4 xl:px-0`, de modo que a largura útil é a largura do `container` menos 32px em `md` e `lg`, e a largura cheia em `xl`. Um path mais largo que o elemento faz o browser descartar a parte excedente, removendo silenciosamente os cantos arredondados daquele lado.

#### Scenario: Cantos direitos do vídeo preservados em md

- **WHEN** a página é renderizada em um viewport entre 768px e 1023px
- **THEN** os cantos superior direito e inferior direito do bloco de vídeo aparecem arredondados, e não cortados em ângulo reto

#### Scenario: Cantos direitos do vídeo preservados em lg

- **WHEN** a página é renderizada em um viewport entre 1024px e 1279px
- **THEN** os cantos superior direito e inferior direito do bloco de vídeo aparecem arredondados, e não cortados em ângulo reto

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

O comportamento abaixo de 768px SHALL permanecer exatamente como está hoje.

#### Scenario: Abaixo de sm

- **WHEN** a página é renderizada em um viewport menor que 640px
- **THEN** o bloco de vídeo permanece oculto e o bloco de serviços é um retângulo com cantos arredondados, sem entalhe

#### Scenario: Entre sm e md

- **WHEN** a página é renderizada em um viewport entre 640px e 767px
- **THEN** os dois blocos aparecem empilhados como retângulos com cantos arredondados, sem entalhe entre eles
