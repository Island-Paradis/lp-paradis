# get-quote-page Specification

## Purpose

A página `/get-quote` inteiramente dirigida pelo CMS — a forma da global `GetQuotePage`, o mapeamento de cada campo para o design, o comportamento com conteúdo em falta ou parcial, a localização por locale, e os metadados de SEO.

_Introduzida por `add-get-quote-page`, sincronizada ao arquivar._

## Requirements

### Requirement: A rota `/get-quote` renderiza conteúdo vindo da global

A rota `/[locale]/get-quote` SHALL obter o seu conteúdo da global `GetQuotePage` do Payload (slug `get-quote-page`) através de um fetcher em `src/service/payload-functions.ts`, com `depth: 2` e o `locale` do segmento de rota, e SHALL deixar de renderizar o stub atual.

O slug SHALL estar registado em `GLOBAL_SLUGS` ([`src/service/constants.ts`](../../../../src/service/constants.ts)) para que fetcher e configuração da global não possam divergir, e o fetcher SHALL reusar o `getGlobal` genérico já existente.

#### Scenario: Página com a global preenchida

- **WHEN** um visitante abre `/en/get-quote` com a global `get-quote-page` preenchida
- **THEN** o headline, o parágrafo de introdução, a pill de disponibilidade, o eyebrow, os rótulos do formulário, o rótulo do botão e a nota de privacidade apresentados são os valores gravados na global
- **AND** nenhum desses textos aparece escrito diretamente no JSX do componente

#### Scenario: Fetcher reusa a instância memoizada

- **WHEN** o fetcher da global é executado
- **THEN** obtém o Payload através de `getPayloadInstance()` de [`src/service/index.ts`](../../../../src/service/index.ts)
- **AND** não chama `getPayload({ config })` diretamente

### Requirement: Cada campo visível tem um piso em código

Todo texto do design SHALL existir em código como valor de piso do campo correspondente, e o valor da global SHALL substituí-lo apenas quando não estiver vazio. Um campo SHALL contar como vazio quando for `null`, `undefined`, string vazia ou composto apenas por espaços — o Payload grava string vazia quando um campo de texto é limpo no admin, e `"" ?? piso` devolveria `""`.

A resolução SHALL usar um helper partilhado (`src/lib/cms-text.ts`), e esse helper SHALL devolver o valor original intacto quando há conteúdo.

#### Scenario: Campo esvaziado no admin

- **WHEN** o rótulo do botão de submissão é apagado no admin e a página é aberta
- **THEN** o botão apresenta o rótulo de piso definido em código
- **AND** não aparece um botão sem rótulo

#### Scenario: Campo com apenas espaços

- **WHEN** um campo de texto da global contém apenas espaços
- **THEN** o valor de piso é usado

#### Scenario: Global inexistente ou totalmente vazia

- **WHEN** a página é renderizada sem nenhum conteúdo gravado na global
- **THEN** a página renderiza por inteiro com os valores de piso, mantendo o layout do design
- **AND** não lança erro nem devolve 500

### Requirement: Os chips de interesse vêm da coleção `Services`

A lista de interesses selecionáveis SHALL ser um campo `relationship` para `services` com `hasMany: true` na global, e não uma lista de rótulos própria da global.

O rótulo de cada chip SHALL ser o `title` do serviço (localizado) e a identidade estável de cada chip SHALL ser o `slug` do serviço, nunca o título.

#### Scenario: Serviços ligados na global

- **WHEN** a global tem três serviços ligados no campo de interesses e a página é aberta em `/pt/get-quote`
- **THEN** aparecem três chips, rotulados com o `title` em português de cada serviço
- **AND** a ordem dos chips é a ordem definida no campo de relationship

#### Scenario: Nenhum serviço ligado

- **WHEN** a global não tem nenhum serviço ligado no campo de interesses
- **THEN** a secção de interesses inteira não é renderizada, incluindo o seu rótulo
- **AND** o resto do formulário permanece utilizável

#### Scenario: Título de serviço reescrito no CMS

- **WHEN** o `title` de um serviço é alterado no admin
- **THEN** o rótulo do chip acompanha a alteração
- **AND** a identidade usada para submeter aquele interesse continua a ser o `slug`, inalterada

### Requirement: A pill de disponibilidade é opcional e controlada pelo CMS

A pill de disponibilidade (o ponto, o texto de estado e a localidade) SHALL ser um grupo na global com uma flag de ativação, e SHALL ser omitida por completo quando a flag estiver desligada.

#### Scenario: Pill desativada

