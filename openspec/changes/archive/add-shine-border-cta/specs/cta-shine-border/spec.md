## ADDED Requirements

### Requirement: O anel é uma camada opt-in do `Button`

O `Button` SHALL aceitar uma prop booleana `shine`, desligada por defeito, que insere uma camada de anel animado dentro do elemento renderizado. Nenhum botão SHALL ganhar o anel por herança de variante, de tamanho ou de qualquer outra prop.

A prop SHALL ser ortogonal a `textSwap`, a `magnetic` e a `trailingIcon`: ligá-la não liga nenhuma dessas, e nenhuma delas a liga. O anel é uma camada, não um modo do botão.

O anel SHALL viver dentro do elemento que o `Button` renderiza — `<button>` ou âncora — e não num invólucro que o envolva. Um invólucro pode medir mais que o botão, e nesse caso o anel deixa de coincidir com a silhueta que pretende delimitar.

#### Scenario: Botão sem a prop não muda

- **WHEN** qualquer `Button` existente do site é renderizado sem `shine`
- **THEN** o seu DOM não contém nenhuma camada de anel
- **AND** o seu hover e a sua geometria são exactamente os de antes desta change

#### Scenario: `shine` sozinha não arrasta outras camadas

- **WHEN** um `Button` é renderizado com `shine` e sem `textSwap`
- **THEN** o anel está presente
- **AND** não existe painel de preenchimento, nem rótulo em duas cópias, nem inversão de ícone

#### Scenario: `textSwap` sozinho não traz anel

- **WHEN** um `Button` é renderizado com `textSwap` e sem `shine`
- **THEN** as camadas de inversão estão presentes
- **AND** não existe nenhuma camada de anel

#### Scenario: O anel acompanha o caminho de âncora

- **WHEN** um `Button` com `shine` é renderizado com `href`
- **THEN** o anel é inserido dentro da âncora
- **AND** alinha com a silhueta da âncora tal como alinharia com a de um `<button>`

#### Scenario: `asChild` não recebe anel

- **WHEN** um `Button` é renderizado com `asChild`
- **THEN** nenhuma camada de anel é inserida
- **AND** o filho único exigido pelo `Slot` é preservado

### Requirement: O anel coincide com a silhueta do botão

O anel SHALL ocupar exactamente a caixa do botão e SHALL herdar o seu raio de canto, de modo a ler-se como o contorno daquela pill e não como uma forma sobreposta.

A camada do anel SHALL ser inerte ao ponteiro, para não interceptar o clique nem alterar o alvo de `hover` do botão que a contém.

A presença do anel SHALL NOT alterar a geometria da caixa: nem a largura, nem a altura, nem a posição do rótulo mudam entre um botão com `shine` e o mesmo botão sem ela. Esta é a mesma garantia que `button-hover-inversion` já exige para o contorno, aplicada à camada nova.

#### Scenario: Raio herdado numa pill

- **WHEN** um `Button` com `shine` e o arredondamento completo da `cva` é observado
- **THEN** o anel segue a curva da pill em todo o perímetro
- **AND** não aparece nenhum canto recto nos topos

#### Scenario: O rótulo não desloca

- **WHEN** se comparam o mesmo `Button` com e sem `shine`, na mesma variante e no mesmo tamanho
- **THEN** as duas caixas medem o mesmo
- **AND** o rótulo está na mesma posição nas duas

#### Scenario: O anel não intercepta o ponteiro

- **WHEN** o cursor passa sobre a área do anel de um botão com `shine`
- **THEN** o botão entra em `hover` normalmente
- **AND** um clique nessa área activa o botão

#### Scenario: Espessura uniforme ao longo da curva

- **WHEN** o anel de um botão `shine` arredondado é inspecionado nos topos curvos e nos lados rectos
- **THEN** a espessura lida é a mesma nos dois
- **AND** o anel não é cortado nem se afina nas curvas

### Requirement: O anel fica acima do painel de preenchimento

Quando `shine` e `textSwap` coexistem, a camada do anel SHALL ficar acima do painel de preenchimento que sobe no hover, de modo que o anel permaneça visível durante e depois da subida.

