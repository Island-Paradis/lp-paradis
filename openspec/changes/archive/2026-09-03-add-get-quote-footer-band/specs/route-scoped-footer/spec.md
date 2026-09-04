## ADDED Requirements

### Requirement: Toda rota pública renderiza exatamente um footer

O site SHALL renderizar um e só um footer no fim de cada rota pública, seja qual for a composição desse footer. Nenhuma rota pode ficar sem footer, e nenhuma rota pode renderizar dois.

Este requisito existe porque o footer deixa de ser montado no layout partilhado e passa a ser servido por rota. O modo de falha que ele impede não é estético: um slot de rota paralela sem ficheiro `default.tsx` faz o Next.js devolver **404** — a página inteira, não só o footer — em navegação dura para qualquer rota que o slot não cubra.

#### Scenario: Rota sem composição especializada

- **WHEN** um visitante carrega `/en` ou `/pt` com recarga completa do browser
- **THEN** a página responde 200
- **AND** renderiza um footer, com a mesma composição que tinha antes desta mudança

#### Scenario: Rota de fixture, que o slot não cobre explicitamente

- **WHEN** um programador carrega `/en/fixtures/footer`, `/en/fixtures/navbar` ou `/en/fixtures/get-quote` em modo de desenvolvimento, com recarga completa
- **THEN** cada página responde 200
- **AND** renderiza o footer partilhado uma vez, além de quaisquer footers fabricados pela própria fixture

#### Scenario: Navegação por clique entre rotas com composições diferentes

- **WHEN** um visitante está em `/en` e clica num link para `/en/get-quote`, e depois volta atrás
- **THEN** o footer em cada destino corresponde à composição dessa rota
- **AND** em nenhum momento aparecem dois footers ou nenhum

### Requirement: A composição do footer é determinada pela rota, em código

O sistema SHALL escolher a composição do footer a partir da rota pedida, e essa escolha SHALL viver em código e não em conteúdo do CMS.

A escolha por rota — e não por flag de CMS — é deliberada: uma flag ligaria a variante em todas as rotas ou em nenhuma, que é precisamente o que este requisito precisa de evitar.

#### Scenario: A faixa de contacto direto aparece só no /get-quote

- **WHEN** um visitante carrega `/en/get-quote` ou `/pt/get-quote`
- **THEN** o footer inclui a faixa de contacto direto

#### Scenario: Nenhuma outra rota ganha a faixa

- **WHEN** um visitante carrega qualquer rota pública que não `/get-quote`
- **THEN** o footer NÃO inclui a faixa de contacto direto
- **AND** o seu HTML é equivalente ao produzido antes desta mudança

### Requirement: O footer continua a ser renderizado no servidor

O footer SHALL permanecer um server component. Nenhuma parte do mecanismo de seleção por rota pode introduzir estado de cliente, hooks de cliente, ou um import do runtime de cliente do `next-intl` no caminho do footer.

O ficheiro `src/components/Footer/index.tsx` documenta, com medição, que importar de `@/i18n/navigation` acrescenta 33,6 KB a um único chunk (34.259 → 67.909 bytes). Resolver a rota com `usePathname` custaria essa medição inteira.

#### Scenario: O caminho do footer não carrega runtime de cliente

- **WHEN** o build de produção é inspecionado para a rota `/get-quote`
- **THEN** nenhum módulo novo do runtime ICU do `@formatjs` aparece por causa do footer
- **AND** o footer e os ficheiros do slot não contêm a diretiva `"use client"`

### Requirement: O custo de dados de uma variante não atinge as outras rotas

Cada rota SHALL pagar apenas as queries de que a sua própria composição de footer precisa. Uma fonte de dados exigida por uma variante não pode ser buscada em rotas que não a renderizam.

#### Scenario: Contagem de queries numa rota sem faixa

- **WHEN** `/en` é servido
- **THEN** o global `footer` é buscado exatamente uma vez
- **AND** a coleção `contact` NÃO é buscada

#### Scenario: Contagem de queries na rota com faixa

- **WHEN** `/en/get-quote` é servido
- **THEN** o global `footer` é buscado exatamente uma vez
- **AND** a coleção `contact` é buscada no máximo uma vez, mesmo que mais de um componente do request precise dela

### Requirement: A animação de transição de página não abrange o footer

O `template.tsx` de `(app)/[locale]` SHALL continuar a envolver apenas o conteúdo da página, e o footer SHALL permanecer fora dele.

Este é um invariante a **preservar**, não um comportamento a introduzir. O `template.tsx` fica entre o layout e a página, pelo que o `<Footer>` que o layout renderiza a seguir a `{children}` já é irmão do wrapper de animação e não filho — verificado no HTML de `/en`, onde o `<div data-reveal>` do template fecha exatamente no byte em que o `<footer>` abre. Servir o footer por um slot mantém-no fora do template pela mesma razão estrutural. O requisito existe porque um arranjo diferente do slot poderia, sem aviso, pôr o footer debaixo da animação e fazê-lo desaparecer e reaparecer a cada navegação.

#### Scenario: Navegar entre duas rotas

- **WHEN** um visitante navega de `/en` para `/en/get-quote` por clique
- **THEN** o conteúdo da página executa a animação de entrada do `template`
- **AND** o footer não reexecuta a animação de entrada
- **AND** o footer permanece visível e legível durante toda a transição

#### Scenario: O footer sai do servidor visível

- **WHEN** o HTML de qualquer rota pública é pedido ao servidor e inspecionado sem executar JavaScript
- **THEN** nenhum elemento com `data-reveal` está aberto sobre o `<footer>`
- **AND** o footer não é servido dentro de um wrapper com `opacity: 0`

Este cenário é o que apanha o modo de falha real: o Next aplica o `template.tsx` do segmento a **todos** os slots do layout, não só a `children`. Um `template.tsx` colocado acima do slot dá ao footer a sua própria instância do wrapper de animação, e o footer passa a sair do servidor invisível à espera de hidratar — o defeito que `prevent-invisible-text` existe para impedir, reintroduzido pela porta das traseiras. A mitigação é manter o `template.tsx` num segmento abaixo do layout que consome o slot.
