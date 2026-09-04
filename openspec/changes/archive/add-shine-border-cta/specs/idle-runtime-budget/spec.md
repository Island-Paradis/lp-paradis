## ADDED Requirements

### Requirement: Movimento decorativo permanente é uma excepção declarada e limitada

Esta capability estabelece que ficar ocioso é o estado de repouso. Uma animação decorativa que corre sem parar contraria esse princípio, e SHALL ser tratada como excepção — nomeada, delimitada e justificada — em vez de entrar por omissão.

Uma excepção SHALL cumprir todas as condições seguintes:

- **Declarativa.** O movimento SHALL vir de animação CSS. SHALL NOT usar `requestAnimationFrame`, SHALL NOT assinar o frameloop da biblioteca de animação, e SHALL NOT depender de estado de React que mude por frame. As condições de repouso que os outros requisitos desta capability impõem falam do agendamento de frames pela aplicação; uma animação CSS não o toca, e é isso que a torna elegível.
- **Delimitada por rota.** SHALL existir apenas nas rotas onde é pedida explicitamente por um call site, e SHALL NOT ser ligada por defeito em nenhum componente partilhado.
- **Delimitada por elemento.** SHALL cobrir uma área pequena e fixa. A área que repinta por frame é o custo real da excepção, e uma animação de fundo à escala da viewport não é o mesmo caso que um anel de um pixel em torno de um botão.
- **Degradável.** SHALL parar sob `prefers-reduced-motion: reduce`, e SHALL parar sem alterar o layout.

O inventário de excepções em vigor SHALL ser rastreável a partir das capabilities que as introduzem, para que uma auditoria de custo ocioso encontre a justificação em vez de encontrar um repaint inexplicado. A excepção em vigor introduzida por `add-shine-border-cta` é o anel animado do botão de submissão de `/get-quote`, especificado em `cta-shine-border`.

Uma animação permanente que não cumpra as quatro condições SHALL ser reformulada para um gatilho reactivo — hover, foco, entrada em viewport ou estado de pedido em curso — e não negociada como excepção.

#### Scenario: A excepção não agenda frames

- **WHEN** `/get-quote` está aberta, o ponteiro está parado e o frameloop da aplicação é inspecionado
- **THEN** não há nenhuma assinatura originada pela animação de excepção
- **AND** as garantias de repouso do `SmoothScroll` e das restantes animações permanecem as de hoje

#### Scenario: A excepção não sai da sua rota

- **WHEN** a home e as restantes rotas são percorridas
- **THEN** nenhuma animação permanente decorativa está a correr
- **AND** o cenário de CPU em regime parado da home permanece verdadeiro

#### Scenario: A excepção para sob movimento reduzido

- **WHEN** `/get-quote` é aberta com `prefers-reduced-motion: reduce`
- **THEN** a animação de excepção está imóvel
- **AND** o layout da página é o mesmo que sem a preferência

#### Scenario: Aba oculta não paga a excepção

- **WHEN** o utilizador troca de aba com `/get-quote` aberta
- **THEN** nenhum repaint da animação de excepção é produzido enquanto a aba está oculta

#### Scenario: Uma excepção nova é justificada antes de entrar

- **WHEN** se propõe uma animação decorativa permanente nova
- **THEN** as quatro condições são verificadas item por item na change que a introduz
- **AND** uma condição não cumprida leva o efeito a um gatilho reactivo, em vez de alargar a excepção