Sem esta ordenação o anel desaparece no hover exactamente nas variantes em que o painel é claro: o painel é dimensionado à caixa inteira e cobre o perímetro por completo.

O anel SHALL NOT ficar acima do conteúdo — rótulo e ícone —, para nenhum instante da animação o gradiente passar por cima de texto.

#### Scenario: Anel sobrevive à subida do painel

- **WHEN** um `Button` com `shine` e `textSwap` na variante `primary` entra em hover e o painel claro cobre a caixa
- **THEN** o anel continua visível no perímetro
- **AND** continua a animar

#### Scenario: Anel visível a meio da subida

- **WHEN** o painel de preenchimento está a meio do percurso
- **THEN** o anel está visível tanto na parte já coberta como na que ainda não foi
- **AND** não pisca nem se interrompe na fronteira do painel

#### Scenario: O anel não passa por cima do rótulo

- **WHEN** o ponto quente do gradiente atravessa o lado do botão onde o rótulo está
- **THEN** o rótulo permanece integralmente legível
- **AND** nenhuma parte do gradiente é pintada sobre os glifos

### Requirement: A paleta do anel é independente das superfícies do botão

A cor do anel SHALL ser uma paleta própria, declarada num só lugar e igual em todas as variantes. SHALL NOT ser derivada do preenchimento da variante.

Este é o requisito que a implementação corrigiu, e a razão é geométrica e não estética. Uma cor afinada contra o preenchimento de repouso desaparece sob o painel de hover do `textSwap`, porque o painel é por construção o oposto desse preenchimento — o efeito falha nas quatro variantes ao mesmo tempo, e falha exactamente no instante em que o botão está a ser olhado. Uma paleta que não é keyed a nenhuma das duas superfícies não tem esse modo de falha.

A paleta SHALL manter contraste contra as duas superfícies que o botão pode apresentar — o preenchimento escuro (`#212528`) e o painel claro (`#ffffff`) — e o contraste de cada matiz contra cada superfície SHALL ser medido, e não presumido. Um matiz que caia abaixo de 3:1 contra uma delas SHALL ser coberto pelo ajuste de hover especificado no requisito seguinte, ou a paleta SHALL ser substituída.

O valor por defeito do componente do registry — preto — SHALL NOT ser usado: é invisível sobre a variante `primary`, cujo preenchimento é quase preto.

#### Scenario: Anel sobre a variante `primary` em repouso

- **WHEN** um `Button` `shine` na variante `primary` é observado em repouso sobre o fundo claro da página
- **THEN** cada matiz do anel é distinguível do preenchimento do botão
- **AND** o anel é distinguível do fundo da página

#### Scenario: A paleta é a mesma em todas as variantes

- **WHEN** botões `shine` de variantes diferentes são comparados em repouso
- **THEN** o anel tem a mesma paleta em todos
- **AND** nenhuma variante declara cor de anel própria

#### Scenario: O contraste de cada matiz é medido

- **WHEN** a paleta é verificada contra `#212528` e contra `#ffffff`
- **THEN** existe um valor de contraste registado por matiz e por superfície
- **AND** cada matiz abaixo de 3:1 contra uma delas está coberto pelo ajuste de hover

### Requirement: O anel ajusta-se ao painel de hover ao ritmo do painel

Num `Button` com `shine` e `textSwap`, o anel SHALL sofrer um ajuste de luminosidade quando o painel de preenchimento sobe, sempre que a paleta perca contraste contra esse painel. O ajuste SHALL usar a mesma duração e a mesma curva de easing do painel, para nenhum instante intermédio deixar o anel da cor da superfície que ainda está por baixo dele — a mesma garantia que o disco do `circleIcon` já tem.

O ajuste SHALL ser declarado por variante numa tabela de campos obrigatórios, de modo que uma variante nova não possa herdar «nenhum ajuste» por omissão. Uma variante cujo painel não custe contraste declara explicitamente que não precisa de ajuste.

O estado de repouso do anel SHALL declarar o ajuste identidade em vez de o omitir. Uma transição a partir de «nenhum ajuste» não interpola — salta —, e o salto lê-se como um pisco no arranque do hover.

#### Scenario: Painel claro escurece a paleta

