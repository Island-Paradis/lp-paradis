## ADDED Requirements

### Requirement: A faixa apresenta contacto direto e redes, acima do footer corrente

O footer da rota `/get-quote` SHALL renderizar, como primeiro bloco dentro do elemento `<footer>` e acima de todo o conteúdo atual, uma faixa com dois grupos: um título de contacto seguido do endereço de e-mail da empresa, e um título de redes seguido das redes sociais em pills rotuladas.

A faixa SHALL ser separada do bloco seguinte por uma linha divisória, e SHALL usar o mesmo contentor e as mesmas margens laterais do resto do footer, de modo a que o e-mail alinhe com o logo.

Nada abaixo da linha divisória muda por causa deste requisito.

#### Scenario: Faixa com conteúdo completo

- **WHEN** `/en/get-quote` é servido, com um documento `Contact` com e-mail, os dois títulos authorados no global `Footer`, e três redes sociais
- **THEN** a faixa mostra o título de contacto, o e-mail, o título de redes e três pills
- **AND** o logo, os grupos de links, o CTA e a barra de copyright renderizam abaixo dela, inalterados

#### Scenario: O footer das outras rotas não ganha a faixa

- **WHEN** `/en` é servido
- **THEN** o primeiro bloco dentro do `<footer>` é o logo com a tagline, como hoje
- **AND** nenhuma linha divisória extra é introduzida no topo do footer

### Requirement: O e-mail vem da coleção Contact

A faixa SHALL ler o endereço de e-mail de `Contact.email` e de mais nenhum sítio. O e-mail SHALL ser um link `mailto:` para esse mesmo endereço.

`Contact.email` é a fonte de verdade existente para o endereço da empresa e não é localizado — o mesmo endereço serve os dois idiomas. Duplicá-lo num campo do global `Footer` criaria duas fontes para o mesmo dado, e a desatualizada mandaria clientes para um endereço morto.

#### Scenario: E-mail authorado

- **WHEN** existe um documento `Contact` com `email` preenchido
- **THEN** a faixa mostra esse endereço como texto visível
- **AND** o link aponta para `mailto:` seguido do mesmo endereço

#### Scenario: O e-mail é idêntico nos dois idiomas

- **WHEN** `/en/get-quote` e `/pt/get-quote` são servidos
- **THEN** ambos mostram exatamente o mesmo endereço

### Requirement: Os títulos da faixa são conteúdo localizado do global Footer

Os dois títulos da faixa SHALL vir de campos de texto localizados do global `Footer`, dentro de um grupo `directContact`. Cada campo SHALL ter um piso em código, aplicado quando o valor authorado está ausente, vazio, ou só com espaços.

Literais em código como fonte foram rejeitados: `add-get-quote-page` exige que nenhuma string em inglês apareça em `/pt/get-quote`, e um título fixo em inglês violaria isso no primeiro render.

#### Scenario: Títulos authorados nos dois idiomas

- **WHEN** os dois campos estão authorados em `en` e em `pt`
- **THEN** `/en/get-quote` mostra os textos em inglês
- **AND** `/pt/get-quote` mostra os textos em português, sem nenhuma palavra em inglês

#### Scenario: Campo esvaziado no admin

- **WHEN** um editor limpa um dos títulos, e o Payload grava string vazia
- **THEN** a faixa mostra o piso em código desse título
- **AND** nenhum título fica em branco na página

### Requirement: O rótulo visível da pill deriva da plataforma

Cada pill SHALL mostrar o nome da plataforma derivado do valor de `socialLinks[].platform`, através de um mapa de nomes em código. A pill NÃO SHALL usar o campo `label` como texto visível, exceto no caso previsto abaixo.

O campo `label` é documentado no admin como "not shown on screen — it is the link's accessible name", e o conteúdo já authorado segue essa instrução. Usá-lo na pill mostraria *"Paradis on LinkedIn"* dentro da pill sem ninguém ter editado nada.

O mapa de nomes SHALL cobrir todas as plataformas nomeáveis do enum, não só as três que têm ícone: um nome é uma string e não custa um módulo, ao contrário de um ícone.

#### Scenario: Plataforma com ícone e nome

- **WHEN** uma rede tem `platform` igual a `instagram`, `linkedin` ou `dribbble`
- **THEN** a pill mostra o ícone dessa plataforma seguido do seu nome

#### Scenario: Plataforma com nome mas sem ícone

- **WHEN** uma rede tem `platform` igual a `github`, `twitter`, `facebook`, `youtube`, `discord` ou `whatsapp`
- **THEN** a pill mostra o nome da plataforma, sem ícone
- **AND** a pill continua a renderizar e a ser clicável

#### Scenario: Plataforma sem nome derivável

- **WHEN** uma rede tem `platform` igual a `other`
- **THEN** a pill mostra o campo `label` como texto visível
- **AND** a pill não é omitida

#### Scenario: O nome da plataforma não é traduzido

