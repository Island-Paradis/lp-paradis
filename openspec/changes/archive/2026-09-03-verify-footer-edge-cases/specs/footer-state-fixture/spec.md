## ADDED Requirements

### Requirement: A fixture é inalcançável em produção

A rota de fixture SHALL responder como inexistente em qualquer ambiente que não seja desenvolvimento. Fora de desenvolvimento ela SHALL retornar 404 e SHALL NOT renderizar nenhum conteúdo da fixture — nem parcial, nem atrás de um aviso.

Este é o requisito de maior consequência desta capability, e o único cujo defeito é visível para quem não trabalha no projeto: um guard mal condicionado publica uma página de debug no domínio do cliente. Por isso ele é requisito com cenários próprios, e não detalhe de implementação.

O guard SHALL ser avaliado no servidor. SHALL NOT depender de esconder a rota por ausência de link, por `robots.txt`, por nome improvável, ou por CSS — nenhum desses impede o acesso direto.

#### Scenario: Produção responde 404

- **WHEN** a rota de fixture é requisitada com `NODE_ENV` igual a `production`
- **THEN** a resposta é 404 e nenhum marcador da fixture aparece no corpo

#### Scenario: Desenvolvimento responde a fixture

- **WHEN** a rota de fixture é requisitada com `NODE_ENV` igual a `development`
- **THEN** a resposta é 200 e a fixture renderiza

#### Scenario: Acesso direto por URL não contorna o guard

- **WHEN** a URL da fixture é digitada diretamente num build de produção, sem vir de nenhum link
- **THEN** a resposta é 404

#### Scenario: A fixture não é anunciada

- **WHEN** o site publicado é inspecionado
- **THEN** nenhuma página, menu, sitemap ou `<link>` referencia a rota de fixture

### Requirement: A fixture renderiza os cinco estados degradados

A fixture SHALL renderizar o componente `Footer` uma vez para cada um dos cinco estados de conteúdo abaixo, todos na mesma página, cada um com props montadas em código.

| Estado | Prop fabricada |
|---|---|
| Copyright vazio | `copyrightText: ""` |
| Rótulo de botão vazio | `cta.primaryButton.label: ""` |
| Global inteiro vazio | objeto sem nenhum campo |
| Nenhum link social | `socialLinks: []` |
| Plataforma sem ícone mapeado | uma entrada com `platform` fora do mapa de ícones |

As props dos estados fabricados SHALL vir de código. A fixture SHALL NOT buscar esses estados no CMS e SHALL NOT escrever no banco.

A fixture SHALL usar o mesmo componente `Footer` que a aplicação usa, importado do mesmo módulo. SHALL NOT usar uma cópia, uma variante, ou um componente reimplementado para teste — uma fixture que renderiza outro componente não verifica nada.

#### Scenario: Os cinco estados aparecem juntos

- **WHEN** a fixture é renderizada em desenvolvimento
- **THEN** os cinco estados aparecem na mesma página, cada um renderizado pelo componente `Footer` da aplicação

#### Scenario: Nenhum estado fabricado depende do banco

- **WHEN** o código da fixture é inspecionado
- **THEN** as props dos cinco estados são literais em código, e nenhuma consulta ao CMS alimenta um estado fabricado

#### Scenario: A fixture não escreve

- **WHEN** a fixture é renderizada quantas vezes se queira
- **THEN** nenhum dado do CMS é criado, alterado ou removido

### Requirement: Cada estado é rotulado pelo cenário que representa

Cada instância renderizada SHALL exibir um rótulo textual identificando qual cenário ela demonstra e qual resultado é o esperado. Um leitor SHALL conseguir dizer, olhando a página, qual estado é qual e se o resultado está correto — sem consultar o código-fonte.

A fixture SHALL também rotular o footer real herdado do layout (ver o requisito abaixo), de modo que ele não seja confundido com um dos estados fabricados.

#### Scenario: Rótulo identifica o cenário

- **WHEN** um estado da fixture é observado
- **THEN** há um rótulo visível dizendo qual cenário ele representa e o que se espera ver

#### Scenario: Captura de tela é evidência legível

- **WHEN** a página da fixture é capturada como imagem e lida por alguém que não escreveu a fixture
- **THEN** essa pessoa consegue associar cada footer ao seu cenário e julgar o resultado

### Requirement: O footer herdado do layout é distinguido dos fabricados

A rota vive sob `(app)/[locale]`, portanto herda o `layout.tsx` da aplicação, que renderiza o `Footer` real com dados reais do CMS no fim de toda página. A fixture SHALL deixar claro qual footer é esse.

Ele SHALL ser tratado como controle — o estado "conteúdo real e completo" — e não como um sexto estado fabricado. A fixture SHALL NOT tentar suprimi-lo.

#### Scenario: O footer real é identificado como controle

- **WHEN** a fixture é renderizada
- **THEN** o footer vindo do layout está identificado como o footer real da aplicação, distinto dos cinco fabricados

#### Scenario: Contagem de footers é previsível

- **WHEN** os elementos `footer` da página da fixture são contados
- **THEN** o total é cinco fabricados mais um herdado do layout, e a fixture documenta essa contagem

### Requirement: A fixture não exige mudança no componente

A fixture SHALL renderizar usando o `Footer` como ele já é. Nenhuma alteração em `src/components/Footer/index.tsx` SHALL ser necessária para a fixture funcionar.

Se algum dos cinco estados só renderizar após mudar o componente, isso SHALL ser registrado como defeito do componente — com o cenário que o revela — e SHALL NOT ser consertado silenciosamente como parte do trabalho de fixture. O propósito da fixture é observar comportamento, não induzi-lo.

Nota de tipos: o estado "global inteiro vazio" não é expressável no tipo gerado sem um cast, porque `cta` é obrigatório em `Footer` (com `primaryButton.label`, `primaryButton.href`, `outlineButton.label` e `outlineButton.href` também obrigatórios), enquanto o banco aceita ausência e o componente se defende com `cta?.`. O cast SHALL ser explícito e comentado, apontando essa divergência entre tipo e realidade.

#### Scenario: Componente intocado

- **WHEN** o diff desta change é inspecionado
- **THEN** `src/components/Footer/index.tsx` não aparece

#### Scenario: Divergência entre tipo e dado fica registrada

- **WHEN** o estado "global inteiro vazio" é montado
- **THEN** o cast necessário está explícito e comentado, dizendo que o tipo declara `cta` obrigatório e o dado real pode não ter

#### Scenario: Defeito revelado é reportado, não escondido

- **WHEN** um estado fabricado faz o `Footer` lançar erro ou renderizar de forma quebrada
- **THEN** o comportamento é registrado como achado desta change, e o componente não é alterado aqui para mascará-lo