- **WHEN** um `Button` com `shine` e `textSwap` cuja variante tem painel claro entra em hover
- **THEN** a paleta do anel escurece o suficiente para cada matiz continuar distinguível do painel
- **AND** o anel permanece visível durante toda a subida

#### Scenario: Painel escuro não pede ajuste

- **WHEN** a variante em hover tem painel escuro
- **THEN** a paleta permanece como em repouso
- **AND** essa ausência de ajuste está declarada, e não omitida

#### Scenario: Duração e curva coincidem com o painel

- **WHEN** se comparam a transição do anel e a do painel de preenchimento
- **THEN** ambas têm a mesma duração
- **AND** ambas têm a mesma curva de easing

#### Scenario: Nenhum pisco no arranque do hover

- **WHEN** o cursor entra num botão com `shine` e `textSwap`
- **THEN** o ajuste do anel arranca do valor de repouso e progride continuamente
- **AND** não há salto de luminosidade no primeiro frame

### Requirement: O anel é legível na espessura e ao longo de todo o percurso

O anel SHALL ler como uma linha, e não como um vestígio. Duas grandezas independentes decidem isso, e as duas SHALL ser calibradas: a espessura do traço, e a fracção do perímetro que está acesa em cada instante.

A espessura SHALL conversar com a linguagem de contorno do projeto, que `button-hover-inversion` fixa em 1,5px para contornos visíveis. Um anel muito mais grosso deixa de ler como o contorno do botão e passa a ler como moldura em torno dele.

A distribuição SHALL ser calibrada em vez de herdada do registry. Com `background-size: 300%` o elemento amostra apenas o terço interior do gradiente, e a banda acesa fica fora desse terço. Esse resultado é invariante à escala e ao aspect ratio — não é corrigível escolhendo outro tamanho de botão, e é por isso que tem de ser corrigido no gradiente. O valor SHALL ser escolhido de modo que a banda acesa caia dentro da região que o elemento amostra em qualquer ponto do ciclo.

Nenhuma calibração SHALL alterar a geometria da caixa. Em particular, engordar o anel SHALL NOT ser feito acrescentando borda ao elemento: num botão sem largura declarada a borda soma-se às dimensões, e o anel, sendo `inset-0`, resolve contra a padding box e fica por dentro dela — o resultado é um aro estático a mais, e não um anel mais grosso.

#### Scenario: O anel não tem trechos apagados

- **WHEN** um botão `shine` é observado ao longo de um ciclo completo da animação
- **THEN** em nenhum instante existe um trecho do perímetro indistinguível do preenchimento
- **AND** o ponto quente percorre o perímetro sem desaparecer

#### Scenario: Espessura coerente com os contornos do projeto

- **WHEN** um botão `shine` é comparado com um botão `outline` em repouso
- **THEN** a espessura do anel está na mesma ordem de grandeza do contorno de 1,5px
- **AND** o anel lê como contorno do botão, e não como moldura

#### Scenario: A calibração não usa borda

- **WHEN** o call site e o `Button` são inspecionados
- **THEN** nenhuma largura de borda foi acrescentada para engordar o anel
- **AND** a caixa do botão mede o mesmo que a de um botão sem `shine`

### Requirement: O anel para sob movimento reduzido

Sob `prefers-reduced-motion: reduce` o anel SHALL NOT animar. A degradação SHALL ser a paragem do movimento, e não a remoção da camada: o anel permanece pintado, estático, de modo que o botão não muda de forma nem de peso visual entre as duas preferências.

Esta é a mesma política que `reveal.tsx`, `parallax.tsx`, `cursor-glow.tsx` e `use-magnetic.ts` já seguem — o efeito degrada, o layout não.

#### Scenario: Preferência de movimento reduzido activa

- **WHEN** a página é aberta com `prefers-reduced-motion: reduce`
- **THEN** o anel do botão de submissão está visível e imóvel
- **AND** a caixa do botão mede o mesmo que sem a preferência

#### Scenario: A guarda vem do componente, não do call site

- **WHEN** o componente do anel é inspecionado
- **THEN** a guarda de movimento reduzido está no próprio componente
- **AND** nenhum call site tem de a repetir para a obter

### Requirement: O anel não assina o loop de animação da aplicação

