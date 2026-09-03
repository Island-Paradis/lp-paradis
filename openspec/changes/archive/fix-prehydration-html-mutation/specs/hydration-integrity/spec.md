## ADDED Requirements

### Requirement: Mutação intencional do DOM antes da hidratação é declarada no elemento mutado

Um script que precise correr antes da primeira pintura MAY alterar o DOM que o React vai hidratar, quando essa alteração for o próprio propósito do script e não puder ser adiada para depois da montagem. Onde isso acontecer, o elemento alterado SHALL declarar a supressão de aviso de hidratação do React.

A supressão SHALL ser aplicada no elemento efetivamente mutado, e não em um ancestral que o contenha. O React consulta a prop nas props do próprio elemento e ela não alcança descendentes — aplicá-la mais acima do que o necessário amplia a área cega sem cobrir nada a mais.

A justificativa SHALL enumerar quais atributos daquele elemento passam a ficar sob a supressão, e não apenas afirmar que ela é intencional. A enumeração é o que permite a quem adicionar um atributo novo perceber que ele entrou numa região onde o React deixou de avisar.

Esta permissão SHALL NOT ser lida como autorização para silenciar divergência de hidratação em geral. Ela cobre um caso estreito e verificável: o DOM está adiantado em relação à árvore do React porque alguém o adiantou de propósito, e "corrigir" a divergência quebraria a função que a mutação cumpre.

#### Scenario: Console limpo com o script de failsafe ativo

- **WHEN** a home é carregada em desenvolvimento, o script inline de failsafe corre durante o parse e escreve no elemento raiz, e o React hidrata
- **THEN** o console não registra aviso de divergência de atributos, e o atributo escrito pelo script permanece no DOM

#### Scenario: A classe escrita antes da hidratação sobrevive

- **WHEN** o React termina de hidratar uma página em que o script de failsafe já marcou o elemento raiz
- **THEN** a marca continua presente, e a rede de segurança de visibilidade continua desligada como no caminho feliz

#### Scenario: Supressão no elemento mutado, não em ancestral

- **WHEN** os elementos que declaram supressão de aviso de hidratação são inspecionados
- **THEN** cada um é um elemento efetivamente mutado antes da hidratação, e nenhum é um ancestral declarando supressão em nome de um descendente

#### Scenario: Justificativa enumera a área coberta

- **WHEN** a justificativa de uma supressão é lida
- **THEN** ela nomeia os atributos daquele elemento que passam a não ser mais verificados pelo React

#### Scenario: Divergência não intencional continua reportada

- **WHEN** um componente de cliente diverge do servidor em um elemento que não sofreu mutação pré-hidratação
- **THEN** o React reporta a divergência normalmente, sem ser afetado pela supressão declarada em outro elemento
