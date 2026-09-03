## MODIFIED Requirements

### Requirement: Preferência por movimento reduzido é respeitada sem custo de visibilidade

Quando `prefers-reduced-motion` estiver ativo, as primitivas SHALL apresentar um resultado de movimento reduzido, e esse resultado SHALL estar sujeito às mesmas garantias de visibilidade dos demais.

O mecanismo SHALL ser CSS sobre o markup do caminho de movimento completo. As primitivas não SHALL consultar a preferência para decidir o que renderizar: a árvore emitida é a mesma com a preferência ativa ou inativa, e o que muda é a neutralização do deslocamento por regra de CSS. Nenhuma primitiva SHALL manter um subtree alternativo escolhido em JavaScript para o caminho reduzido.

O resultado observável sob movimento reduzido SHALL ser ausência de deslocamento. A máscara de recorte continua presente no DOM, porque o markup é o mesmo — mas nenhum elemento SHALL estar deslocado para fora da sua máscara, de modo que a máscara não recorta nada. A ausência de animação neste estado é esperada e aceitável: onde o caminho de movimento completo anima apenas deslocamento, neutralizá-lo deixa o elemento em seu estado final desde a primeira pintura, sem transição.

#### Scenario: Movimento reduzido com JavaScript ativo

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` e o React hidrata normalmente
- **THEN** os textos aparecem sem deslocamento e todo o conteúdo textual é legível

#### Scenario: Movimento reduzido sem JavaScript

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` e o JavaScript não executa
- **THEN** todo o conteúdo textual é legível

#### Scenario: Sinal de vivacidade do React sob movimento reduzido

- **WHEN** a home é carregada com `prefers-reduced-motion: reduce` e o React hidrata normalmente
- **THEN** o sinal de que o React está vivo é emitido, e o mecanismo de segurança de visibilidade não é acionado

#### Scenario: Markup idêntico com e sem a preferência

- **WHEN** o HTML entregue pelo servidor para a home é comparado entre uma carga com `prefers-reduced-motion: reduce` e uma sem
- **THEN** os dois são idênticos, incluindo a presença das máscaras por palavra e os valores de `style` inline do estado inicial

#### Scenario: Palavras mascaradas sob movimento reduzido

- **WHEN** um título renderizado por `TextReveal` é exibido com `prefers-reduced-motion: reduce` ativo
- **THEN** cada palavra está dentro da sua máscara em deslocamento nulo, com o texto completo legível, e não há animação de entrada

#### Scenario: Ausência de subtree alternativo

- **WHEN** as primitivas de revelação e os componentes que animam por variants próprios são inspecionados
- **THEN** nenhum deles contém uma ramificação de renderização condicionada à preferência de movimento
