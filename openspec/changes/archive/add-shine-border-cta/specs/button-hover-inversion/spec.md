## MODIFIED Requirements

### Requirement: Nenhuma camada do botão iguala o que está atrás dela

Num `Button` com `textSwap`, cada camada visível — contorno, disco do `circleIcon`, glifo do ícone e rótulo — SHALL manter cor distinta da superfície imediatamente atrás de si, em repouso e em hover. A superfície atrás do contorno é o fundo da página; a superfície atrás do disco e do rótulo é o preenchimento do botão no instante considerado.

A invariante SHALL cobrir também o anel animado que a prop `shine` insere, quando presente. A superfície atrás do anel é o preenchimento do botão no instante considerado — o preenchimento de repouso da variante antes do hover, e o painel que sobe depois —, pelo que a cor do anel tem de contrastar com os dois. Um anel da cor do painel desaparece exactamente no momento em que o botão está a ser olhado.

O anel SHALL cumprir essa condição por duas vias combinadas, e não por uma cor derivada da variante. A primeira é a paleta ser independente das duas superfícies, especificada em `cta-shine-border`; uma cor afinada contra o preenchimento de repouso é, por construção, a cor do painel que sobe, e falha nas quatro variantes ao mesmo tempo. A segunda é o ajuste de luminosidade em hover, e é a que esta tabela passa a carregar.

O `SwapInvert` SHALL ganhar um quinto campo obrigatório para esse ajuste. A razão é a que o comentário da tabela já dá: os campos são obrigatórios para que uma variante nova falhe a compilação em vez de ficar com a cor fixa de repouso durante o hover. O anel é a quinta camada e passa a estar sob a mesma disciplina — uma variante cujo painel não custe contraste ao anel declara isso explicitamente, em vez de o omitir.

O anel SHALL ser empilhado acima do painel de preenchimento e abaixo do conteúdo. Abaixo do painel seria coberto por ele, que é dimensionado à caixa inteira; acima do conteúdo pintaria gradiente sobre os glifos do rótulo.

Esta é a invariante transversal da capability. Os requisitos seguintes são as suas aplicações concretas.

#### Scenario: Disco do ícone contra o preenchimento que sobe

- **WHEN** um botão com `circleIcon` e `textSwap` está em hover e o painel de preenchimento cobre o botão
- **THEN** o disco do ícone tem cor diferente do preenchimento
- **AND** o glifo dentro do disco tem cor diferente do disco

#### Scenario: Contorno contra o fundo da página

- **WHEN** o preenchimento de hover de uma variante tem a mesma cor que o fundo da secção onde o botão vive
- **THEN** o contorno do botão em hover tem cor distinta desse fundo, de modo que a silhueta do botão permanece delimitada

#### Scenario: Nenhuma camada é declarada uma vez e esquecida

- **WHEN** uma variante é adicionada ou alterada no mapa de inversão
- **THEN** a variante declara explicitamente o comportamento de hover de cada camada que possui, o anel incluído
- **AND** uma camada sem declaração não herda uma cor fixa que possa coincidir com o preenchimento

#### Scenario: Variante nova sem ajuste de anel falha a compilação

- **WHEN** uma variante é acrescentada ao mapa de inversão sem declarar o campo do anel
- **THEN** o projeto não compila
- **AND** o erro aponta o campo em falta, em vez de a omissão passar como «sem ajuste»

#### Scenario: Anel contra as duas superfícies que o botão tem

- **WHEN** um botão com `shine` e `textSwap` é observado em repouso e depois em hover, com o painel a cobrir a caixa
- **THEN** o anel é distinguível do preenchimento nos dois instantes
- **AND** não há nenhum instante da subida em que o anel desapareça

#### Scenario: Ordem de empilhamento do anel

- **WHEN** as camadas de um botão com `shine` e `textSwap` são inspecionadas
- **THEN** o anel está acima do painel de preenchimento
- **AND** está abaixo do rótulo e do ícone

### Requirement: Botões sem textSwap mantêm o comportamento actual

Botões sem `textSwap` SHALL manter exactamente o hover que a `cva` já define, sem painel de preenchimento e sem inversão de ícone. A capability cobre apenas o caminho `textSwap`.

A prop `shine` SHALL NOT abrir esse caminho. Ligar `shine` num botão sem `textSwap` insere o anel e mais nada: nenhum painel de preenchimento, nenhum rótulo em duas cópias, nenhuma regra de inversão de ícone ou de contorno. As duas props são camadas independentes e SHALL poder ser combinadas em qualquer sentido, incluindo nenhuma das duas.

#### Scenario: Botão do rodapé não muda

- **WHEN** o botão `outline-inverted` do `Footer`, que não usa `textSwap`, entra em hover
- **THEN** o seu fundo passa a `bg-white/40` como antes
- **AND** nenhuma regra de inversão de ícone ou de contorno é aplicada

#### Scenario: Botão com asChild não ganha camadas

- **WHEN** um botão é renderizado com `asChild`
- **THEN** nenhum painel de preenchimento nem `<span>` de ícone é inserido
- **AND** o filho único exigido pelo `Slot` é preservado

#### Scenario: `shine` sem `textSwap` não activa a inversão

- **WHEN** um botão é renderizado com `shine` e sem `textSwap`, e o cursor entra
- **THEN** o hover é o que a `cva` define para aquela variante
- **AND** não sobe nenhum painel de preenchimento
- **AND** o anel continua a animar por cima desse hover

#### Scenario: `asChild` continua a não ganhar camada nenhuma

- **WHEN** um botão é renderizado com `asChild` e `shine`
- **THEN** nenhuma camada de anel é inserida, pelo mesmo motivo mecânico que exclui as camadas de inversão
- **AND** o filho único é preservado
