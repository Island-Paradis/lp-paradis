# quote-request-intake Specification

## Purpose

O caminho de submissão — validação, persistência em `QuoteRequests`, controlo de acesso da coleção, resistência a spam, e os estados de sucesso e de erro apresentados ao visitante.

_Introduzida por `add-get-quote-page`, sincronizada ao arquivar._

## Requirements

### Requirement: Submissão válida é persistida em `QuoteRequests`

SHALL existir uma coleção `quote-requests` que guarda cada submissão do formulário com: nome, e-mail, serviços de interesse, mensagem, o locale de origem da submissão, e a data de criação.

A submissão SHALL ser processada por uma Server Action em `src/app/(app)/[locale]/get-quote/actions.ts` que grava via `payload.create`, obtendo o Payload por `getPayloadInstance()`. SHALL NOT ser criado um route handler sob `(payload)/api`.

#### Scenario: Submissão completa

- **WHEN** um visitante em `/pt/get-quote` submete nome, e-mail válido, dois interesses e uma mensagem
- **THEN** existe um documento novo em `quote-requests` com esses valores e `locale` igual a `pt`
- **AND** o documento é visível na listagem de `/admin`

#### Scenario: Submissão sem interesses

- **WHEN** a submissão é válida mas nenhum chip de interesse está selecionado
- **THEN** a submissão é aceite e gravada com a lista de interesses vazia
- **AND** a ausência de interesses não é tratada como erro de validação

### Requirement: Os interesses são gravados por relação e por slug

O campo de interesses da submissão SHALL ser um `relationship` para `services` com `hasMany: true`, **e** SHALL guardar em paralelo o `slug` textual de cada serviço selecionado no momento da submissão.

A relação serve a navegação no admin; o slug copiado serve a leitura da submissão depois de o serviço ser apagado ou renomeado.

#### Scenario: Serviço apagado depois da submissão

- **WHEN** um serviço referido por uma submissão gravada é apagado da coleção `services`
- **THEN** a submissão continua legível no admin e ainda indica qual era o interesse, pelo slug guardado

#### Scenario: Interesse forjado

- **WHEN** a submissão chega com um identificador de serviço que não corresponde a nenhum serviço existente
- **THEN** esse interesse é descartado e não é gravado
- **AND** os restantes interesses válidos da mesma submissão são gravados

### Requirement: A coleção de submissões não é legível publicamente

O access control de `quote-requests` SHALL permitir `create` a qualquer visitante e SHALL exigir utilizador autenticado para `read`, `update` e `delete`.

Este requisito é explícito porque as restantes coleções e globals deste repo usam `read: () => true` — são conteúdo de marketing — e replicar esse padrão aqui expõe nome, e-mail e descrição de projeto de terceiros na API REST.

#### Scenario: Leitura anónima da API

- **WHEN** um pedido não autenticado é feito a `/api/quote-requests`
- **THEN** a resposta não contém nenhuma submissão

#### Scenario: Leitura autenticada

- **WHEN** um utilizador autenticado abre a coleção em `/admin`
- **THEN** vê as submissões gravadas

#### Scenario: Escrita anónima permitida

- **WHEN** um visitante não autenticado submete o formulário
- **THEN** a criação é aceite

### Requirement: Validação com zod, autoridade no servidor

SHALL existir um schema `zod` num módulo partilhado, importado tanto pela Server Action como pelo componente de cliente. A Server Action SHALL revalidar toda a entrada independentemente do que o cliente tenha validado.

O schema SHALL impor: nome obrigatório, e-mail em formato válido, mensagem obrigatória, limites máximos de comprimento em nome, e-mail e mensagem, e um teto no número de interesses aceites.

#### Scenario: Entrada inválida contornando o cliente

- **WHEN** a Server Action é invocada diretamente com um e-mail inválido, sem passar pelo formulário
- **THEN** nenhum documento é criado
- **AND** a action devolve o estado de erro de validação

#### Scenario: Mensagem acima do limite

- **WHEN** a mensagem submetida excede o comprimento máximo do schema
- **THEN** a submissão é rejeitada e nada é gravado

#### Scenario: Campo obrigatório em falta

- **WHEN** o nome é submetido vazio
- **THEN** a submissão é rejeitada e o erro é associado ao campo do nome

### Requirement: As mensagens de erro vêm do CMS, não do zod

Cada código de erro de validação produzido pelo schema SHALL ser associado a uma mensagem localizada gravada na global `GetQuotePage`. As mensagens padrão do zod SHALL NOT ser apresentadas ao visitante.

#### Scenario: Erro apresentado no locale da página

- **WHEN** o visitante em `/pt/get-quote` submete um e-mail inválido
- **THEN** a mensagem apresentada é a do locale `pt` da global

#### Scenario: Mensagem de erro não configurada

- **WHEN** o campo da mensagem de erro correspondente está vazio na global
- **THEN** é apresentada a mensagem de piso definida em código
- **AND** não é apresentada uma string vazia nem o texto padrão do zod

### Requirement: Estados de sucesso e de erro apresentados ao visitante

O formulário SHALL apresentar um estado de submissão em curso, um estado de sucesso e um estado de erro de gravação, todos com texto vindo da global. Durante a submissão o botão SHALL estar desativado, para impedir dupla submissão.

#### Scenario: Sucesso

- **WHEN** a gravação conclui com êxito
- **THEN** é apresentada a mensagem de sucesso da global
- **AND** o formulário não continua a apresentar os valores submetidos como se estivessem pendentes

#### Scenario: Falha de gravação

- **WHEN** a gravação falha por erro do servidor ou da base de dados
- **THEN** é apresentada a mensagem de erro da global
- **AND** os valores que o visitante escreveu permanecem no formulário para poder tentar de novo

#### Scenario: Duplo clique no botão

- **WHEN** o visitante clica no botão de submissão duas vezes seguidas
- **THEN** apenas um documento é criado

### Requirement: Guardas de spam sem dependência externa

O formulário SHALL incluir um campo honeypot escondido. Quando esse campo chegar preenchido, a action SHALL devolver o estado de sucesso ao cliente e SHALL NOT gravar nada.

Os metadados da submissão (locale, data) SHALL ser marcados `readOnly` ou `hidden` na coleção e derivados no servidor, SHALL NOT ser aceites a partir da entrada do cliente.

#### Scenario: Honeypot preenchido

- **WHEN** uma submissão chega com o campo honeypot preenchido
- **THEN** nenhum documento é criado
- **AND** o cliente recebe o mesmo estado de sucesso que uma submissão legítima receberia

#### Scenario: Metadado forjado

- **WHEN** a action é invocada com um valor de locale ou de data no payload do cliente
- **THEN** esses valores são ignorados e os efetivos são determinados no servidor

### Requirement: O formulário pode ser desligado pelo CMS

A global SHALL ter uma flag de ativação do formulário. Com a flag desligada, o formulário SHALL NOT ser renderizado e a Server Action SHALL rejeitar submissões sem gravar.

A flag é a válvula de fecho da única escrita pública do site, e por isso tem de agir também no servidor — esconder o formulário no cliente não fecha a action.

#### Scenario: Formulário desligado

- **WHEN** a flag de ativação está desligada e a página é aberta
- **THEN** o formulário não é renderizado
- **AND** o restante conteúdo da página continua a ser apresentado

#### Scenario: Submissão com o formulário desligado

- **WHEN** a Server Action é invocada enquanto a flag está desligada
- **THEN** nenhum documento é criado
