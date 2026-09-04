## ADDED Requirements

### Requirement: O repositório SHALL fornecer um comando de medição de build a frio

MUST existir um script versionado que execute o build da imagem sem cache e registre o tempo decorrido por step do `Dockerfile`.

Sem medição, "ficou mais rápido" é impressão. A hipótese central desta mudança — que o custo está em movimentação de `node_modules` e em cache descartado, não na compilação — só é falsificável com números por step.

#### Scenario: Execução produz tempos por step

- **WHEN** o script de medição é executado
- **THEN** ele constrói a imagem com cache desabilitado e saída de progresso legível
- **AND** o resultado atribui uma duração a cada step do `Dockerfile`

#### Scenario: Execução falha visivelmente

- **WHEN** o build invocado pelo script falha
- **THEN** o script termina com código de saída diferente de zero
- **AND** a saída do build que falhou é preservada no relatório

### Requirement: Cada medição SHALL ser gravada como um relatório comparável

O script MUST gravar um relatório por execução, sem sobrescrever execuções anteriores, contendo o commit medido, o tempo total e a duração por step.

Duas execuções só são comparáveis se ambas ficarem legíveis lado a lado e cada uma disser a que código se refere.

#### Scenario: Relatórios de execuções distintas coexistem

- **WHEN** o script é executado duas vezes
- **THEN** existem dois relatórios distintos
- **AND** nenhum sobrescreveu o outro

#### Scenario: Relatório identifica o que foi medido

- **WHEN** um relatório é lido
- **THEN** ele registra o commit do repositório no momento da medição
- **AND** registra o tempo total do build

### Requirement: Os relatórios de medição MUST NOT entrar no controle de versão nem no contexto de build

A saída da medição MUST ser ignorada pelo git e pelo `.dockerignore`.

Relatórios são específicos da máquina que mediu. Versioná-los gera ruído de diff; deixá-los no contexto de build invalida camadas — exatamente o problema que esta mudança corrige.

#### Scenario: Relatório não aparece como alteração pendente

- **WHEN** o script é executado num repositório limpo
- **THEN** `git status` continua limpo

#### Scenario: Relatório não altera o contexto de build

- **WHEN** o script é executado e em seguida um novo build roda sem `--no-cache`
- **THEN** a existência dos relatórios não invalida a camada do `COPY` do código-fonte

### Requirement: A medição SHALL registrar a plataforma em que rodou

O relatório MUST registrar a arquitetura do host e a plataforma alvo da imagem construída.

Um build sob emulação QEMU custa múltiplos do nativo. Sem a plataforma no relatório, uma medição lenta é ambígua entre "o `Dockerfile` está ruim" e "o host está emulando" — e essa investigação está fora do escopo desta mudança justamente porque o relatório precisa vir primeiro.

#### Scenario: Relatório expõe arquitetura de host e alvo

- **WHEN** um relatório é lido
- **THEN** ele registra a arquitetura do host que executou o build
- **AND** registra a plataforma da imagem produzida
