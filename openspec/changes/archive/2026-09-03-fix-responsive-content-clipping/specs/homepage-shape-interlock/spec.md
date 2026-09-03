## MODIFIED Requirements

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
