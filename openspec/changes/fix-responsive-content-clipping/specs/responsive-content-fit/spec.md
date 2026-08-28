## ADDED Requirements

### Requirement: Rótulos de serviço nunca truncados

Os títulos dos cards do grid de serviços SHALL ser exibidos na íntegra em qualquer largura de viewport. Nenhum título SHALL ser cortado pelo `overflow` do card.

A célula mais estreita do grid ocupa 3 de 12 colunas. Em 768px isso equivale a aproximadamente 172px de célula, dos quais restam cerca de 112px de área útil após o padding do card e o ícone — insuficiente para rótulos como "Mobile Development" e "API & Integrations" em `text-sm`. O título SHALL portanto poder ocupar mais de uma linha.

#### Scenario: Rótulo longo na célula mais estreita

- **WHEN** a página é renderizada em 768px e um card de 3 colunas contém um título que não cabe em uma linha
- **THEN** o título quebra em múltiplas linhas e é lido por completo
- **AND** nenhuma parte do texto é ocultada pelo `overflow` do card

#### Scenario: Título vindo do CMS mais longo que o fallback

- **WHEN** um serviço é editado no Payload com um título mais longo que a cópia de fallback
- **THEN** o título é exibido por completo em todas as larguras a partir de 768px

#### Scenario: Descrição acompanha o título em múltiplas linhas

- **WHEN** um título ocupa duas linhas dentro de um card
- **THEN** a descrição abaixo dele continua legível e não é cortada pela altura do card

### Requirement: Caps de medida de leitura são efetivos

Todo elemento que declara um limite de largura para controlar a medida de leitura SHALL ter um `display` em que `max-width` se aplique.

`max-width` NOT SHALL ter efeito sobre elementos inline não substituídos. Um cap declarado em um `<span>` ou `<motion.span>` sem utilitário de `display` é inerte, e o parágrafo dentro dele corre a largura inteira do container.

#### Scenario: Descrição da seção de serviços

- **WHEN** a página é renderizada em um viewport a partir de 768px
- **THEN** a descrição da seção "Our Services" respeita o limite de medida declarado e não se estende além dele

#### Scenario: Descrição do Hero

- **WHEN** a página é renderizada em qualquer viewport
- **THEN** a descrição do Hero respeita o limite de medida declarado e não se estende além dele

#### Scenario: Nenhum cap inerte remanescente

- **WHEN** o código dos componentes é inspecionado
- **THEN** nenhum utilitário `max-w-*`, `min-w-*` ou `w-*` está aplicado a um elemento que permanece inline

### Requirement: Hero legível em telas estreitas

O Hero SHALL reservar área útil suficiente para seu conteúdo em qualquer largura de viewport, incluindo as mais estreitas em uso.

O padding e a tipografia do Hero SHALL ter variantes responsivas. Valores fixos de padding aninhado somam 120px por lado em todas as larguras, o que deixa cerca de 135px de área útil em uma tela de 375px para um título dimensionado em 60px.

#### Scenario: Viewport de 375px

- **WHEN** a página é renderizada em um viewport de 375px
- **THEN** o título do Hero é exibido por completo, sem estourar horizontalmente e sem sobrepor os elementos vizinhos
- **AND** a área útil disponível para o conteúdo é suficiente para que o título ocupe no máximo o número de linhas previsto no design mobile

#### Scenario: Botões de CTA em telas estreitas

- **WHEN** a página é renderizada em um viewport de 375px com os dois CTAs presentes
- **THEN** os rótulos dos dois botões são exibidos por completo
- **AND** os botões não estouram a largura do container

#### Scenario: Escala preservada em telas largas

- **WHEN** a página é renderizada em um viewport a partir de 1280px
- **THEN** o padding e a tipografia do Hero permanecem iguais aos atuais

### Requirement: Ausência de estouro horizontal na home

A home NOT SHALL produzir rolagem horizontal em nenhuma largura de viewport.

#### Scenario: Varredura de larguras

- **WHEN** a página é renderizada em 320px, 375px, 414px, 640px, 768px, 900px, 960px, 1023px, 1024px, 1150px, 1279px, 1280px e 1600px
- **THEN** a largura de rolagem do documento não excede a largura do viewport em nenhuma delas

### Requirement: Largura da section é declarada explicitamente

A `section` que contém os blocos entrelaçados SHALL declarar sua própria largura, em vez de depender do comportamento de dimensionamento intrínseco herdado do container flex que a envolve.

O override `@utility container` do projeto define apenas `max-width`, sem `width` nem `margin-inline`. A largura resultante passa a depender da resolução de tamanho intrínseco do flex pai, que é frágil e não é o contrato pretendido — e é sobre essa largura que toda a geometria do encaixe é calculada.

#### Scenario: Largura útil abaixo de xl

- **WHEN** a página é renderizada em qualquer viewport abaixo de 1280px
- **THEN** a área útil da `section` mede exatamente a largura do viewport menos 32px

#### Scenario: Largura útil a partir de xl

- **WHEN** a página é renderizada em qualquer viewport a partir de 1280px
- **THEN** a área útil da `section` mede exatamente 1280px e está centralizada horizontalmente
