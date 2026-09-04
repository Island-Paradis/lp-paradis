## Why

Cinco cenários já especificados em `finish-footer-implementation` não têm como ser verificados, e a razão não é falta de permissão nem falta de tempo — é que **não existe lugar onde o footer possa receber props fabricadas**.

Os cinco descrevem degradação: o que aparece quando o conteúdo *não* está lá. Dois de `footer-content-authority`:

- "Copyright sem texto authorado" e "Botão sem rótulo authorado" — o fallback declarado aparece no lugar do campo vazio.
- "Global inteiro sem conteúdo" — o footer renderiza sem lançar erro e o layout da página segue íntegro.
- "Nenhum link social authorado" — nenhum ícone, copyright alinhado à esquerda, nenhum espaço reservado vazio.
- "Plataforma sem ícone mapeado" — a entrada segue navegável com tratamento de reserva em vez de desaparecer.

Hoje, verificar qualquer um deles exige apagar conteúdo no Postgres de produção e depois repor. É a ferramenta errada por dois motivos independentes: mexe em conteúdo real, e uma reposição interrompida deixa o site errado. O caminho alternativo óbvio — um test runner — **não existe neste projeto**: não há `vitest`, `jest`, `playwright`, `testing-library`, nem sequer `tsx` ou `esbuild`, e o `CLAUDE.md` declara explicitamente "No test runner is configured".

Mas nenhum dos cinco cenários precisa de banco nem de test runner. Olhando o que eles de fato pedem:

```
  cenário                          o que precisa
  ─────────────────────────────────────────────────────
  copyright vazio            →     copyrightText: ""
  rótulo de botão vazio      →     cta.primaryButton.label: ""
  global inteiro vazio       →     {}
  nenhum link social         →     socialLinks: []
  plataforma sem ícone       →     platform: "youtube"
```

São **objetos**. O contrato do componente é `PopulatedFooter & { locale }`, props simples; o banco é apenas de onde as props costumam vir, não parte do contrato. O que falta é uma rota que monte esses objetos à mão e renderize o footer com eles.

Um detalhe reforça o valor disso: o cenário "CTA sem heading authorado" **já está verificado de graça**, porque `cta_heading` está `null` em produção e o fallback aparece em todo render. Foi acidente, não projeto. Os outros cinco não têm essa sorte.

## What Changes

- ① Uma rota de fixture renderiza o `Footer` em cada um dos cinco estados degradados, lado a lado, com props fabricadas em código. Nenhuma leitura de CMS para os estados fabricados.
- ② A rota **responde 404 em produção**. Só existe em `NODE_ENV === "development"`. Não é uma página do site: não é linkada, não entra em sitemap, e não é alcançável no deploy.
- ③ Cada estado é rotulado na tela com o cenário que representa, para que a captura sirva de evidência legível e não de enigma.
- ④ O caso "global inteiro vazio" exige um cast explícito, e o cast é o ponto: o tipo gerado marca `cta` como **obrigatório** (com `primaryButton.label`, `primaryButton.href`, `outlineButton.label`, `outlineButton.href` todos obrigatórios), enquanto o banco aceita ausência e o componente se defende com `cta?.`. A fixture torna essa divergência visível em vez de teórica.

**Fora de escopo**

- **Não é uma galeria de estados do footer.** Foi considerado e recusado: variantes como texto longo, muitos grupos de links, logo ausente ou comparação pt/en verificariam cenários que nenhum spec pede. A fixture cobre os cinco e para.
- **Não introduz test runner.** A decisão do projeto de não ter testes não é revista aqui. Se um dia for, esta fixture é o que uma suíte de render substituiria — não o que a impede.
- **Não muda o `Footer`.** Nenhuma linha de `src/components/Footer/index.tsx`. Se a fixture exigir mudar o componente para renderizar, isso é um defeito do componente e vira achado, não conserto silencioso.
- **Não toca conteúdo do CMS.** Nenhuma escrita no banco, em nenhum momento.

## Capabilities

### New Capabilities

- `footer-state-fixture`: uma superfície de desenvolvimento que renderiza o footer em estados de conteúdo escolhidos em código, sem banco, e que é inalcançável em produção. Cobre o que a rota mostra, como os estados são rotulados, e — o requisito com risco real — a garantia de que ela não existe no site publicado.

A capability é sobre a **fixture**, não sobre o footer. Os cinco cenários de degradação continuam pertencendo a `footer-content-authority`, em `finish-footer-implementation`; esta change não os reescreve nem os move. Ela constrói o instrumento que permite marcá-los como verificados.

Vale registrar a assimetria: `footer-state-fixture` é a única capability deste repositório cujo requisito mais importante é **não** estar disponível para o usuário final. Um `notFound()` mal condicionado publica uma página de debug no domínio do cliente, e é por isso que o guard é requisito com cenário próprio em vez de detalhe de implementação.

### Modified Capabilities

Nenhuma. `homepage-shape-interlock` segue a única capability sincronizada em `openspec/specs/`, e esta change não a toca. `footer-content-authority` e `footer-link-semantics` são **lidas** como contexto — os cenários que motivam esta change vivem lá — mas nenhum requisito delas muda de conteúdo. Elas ainda não estão sincronizadas para `openspec/specs/`, porque `finish-footer-implementation` não foi arquivada.

## Impact

**Código**

- Uma rota nova sob `src/app/(app)/[locale]/`. O caminho precisa ser routável: pastas prefixadas com `_` são privadas no App Router e **não** viram rota, então o esboço inicial (`_fixtures/…`) não funcionaria.
- Nada mais. Sem mudança em componentes, schema, tipos, ou configuração.

**Herança do layout**

A rota fica dentro de `(app)/[locale]`, logo herda `layout.tsx` — que já renderiza o `Footer` real, com dados reais do CMS, no fim de toda página. A fixture terá portanto o footer autêntico embaixo dos fabricados. Isso é aceitável e até útil como controle lado a lado, mas precisa de rótulo para não ser lido como um sexto estado. Também implica que a rota faz a busca de CMS do layout — leitura, nunca escrita.

**Deploy**

O guard de produção é o único ponto com consequência externa. Se ele falhar, uma página de debug fica pública. Nenhum efeito em banco, dependências, rotas existentes, i18n, ou bundle de cliente da landing page — a rota não é alcançável em produção, então não contribui bytes para nenhuma rota real.

**Efeito no trabalho pendente**

Fecha as tasks 4.6, 7.7, 7.8 e 8.5 de `finish-footer-implementation`, que hoje estão abertas por impossibilidade e não por escolha. Não toca os outros dez pendentes daquela change: quatro são decisões de conteúdo que só quem tem autoridade editorial resolve (`3.3`–`3.6`), dois dependem daquelas (`4.5`, `5.5`), três perderam a linha de base (`1.1`, `5.7`, `8.4`), e um precisa de credencial de admin (`2.6`).
