## ADDED Requirements

### Requirement: Um commit pertence a no máximo uma change

Cada commit SHALL ser atribuível a exatamente uma change de OpenSpec, ou declarar-se explicitamente como não pertencente a nenhuma (ruído de dependência, saída de gerador, ajuste de ferramenta).

Quando um arquivo carrega hunks de mais de uma change, os hunks SHALL ser separados por origem antes do commit. Um arquivo compartilhado não é justificativa para um commit compartilhado.

A razão é operacional, não estética: a change de performance registrou um antes/depois medido por item. Se uma regressão aparecer depois, `git bisect` só devolve a causa se os itens estiverem em commits distintos. Um commit que mistura três assuntos transforma essa medição em anedota.

#### Scenario: Arquivo tocado por duas changes

- **WHEN** um arquivo contém hunks originados de changes distintas
- **THEN** cada conjunto de hunks é commitado separadamente, e cada commit referencia apenas a sua change

#### Scenario: Atribuição de todo commit da sequência

- **WHEN** os commits produzidos por esta change são percorridos
- **THEN** cada um nomeia a change a que pertence, ou se declara ruído sem change

#### Scenario: Itens medidos ficam isoláveis

- **WHEN** os commits de `optimize-landing-performance` são inspecionados
- **THEN** cada item com ganho medido em `baseline.md` corresponde a um commit próprio, de modo que reverter um item não arrasta os demais

### Requirement: Alterações geradas e bumps de dependência não viajam com trabalho autoral

Reformatação produzida por gerador de código e atualizações de dependência SHALL ocupar commits próprios, separados de qualquer mudança escrita à mão.

Na árvore atual isso alcança dois casos concretos: o bump de `next` 16.2.6 → 16.3.2 com as 762 linhas de lockfile que o acompanham, e a reformatação de uniões em `payload-types.ts`, que é saída de `payload generate:types` e não decisão de ninguém.

Misturar os dois com trabalho autoral produz um commit cujo diff é dominado por ruído, onde a mudança real fica invisível na revisão.

#### Scenario: Bump de dependência

- **WHEN** `package.json` e seu lockfile mudam por atualização de versão
- **THEN** essa mudança ocupa um commit que não contém nenhuma alteração de `src/`

#### Scenario: Saída de gerador

- **WHEN** `payload-types.ts` muda apenas por reformatação, sem mudança de schema
- **THEN** essa mudança ocupa um commit próprio, identificado como churn de gerador

### Requirement: Todo commit da sequência é verificável isoladamente

Cada commit SHALL deixar o repositório num estado que compila. Nenhum commit da sequência pode depender de um commit posterior para que `next build` tenha sucesso.

Esta é a restrição que a separação de hunk mais facilmente viola: separar um `import` de seu uso, ou remover uma prop antes de atualizar quem a passa, produz um commit intermediário quebrado — que só é descoberto quando alguém faz bisect ou checkout naquele ponto, exatamente quando o custo é maior.

#### Scenario: Build em cada ponto da sequência

- **WHEN** a sequência de commits é percorrida um a um
- **THEN** `next build` tem sucesso em cada um deles

#### Scenario: Troca de API e seus call sites

- **WHEN** a assinatura de `Button` ou `Badge` muda junto com os call sites que a consomem
- **THEN** a mudança e os call sites estão no mesmo commit, nunca separados

### Requirement: Nenhum trabalho é deixado fora do histórico

Ao final da sequência, a árvore de trabalho SHALL estar sem alterações não commitadas de código de aplicação, exceto o que for deliberadamente declarado como descartado.

Trabalho não commitado não tem backup, não sobrevive a um `stash pop` malsucedido e desaparece sem aviso. Duas das três changes em curso estão incompletas (58/60 e 34/49); a incompletude é razão para marcar o commit como trabalho em andamento, não para deixá-lo fora do histórico.

#### Scenario: Árvore ao final da sequência

- **WHEN** todos os commits planejados foram criados
- **THEN** `git status` não reporta modificações pendentes em `src/`, e o índice está vazio

#### Scenario: Change incompleta

- **WHEN** o trabalho de uma change que ainda tem tarefas pendentes é commitado
- **THEN** a mensagem do commit declara que a change está em andamento e informa seu progresso

### Requirement: PRs dependentes são abertos em ordem, não em paralelo

Quando o trabalho novo não puder ser revisado sem uma base que ainda não chegou ao alvo, os PRs SHALL ser abertos em sequência, e o segundo apenas após o merge do primeiro.

Aqui a dependência é estrutural, não uma preferência: o branch está 41 commits à frente de `origin/main`, e entre eles está o commit que criou as animações que a change de performance otimiza. Um PR de performance contra `main` não teria base onde aplicar.

#### Scenario: Primeiro PR

- **WHEN** a sequência de commits está pronta
- **THEN** o primeiro PR leva a `main` os commits preexistentes que nunca foram revisados, e não inclui o trabalho novo

#### Scenario: Segundo PR

- **WHEN** o primeiro PR foi mergeado
- **THEN** o segundo PR é aberto com o trabalho novo, sobre uma `main` que já contém a base

#### Scenario: Primeiro PR ainda aberto

- **WHEN** o primeiro PR ainda não foi mergeado
- **THEN** o segundo não é aberto

### Requirement: Um PR declara o que nele não foi verificado

A descrição de um PR que contenha trabalho parcialmente verificado SHALL listar explicitamente o que **não** foi verificado, com o mesmo destaque dado aos resultados.

Um PR que apresenta "LCP 22,3 s → 4,5 s" sem dizer que a camada 2 não foi conferida visualmente nem instrumentada por trace está pedindo uma aprovação que o trabalho ainda não sustenta. O número medido e a lacuna de verificação são a mesma informação; separá-los é o que transforma um resumo em propaganda.

#### Scenario: PR com resultados medidos

- **WHEN** a descrição do PR apresenta ganhos de performance medidos
- **THEN** ela também lista as verificações pendentes, incluindo as conferências visuais e o trace de scroll que ainda não foram feitos

#### Scenario: PR com change incompleta

- **WHEN** o PR contém trabalho de uma change que não está com todas as tarefas concluídas
- **THEN** a descrição informa o progresso dessa change e o que falta para fechá-la