- **WHEN** a flag de ativação da pill está desligada
- **THEN** a pill não é renderizada
- **AND** não fica um espaço vazio no lugar dela que altere o alinhamento das secções vizinhas

#### Scenario: Pill ativa sem localidade

- **WHEN** a pill está ativa, com texto de estado preenchido e a localidade vazia
- **THEN** a pill apresenta apenas o ponto e o texto de estado
- **AND** o separador que precede a localidade não é renderizado

### Requirement: Todo o conteúdo visível é localizado

Todos os campos da global que produzem texto no ecrã SHALL ser declarados `localized: true`, incluindo as mensagens de validação, de sucesso e de erro do formulário. Campos que não produzem texto no ecrã — `href`s, e-mail destinatário e flags — SHALL NOT ser localizados.

Este requisito existe porque o projeto não tem catálogo de mensagens do next-intl: [`src/i18n/request.ts`](../../../../src/i18n/request.ts) devolve apenas `locale`, sem `messages`, portanto o Payload é o único sítio onde uma string pode ter duas versões.

#### Scenario: Mesma página nos dois locales

- **WHEN** a global tem conteúdo distinto gravado em `en` e em `pt` e o visitante abre `/pt/get-quote`
- **THEN** todo o texto do ecrã — headline, introdução, rótulos, botão, nota de privacidade — está em português
- **AND** nenhuma string em inglês aparece na rota `/pt`

#### Scenario: Mensagem de erro de validação em português

- **WHEN** o visitante em `/pt/get-quote` submete um e-mail inválido
- **THEN** a mensagem de erro apresentada é a gravada no locale `pt` da global
- **AND** não é a mensagem padrão do zod em inglês

### Requirement: Metadados de SEO gerados a partir da global

A rota SHALL exportar `generateMetadata` que lê um grupo `seo` (`metaTitle`, `metaDescription`, ambos localizados) da global, seguindo a forma do grupo `seo` da `HomePage`. Quando um desses campos estiver vazio, SHALL recair sobre os valores da `metadata` estática do layout.

#### Scenario: SEO preenchido

- **WHEN** `metaTitle` e `metaDescription` estão preenchidos no locale pedido
- **THEN** o `<title>` e a meta description da página são esses valores

#### Scenario: SEO vazio

- **WHEN** o grupo `seo` está vazio
- **THEN** a página herda o título estático do layout
- **AND** não apresenta um `<title>` vazio

### Requirement: Apenas o formulário é código de cliente

O componente da página SHALL ser um server component e SHALL passar ao formulário apenas strings já resolvidas e a lista de chips (`slug` + `title`) — o objeto populado da global SHALL NOT atravessar a fronteira servidor/cliente.

O módulo de cliente do formulário SHALL NOT importar de `@/i18n/navigation`, e ícones SHALL ser importados nominalmente, nunca resolvidos por indexação dinâmica sobre um `import * as`. As duas restrições correspondem a custos já medidos neste repo: +33,6 KB de runtime ICU do `@formatjs` e 12,7 MB retidos por indexação de namespace de ícones, este último documentado em [`Button/index.tsx`](../../../../src/components/Button/index.tsx).

#### Scenario: Fronteira de serialização

- **WHEN** a página renderiza o formulário
- **THEN** as props do componente de cliente contêm apenas strings resolvidas e a lista de chips
- **AND** não contêm o objeto da global nem objetos `Service` completos

#### Scenario: Imports proibidos no formulário

- **WHEN** o módulo do formulário e os seus imports são inspecionados
- **THEN** não existe import de `@/i18n/navigation`
- **AND** não existe acesso a ícones por indexação dinâmica sobre um namespace importado

### Requirement: Fixture dev-only para os estados degradados

SHALL existir uma rota `/[locale]/fixtures/get-quote` que renderiza a página com props fabricadas, cobrindo os estados degradados descritos nesta especificação: global vazia, sem serviços ligados, pill desativada, e rótulos individuais em branco.

A rota SHALL chamar `notFound()` a menos que `NODE_ENV === "development"`, e essa guarda SHALL ser a primeira coisa no corpo do componente. A fixture SHALL apontar, em comentário, para os cenários desta spec que cobre, porque não há nada que force a sua atualização quando a global ganhar campos.

#### Scenario: Acesso em produção

- **WHEN** a rota da fixture é pedida com `NODE_ENV` diferente de `development`
- **THEN** a resposta é 404

#### Scenario: Acesso em desenvolvimento

- **WHEN** a rota é aberta no dev server
- **THEN** apresenta os casos degradados fabricados, cada um identificado
- **AND** cada caso difere do caso completo apenas no campo que degrada
