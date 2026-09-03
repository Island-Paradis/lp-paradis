## ADDED Requirements

### Requirement: Um destino de navegação é uma âncora, não um botão

Todo elemento do footer que leva o usuário a outro lugar SHALL renderizar como elemento de âncora com `href`. SHALL NOT renderizar como `<button>` sem destino.

Isso inclui os dois CTAs do bloco "Ready to build?", que hoje são `<Button variant="inverted">` sem `href` e sem handler — e portanto `<button>` inertes, invisíveis como destino para tecnologia assistiva, incapazes de abrir em nova aba, de serem copiados como endereço ou de responderem a clique. Os campos `cta.primaryButton.href` e `cta.outlineButton.href` são `required: true` no schema e SHALL ser o destino renderizado.

O componente `Button` já suporta `asChild`, que delega o elemento renderizado ao filho; esse é o mecanismo pelo qual um CTA se torna âncora preservando a aparência atual. A aparência SHALL NOT mudar: as variantes `inverted` e `outline-inverted`, o raio, o preenchimento e o comportamento de hover permanecem os do estado atual.

#### Scenario: CTA primário é um destino navegável

- **WHEN** `cta.primaryButton.href` está authorado e a página é renderizada
- **THEN** o botão primário é um elemento de âncora cujo `href` é o valor authorado

#### Scenario: CTA secundário é um destino navegável

- **WHEN** `cta.outlineButton.href` está authorado e a página é renderizada
- **THEN** o botão de contorno é um elemento de âncora cujo `href` é o valor authorado

#### Scenario: Clique no CTA navega

- **WHEN** o usuário clica em qualquer um dos dois CTAs
- **THEN** o navegador navega para o destino authorado

#### Scenario: CTA é alcançável e acionável por teclado

- **WHEN** o usuário percorre o footer por `Tab` e aciona um CTA por `Enter`
- **THEN** o CTA recebe foco visível e a navegação ocorre

#### Scenario: Aparência dos CTAs não muda

- **WHEN** o footer é comparado visualmente antes e depois da change
- **THEN** os dois CTAs mantêm forma, cor, tipografia, espaçamento e comportamento de hover idênticos

### Requirement: Externo e interno se distinguem por um único flag authorável

O comportamento de cada link de `linkGroups` SHALL ser governado pelo flag `links[].isExternal` daquele link.

Um link com `isExternal` marcado SHALL abrir em nova aba, com `rel` contendo `noopener` e `noreferrer`, e SHALL exibir uma afordância visual de link externo — a seta `↗` do mockup — adjacente ao seu rótulo.

Um link com `isExternal` desmarcado ou ausente SHALL NOT receber `target="_blank"`, SHALL NOT receber `rel` de link externo e SHALL NOT exibir a seta.

Isso corrige o estado atual, em que `src/components/Footer/index.tsx` aplica `target="_blank" rel="noopener noreferrer"` a **todo** link do footer, incluindo navegação interna como `Home`, `Products`, `Services`, `About`, `Members` e `Contacts`, e em que a seta não é renderizada para nenhum link.

#### Scenario: Link externo abre em nova aba com a seta

- **WHEN** um link tem `isExternal` marcado e a página é renderizada
- **THEN** sua âncora tem `target="_blank"`, tem `rel` com `noopener` e `noreferrer`, e exibe a seta de link externo ao lado do rótulo

#### Scenario: Link interno navega na mesma aba sem seta

- **WHEN** um link tem `isExternal` desmarcado ou ausente e a página é renderizada
- **THEN** sua âncora não tem `target="_blank"`, não tem `rel` de link externo, e não exibe seta

#### Scenario: Grupo misto renderiza cada link conforme o seu flag

- **WHEN** um mesmo grupo contém links internos e externos — como o `Quick Links` do mockup, com `Home`/`Products`/`Services` internos e `Kitenda`/`DP Angola` externos
- **THEN** cada link recebe o tratamento do seu próprio flag, e a coluna exibe a seta apenas nos dois externos

