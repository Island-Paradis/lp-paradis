## Context

`finish-footer-implementation` terminou com o código completo e cinco cenários de spec sem verificação possível. Todos descrevem degradação — o que o footer faz quando o conteúdo não está lá — e todos estão bloqueados pela mesma ausência: não há onde dar props fabricadas ao componente.

O que existe hoje, e por que cada caminho não serve:

```
  CAMINHO                        POR QUE NÃO
  ─────────────────────────────────────────────────────────────────
  apagar conteúdo em prod        mexe em conteúdo real; reposição
  e repor                        interrompida deixa o site errado

  test runner                    não existe: sem vitest, jest,
                                 playwright, testing-library, e sem
                                 nem tsx/esbuild para transpilar.
                                 CLAUDE.md: "No test runner is
                                 configured"

  banco descartável              não existe: um só DATABASE_URL, sem
                                 docker-compose, sem .env.example,
                                 sem .env.local

  renderizar o componente        precisa transpilar TSX, resolver
  em node puro                   `@/*`, e satisfazer next/image e o
                                 Button cliente fora do runtime Next
```

O que sobra é o que o próprio Next já faz bem: renderizar um Server Component numa rota. O componente pede `PopulatedFooter & { locale }` — objetos simples. O banco nunca foi parte do contrato dele; é só a origem habitual das props.

**Restrições vigentes**

- O `Footer` é Server Component e a fixture não pode mudar isso.
- A rota herda `layout.tsx`, que renderiza o `Footer` real. Não é evitável dentro de `(app)/[locale]`, e não deve ser evitado — ver D3.
- Pastas com prefixo `_` são privadas no App Router e não viram rota. O esboço inicial (`_fixtures/…`) não funcionaria. Não há nenhuma pasta `_*` em `src/app` hoje, então não existe convenção local a seguir.
- `cta` é obrigatório no tipo gerado; o dado real pode não ter. Ver D5.
- Biome, 2 espaços, organização de imports. `npm run lint` cobre `src/`, e **exclui `openspec`** (`biome.json` tem `"!openspec"` em `includes`).

## Goals / Non-Goals

**Goals:**

- Tornar verificáveis os cinco cenários de degradação, sem tocar o banco e sem introduzir test runner.
- Deixar a verificação repetível: quem alterar o footer depois pode reconferir os cinco estados.
- Manter a fixture fora do site publicado, de forma que dependa do servidor e não de obscuridade.
- Produzir evidência legível — captura de tela que outra pessoa consiga julgar.

**Non-Goals:**

- **Galeria de estados.** Recusado explicitamente: texto longo, muitos grupos, logo ausente, comparação pt/en. Verificariam cenários que nenhum spec pede, e cada um vira um estado a manter.
- **Introduzir testes.** A escolha do projeto de não ter suíte não é revista aqui.
- **Consertar o `Footer`.** Se a fixture revelar defeito, o defeito é achado. Ver D6.
- **Escrever no CMS.** Em nenhum momento, nem para montar estado, nem para limpar.
- **Cobrir `footer-link-semantics`.** Aqueles 18 cenários já estão verificados por HTML renderizado e árvore de acessibilidade. Nada aqui os toca.

## Decisions

### D1 — Rota routável sob `(app)/[locale]`, não pasta privada

`_fixtures/` não vira rota: o App Router trata `_`-prefixo como privado. A fixture precisa de um segmento normal, e portanto de um nome que não colida com rota real nem pareça uma.

O segmento fica sob `(app)/[locale]` para herdar o mesmo layout, fontes e CSS da aplicação — sem isso, o footer renderizaria fora do seu contexto visual e a captura não provaria nada sobre aparência.

Alternativa considerada: um route group próprio, fora de `(app)`, com layout mínimo, para não herdar o footer real. Recusada por D3 — o footer herdado é útil — e porque um layout paralelo é mais superfície para divergir do real.

### D2 — O guard é `notFound()` no servidor, condicionado a `NODE_ENV`

```
  request ──▶ NODE_ENV === "development" ?
                  │                    │
                 sim                  não
                  │                    │
              renderiza            notFound()  ──▶ 404
```

`notFound()` de `next/navigation`, avaliado no corpo do Server Component, antes de qualquer render. Em produção o Next devolve a 404 real da aplicação, indistinguível de uma rota inexistente.

Rejeitadas, todas por não impedirem acesso direto:

| Alternativa | Falha |
|---|---|
| Não linkar a página | URL direta funciona |
| `robots.txt` | pedido, não barreira |
| Nome improvável | segurança por obscuridade |
| Esconder com CSS | HTML já foi entregue |
| Checar no cliente | página já renderizou |

`NODE_ENV` é a chave certa porque o `next build` do Dockerfile roda em produção por definição: não há caminho em que o deploy avalie isto como `development`. Uma variável própria (`ENABLE_FIXTURES`) foi considerada e recusada — seria mais um env var para esquecer de *não* setar, invertendo o padrão seguro.

### D3 — O footer herdado do layout é controle, não estorvo

A rota herda `layout.tsx`, que renderiza `<Footer {...footerData} locale={locale} />` com dados reais. Serão portanto **seis** footers na página: cinco fabricados e um real.

Isso poderia ser tratado como contaminação. É melhor tratado como controle: o estado "conteúdo real e completo" aparece de graça, na mesma tela, para comparar com os degradados. O que ele exige é rótulo — sem isso alguém lê o sexto como um estado fabricado e conclui a coisa errada.

Consequência aceita: a rota dispara a busca de CMS do layout. Leitura, nunca escrita, e é a mesma busca que qualquer página do site faz.

### D4 — Rótulo diz o cenário **e** o resultado esperado

Um rótulo que só nomeia o estado ("socialLinks vazio") obriga quem lê a captura a saber o spec de cor. O rótulo carrega as duas metades:

```
  ┌────────────────────────────────────────────────────┐
  │ socialLinks: []                                    │
  │ esperado: nenhum ícone; copyright à esquerda;      │
  │           nenhum espaço reservado à direita        │
  ├────────────────────────────────────────────────────┤
  │            [ footer renderizado aqui ]             │
  └────────────────────────────────────────────────────┘
```

É o que transforma a captura em evidência em vez de enigma, e é o requisito "captura de tela é evidência legível".

### D5 — O cast do estado vazio é explícito, e é o ponto

O tipo gerado marca como obrigatórios `id`, `cta`, `cta.primaryButton.label`, `cta.primaryButton.href`, `cta.outlineButton.label` e `cta.outlineButton.href`. O estado "global inteiro vazio" não é expressável sem cast.

A tentação é fazer o cast calado, ou fabricar um objeto "quase vazio" que satisfaça o tipo. As duas escondem o achado. O tipo afirma uma garantia que o banco não dá — `cta_heading` já é `null` em produção — e o componente sabe disso, porque usa `cta?.` em vez de `cta.`. O cast comentado registra a divergência onde ela é visível.

Não é papel desta change consertar o tipo. Marcar `cta` como opcional no Payload teria efeito em migração e no admin, e é decisão de modelagem, não de fixture.

### D6 — Defeito revelado é achado, não conserto

A fixture existe para observar. Se um estado fabricado fizer o `Footer` lançar erro ou renderizar quebrado, o resultado é um registro nesta change — não uma edição em `src/components/Footer/index.tsx`.

A regra vem de experiência recente e específica: em `finish-footer-implementation`, o `asChild` do `Button` estava quebrado e só apareceu renderizando, depois de build, TypeScript e Biome passarem limpos. Ali o conserto era inevitável, porque a página devolvia 500. Aqui a situação é outra — a fixture não é caminho de usuário, então um defeito que ela revele pode ser registrado e priorizado em vez de consertado no impulso. Manter `Footer` fora do diff também é o que faz o cenário "componente intocado" verificável por `git diff`.

### D7 — Cinco estados, e a fronteira é o spec

Cada estado existe porque um cenário de `footer-content-authority` o pede. Nenhum a mais:

```
  cenário do spec                          estado da fixture
  ───────────────────────────────────────────────────────────────
  "Copyright sem texto authorado"     →    copyrightText: ""
  "Botão sem rótulo authorado"        →    cta.primaryButton.label: ""
  "Global inteiro sem conteúdo"       →    {} (cast, D5)
  "Nenhum link social authorado"      →    socialLinks: []
  "Plataforma sem ícone mapeado"      →    platform fora do mapa
```

O sexto cenário daquele requisito — "CTA sem heading authorado" — **não** entra: já está verificado em produção, porque `cta_heading` é `null` e o fallback aparece em todo render. Duplicá-lo na fixture seria manter um estado para provar o que a página real já prova.

Para o estado de plataforma não mapeada, o valor precisa ser uma opção válida do select **sem** ícone no mapa. O mapa cobre `dribbble`, `linkedin` e `instagram`; o select oferece dez. Qualquer um dos sete restantes serve.

## Risks / Trade-offs

**[O guard falha e a fixture fica pública]** → O único risco com consequência externa, e a razão de D2 existir. Uma condição invertida, ou um `notFound()` colocado depois do render, publica uma página de debug no domínio do cliente. → Mitigação: o guard é a primeira coisa no corpo do componente, e o cenário "produção responde 404" é verificado com um build de produção real, não por leitura de código. É a verificação que não pode ser dispensada nesta change.

**[A fixture apodrece]** → Ela duplica, em código, o formato de `PopulatedFooter`. Se o global ganhar campos, a fixture não quebra o build — props extras são opcionais — e passa a exercitar um footer desatualizado sem avisar. → Mitigação: nenhuma automática, e vale dizer isso em voz alta em vez de fingir. O que reduz o dano é o escopo: cinco estados sobre campos que já existem, não uma galeria. Um comentário na fixture aponta o spec de origem, para que quem mexer no global saiba onde reconferir.

**[Seis footers numa página confundem]** → Sem rótulo, alguém lê o footer real como um estado fabricado e conclui que o "vazio" renderiza conteúdo. → Mitigação: D3 e D4. O requisito de contagem previsível (cinco + um) existe para que a confusão seja detectável.

**[`notFound()` interage com o layout]** → A rota herda `layout.tsx`, que busca dois globais no CMS. Se o `notFound()` do page corre depois do layout, a 404 de produção ainda dispara duas consultas ao Postgres por requisição — uma rota inexistente que custa banco. → Mitigação: verificar onde o guard efetivamente corre no build de produção. Se o layout for executado antes, aceitar (é o comportamento de qualquer 404 dentro deste grupo de rotas) e registrar; a alternativa — mover a fixture para fora de `(app)` — custa o controle de D3 e um layout paralelo.

**[Ambiente de dev com `NODE_ENV` inesperado]** → Ferramentas que rodem o Next com `NODE_ENV=test` ou vazio veriam 404 na fixture. → Mitigação: nenhuma necessária hoje — não há test runner, e `npm run dev` define `development`. Registrado para não surpreender depois.

## Migration Plan

Nenhuma migração. Sem schema, sem dados, sem dependências.

```
  1. Rota + guard  ──▶  2. Cinco estados + rótulos  ──▶  3. Verificar em dev
                                                              │
                                                              ▼
                                                    4. Verificar 404 em
                                                       build de produção
                                                              │
                                                              ▼
                                                    5. Capturar evidência e
                                                       fechar 4.6/7.7/7.8/8.5
                                                       em finish-footer-…
```

O passo 4 é o que não pode ser pulado: é o requisito com consequência fora do projeto. Os passos 1–3 são reversíveis apagando um arquivo.

**Rollback**: apagar a rota. Não há estado a desfazer. As tasks fechadas na outra change voltariam a abertas, o que é a consequência correta — sem o instrumento, os cenários voltam a não ter verificação.

## Open Questions

1. ~~**Que segmento de URL?**~~ **Resolvido: `fixtures/footer`.** A árvore de `(app)/[locale]/` tinha um único segmento (`get-quote/`), então não houve colisão.
2. ~~**O `notFound()` roda antes ou depois do layout?**~~ **Resolvido por medida: depois.** A 404 de produção da fixture **dispara as duas consultas de CMS do layout.**

   A evidência é comparativa. Em build de produção, `GET /en/fixtures/footer` devolve 404 com **22.267 bytes**, enquanto `GET /en/definitely-not-a-route` devolve 404 com **7.290**. E o corpo da primeira contém texto vindo do CMS — `"Because we were born into this world"`, `"Paradis Labs"` — mais três referências `/cdn/`, que a segunda não tem.

   Nenhum elemento `<footer>` ou `<header>` renderizado aparece no HTML, e isso não contradiz a conclusão: a saída do layout chega como props no payload RSC, onde os elementos são arrays e não tags. Os dados foram buscados; a árvore visível foi substituída pela UI de not-found.

   Consequência aceita, conforme o que o risco previa: a rota é uma 404 que custa duas consultas ao Postgres por requisição. É uma URL não anunciada, então a exposição é pequena — mas é uma superfície de amplificação real, e vale saber que ela existe em vez de descobrir depois. A alternativa (mover a fixture para fora de `(app)`) custaria o footer de controle de D3 e um layout paralelo.

   Nota de escopo: isto **não** é comportamento de "qualquer 404 deste grupo de rotas", como o design supôs ao aceitar o risco. Uma rota inexistente não casa com o grupo e recebe a not-found raiz, barata. O custo aparece justamente porque a rota da fixture **existe** e portanto sua cadeia de layout roda antes do `notFound()`.
3. ~~**Qual plataforma para o estado não mapeado?**~~ **Resolvido: `youtube`.** Renderiza o rótulo `"Paradis Labs on YouTube"` como texto visível, legível na captura.
4. ~~**A fixture merece menção no `CLAUDE.md`?**~~ **Resolvido: sim.** A linha "No test runner is configured." passou a citar a rota, o caminho do arquivo, o guard, e a orientação de acrescentar fixtures ali em vez de puxar um framework de teste.