- **WHEN** `/pt/get-quote` é servido
- **THEN** as pills mostram os mesmos nomes de marca que em `/en/get-quote`

### Requirement: O nome acessível da pill continua a ser o label authorado

Cada pill SHALL expor o campo `label` como nome acessível da âncora, e o ícone SHALL ser marcado como decorativo. O texto visível e o nome acessível divergem de propósito.

#### Scenario: Leitor de ecrã numa pill

- **WHEN** um leitor de ecrã encontra a pill de uma rede com `label` igual a "Paradis Labs on Instagram"
- **THEN** anuncia "Paradis Labs on Instagram"
- **AND** não anuncia o ícone
- **AND** não anuncia o nome visível duas vezes

#### Scenario: Abertura em nova aba

- **WHEN** um visitante clica numa pill
- **THEN** o destino abre em nova aba, com `rel` a impedir acesso ao `window` de origem

### Requirement: As redes renderizam na ordem authorada, nos dois sítios do footer

As pills da faixa e os ícones da barra inferior SHALL renderizar na ordem do array `socialLinks` do CMS. Nenhum dos dois inverte ou reordena.

A descrição do campo promete ao editor que a ordem é a que ele escolhe ("in the order added here"). Uma inversão em metade do footer tornaria essa promessa falsa sem explicação.

#### Scenario: Ordem consistente

- **WHEN** o array `socialLinks` contém, por esta ordem, Dribbble, LinkedIn e Instagram
- **THEN** as pills da faixa aparecem por essa ordem, da esquerda para a direita
- **AND** os ícones da barra inferior aparecem pela mesma ordem

### Requirement: A faixa degrada por partes quando falta conteúdo

A faixa SHALL renderizar cada um dos seus dois grupos de forma independente, e SHALL desaparecer por inteiro — incluindo a linha divisória — apenas quando nenhum dos dois tem conteúdo.

Uma faixa com um título e nada por baixo, ou uma linha divisória a separar nada de nada, são piores que a ausência da faixa.

#### Scenario: Coleção Contact vazia

- **WHEN** não existe nenhum documento em `Contact`, ou o documento existente não tem e-mail
- **THEN** o grupo de contacto direto não renderiza, incluindo o seu título
- **AND** o grupo de redes renderiza normalmente, se houver redes
- **AND** o resto do footer renderiza inalterado

#### Scenario: Nenhuma rede social authorada

- **WHEN** o array `socialLinks` está vazio ou ausente
- **THEN** o grupo de redes não renderiza, incluindo o seu título
- **AND** o grupo de contacto direto renderiza normalmente, se houver e-mail

#### Scenario: Nem e-mail nem redes

- **WHEN** não há e-mail e não há redes
- **THEN** a faixa inteira não renderiza
- **AND** nenhuma linha divisória sobra no topo do footer
- **AND** o footer é visualmente indistinguível do footer das outras rotas

### Requirement: A faixa acomoda ecrãs estreitos sem transbordar

A faixa SHALL empilhar os seus dois grupos verticalmente em ecrãs estreitos e dispô-los lado a lado em ecrãs largos, e as pills SHALL quebrar para linhas seguintes em vez de forçar rolagem horizontal.

O mockup só define o comportamento desktop, tal como aconteceu com a barra inferior de copyright; este requisito fixa o resto pelo mesmo critério que já foi usado ali.

#### Scenario: Viewport estreito

- **WHEN** `/en/get-quote` é visto num viewport de 390px de largura
- **THEN** os dois grupos aparecem empilhados
- **AND** as pills quebram para várias linhas
- **AND** nenhum conteúdo do footer excede a largura do viewport

#### Scenario: Viewport largo

- **WHEN** `/en/get-quote` é visto num viewport de 1440px de largura
- **THEN** o grupo de contacto fica à esquerda e o grupo de redes à direita, na mesma linha

### Requirement: Os estados degradados da faixa são exercitáveis sem tocar no banco

A rota de fixture `/[locale]/fixtures/footer` SHALL incluir casos que exercitem a faixa: conteúdo completo, sem e-mail, sem redes, sem nenhum dos dois, e uma rede com plataforma sem nome mapeado.

O projeto não tem test runner nem banco descartável, e a fixture é a superfície de verificação que o `CLAUDE.md` fixa. Os cenários de degradação acima descrevem o que a faixa faz quando o conteúdo não está lá, e sem fixture a única forma de os observar seria apagar conteúdo no Postgres e repor.

#### Scenario: Fixture cobre os estados da faixa

- **WHEN** um programador carrega `/en/fixtures/footer` em modo de desenvolvimento
- **THEN** a página renderiza um caso por cada estado degradado da faixa, cada um rotulado
- **AND** cada caso mostra a faixa a comportar-se como os cenários acima descrevem

#### Scenario: A fixture continua fora de produção

- **WHEN** a rota de fixture é pedida com `NODE_ENV` diferente de `development`
- **THEN** responde 404
- **AND** a guarda de produção é a primeira instrução do corpo do componente