#### Scenario: Nenhum link interno abre em nova aba

- **WHEN** todos os links de navegação interna do footer são inspecionados após a change
- **THEN** nenhum deles tem `target="_blank"`

### Requirement: Rota interna respeita o prefixo de locale

Um link interno SHALL ser renderizado pelo `Link` locale-aware de `src/i18n/navigation.ts`, de modo que a navegação permaneça no locale corrente.

Todas as rotas públicas do site são prefixadas por locale (`/en`, `/pt`), conforme `src/i18n/routing.ts` e o middleware em `src/proxy.ts`. Um `href` authorado no CMS como `/products` renderizado por `next/link` puro aterra fora do locale corrente, tirando o usuário do idioma em que estava. Links externos, que carregam URL absoluta, SHALL NOT passar pelo `Link` locale-aware.

#### Scenario: Link interno preserva o locale corrente

- **WHEN** o usuário está em `/pt` e clica num link interno do footer cujo `href` authorado é `/products`
- **THEN** a navegação resulta na rota prefixada pelo locale corrente, e o usuário permanece em português

#### Scenario: Link interno preserva o outro locale

- **WHEN** o usuário está em `/en` e clica no mesmo link interno
- **THEN** a navegação resulta na rota prefixada por `en`

#### Scenario: Link externo não é reescrito

- **WHEN** um link com `isExternal` marcado aponta para uma URL absoluta
- **THEN** a URL é usada como authorada, sem nenhum prefixo de locale inserido

### Requirement: Link cujo conteúdo é só um ícone carrega nome acessível

Todo destino do footer renderizado apenas como ícone, sem texto visível, SHALL expor um nome acessível. O campo `socialLinks[].label` é `required` e localizado justamente para servir esse nome.

Isso cobre os três ícones sociais da barra inferior, que no mockup não têm rótulo visível. Um ícone SVG sozinho dentro de uma âncora não produz nome acessível por si, e o link SHALL NOT ser anunciado como destino sem nome.

Cada ícone social SHALL ser um destino externo: abre em nova aba, com `rel` contendo `noopener` e `noreferrer`.

#### Scenario: Ícone social é anunciado pelo seu rótulo

- **WHEN** um leitor de tela percorre a barra inferior com três links sociais authorados
- **THEN** cada link é anunciado pelo `label` authorado no locale corrente, e nenhum é anunciado como link sem nome

#### Scenario: Ícone decorativo não duplica o nome

- **WHEN** o SVG dentro de uma âncora social é inspecionado
- **THEN** ele não contribui um segundo nome acessível concorrente ao do link

#### Scenario: Ícone social abre em nova aba

- **WHEN** o usuário aciona um link social
- **THEN** o destino abre em nova aba, com `rel` contendo `noopener` e `noreferrer`

#### Scenario: Ícones sociais são alcançáveis por teclado

- **WHEN** o usuário percorre a barra inferior por `Tab`
- **THEN** cada link social recebe foco visível na ordem em que aparece

### Requirement: A afordância de link externo não é anunciada como conteúdo

A seta `↗` adjacente a um rótulo de link externo SHALL ser tratada como decoração visual e SHALL NOT ser lida por tecnologia assistiva como parte do texto do link.

O nome acessível de um link externo de `linkGroups` SHALL ser o seu `name` authorado, sem sufixo espúrio vindo do glifo ou do ícone da seta.

#### Scenario: Nome acessível de link externo é o rótulo authorado

- **WHEN** um leitor de tela anuncia o link externo `Kitenda`
- **THEN** o nome anunciado é `Kitenda`, sem menção ao glifo da seta

#### Scenario: Seta é ignorada pela árvore de acessibilidade

- **WHEN** o elemento da seta é inspecionado na árvore de acessibilidade
- **THEN** ele está marcado como decorativo e não contribui texto ao nome do link