O movimento do anel SHALL ser produzido por animação CSS declarativa. O anel SHALL NOT usar `requestAnimationFrame`, SHALL NOT assinar o frameloop da biblioteca de animação, e SHALL NOT depender de estado de React que mude por frame.

O módulo do anel SHALL NOT importar `motion`, biblioteca de ícones, ou `@/i18n/navigation` — as três restrições de bundle que o cabeçalho de `QuoteForm` documenta continuam a valer no caminho que esta change acrescenta ao formulário.

#### Scenario: Nenhum frame agendado pelo anel

- **WHEN** `/get-quote` está aberta e em repouso, e o frameloop da aplicação é inspecionado
- **THEN** não existe nenhuma assinatura originada pelo anel

#### Scenario: Nenhuma dependência nova de runtime

- **WHEN** os imports do módulo do anel são inspecionados
- **THEN** não há import de `motion`, de biblioteca de ícones nem de `@/i18n/navigation`
- **AND** `package.json` não ganhou nenhuma dependência por causa desta change

#### Scenario: O peso no bundle do formulário

- **WHEN** o chunk de cliente de `/get-quote` é comparado com o de antes desta change
- **THEN** o acréscimo corresponde apenas ao módulo do anel e à sua folha de estilo

### Requirement: O anel é montado apenas onde é pedido

A camada do anel SHALL existir apenas nos call sites que a pedem explicitamente. Nesta change o único call site de produção é o botão de submissão de `/get-quote`; os CTAs do `Hero`, da `ProductsSection`, do `Footer`, da `NavBar` e do `CalendlyCta` SHALL permanecer sem anel.

Esta delimitação é o que mantém o custo contínuo confinado a uma rota, e é a condição sob a qual `idle-runtime-budget` aceita a excepção.

#### Scenario: Inventário de CTAs sem anel

- **WHEN** o site é percorrido fora de `/get-quote`
- **THEN** nenhum botão apresenta anel animado

#### Scenario: O submit do formulário tem anel

- **WHEN** `/get-quote` é aberta nos dois locales com o formulário activo
- **THEN** o botão de submissão apresenta o anel a percorrer a borda

#### Scenario: O anel desaparece com o formulário

- **WHEN** a submissão tem sucesso e a mensagem de sucesso substitui o formulário
- **THEN** o botão deixa de existir e o anel com ele
- **AND** nenhuma animação permanece a correr na rota

### Requirement: O anel não interfere com o estado de submissão

O anel SHALL NOT substituir nem enfraquecer o comportamento de submissão actual: o botão continua desactivado enquanto o pedido está em curso, que é o que impede o duplo clique de criar dois documentos.

O anel SHALL acompanhar o esmorecimento visual do estado desactivado, para o botão desactivado não ler como activo por causa da camada nova.

#### Scenario: Duplo clique continua bloqueado

- **WHEN** o botão de submissão é clicado duas vezes em sucessão rápida
- **THEN** apenas um pedido é enviado
- **AND** apenas um documento é criado

#### Scenario: Anel esmorece com o botão desactivado

- **WHEN** a submissão está em curso e o botão está desactivado
- **THEN** o anel apresenta o mesmo esmorecimento que o resto do botão
- **AND** o botão não parece disponível para novo clique

### Requirement: Os estados do anel são verificáveis sem navegar o site

A rota de fixture de botões SHALL apresentar o anel nas combinações onde a sua ordenação de camadas e o seu contraste podem falhar, disponível apenas em desenvolvimento e com a guarda de produção como primeira instrução do corpo do componente.

#### Scenario: Fixture cobre as combinações de risco

- **WHEN** a fixture de botões é aberta em desenvolvimento
- **THEN** mostra `shine` sozinha e `shine` combinada com `textSwap`
- **AND** mostra-as sobre fundo claro e sobre fundo `bg-primary`

#### Scenario: Fixture mostra o estado desactivado

- **WHEN** a mesma fixture é observada
- **THEN** existe um botão `shine` desactivado, para o esmorecimento do anel ser comparável com o do botão

#### Scenario: Fixture fechada em produção

- **WHEN** a rota de fixture é pedida com `NODE_ENV` diferente de `development`
- **THEN** responde 404 através de `notFound()`
