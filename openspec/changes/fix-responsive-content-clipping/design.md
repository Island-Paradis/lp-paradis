## Context

A geometria do encaixe da home é documentada em `globals.css` com um comentário que deriva tudo de quatro constantes — `G = 18` (respiro), `R = 16` (raio convexo), `R+G = 34` (raio côncavo) e `W` (largura útil no breakpoint) — e instrui explicitamente a não ajustar nenhum número no olho. A derivação está correta para G, R e R+G. O erro está em tratar `W` como constante: ela é a única das quatro que é fluida.

```
W(vw) = min(1280, vw) − 32   (abaixo de xl, por causa de px-4)
W(vw) = 1280                 (a partir de xl, px-0 + container max 80rem)
```

Os `path()` foram desenhados para `W ∈ {736, 992, 1280}`, os valores que `W` assume no *primeiro pixel* de cada breakpoint. Como `clip-path: path()` aceita apenas comprimentos absolutos — sem `calc()`, sem porcentagem — não há como o path acompanhar `W`. O resultado é uma serra:

```
amputação (W real − largura do path)
  255 ┤    ▁▂▃▄▅▆▇█        ▁▂▃▄▅▆▇█
      │  ▁▂▃                ▁▂▃
    0 ┼──●──────────────────●──────────────●─────────
       768                1024           1280      vw
       └── correto apenas nestes três pontos ──┘
```

Em 960px (o caso reportado) o elemento tem 928px de conteúdo e 736px de recorte: 192px do card escuro somem, e o parágrafo e os cards da direita continuam sendo layoutados na largura cheia, virando texto `white/60` sobre fundo branco.

Há ainda um desalinhamento de um degrau entre visibilidade e geometria: o vídeo entra em `sm:block` (640px) mas os `path()` só existem a partir de `md` (768px). Entre 640 e 767 o vídeo (470px de altura, `absolute top-0`) fica atrás do bloco de serviços (que começa em `pt-102` = 408px) — 62px de sobreposição sem faixa de respiro.

## Goals / Non-Goals

**Goals:**

- Tornar o recorte indiferente à largura do elemento, eliminando a amputação em toda a faixa 768–1600px.
- Preservar as três propriedades que o encaixe já garante: respiro de 18px, arcos concêntricos, e independência da altura vinda do CMS.
- Alinhar a visibilidade do vídeo à faixa onde a geometria existe.
- Eliminar as demais fontes de conteúdo cortado (truncamento de rótulos, caps de medida inertes, Hero em mobile).
- Reduzir os seis `path()` a uma estrutura única, sem casos especiais por breakpoint além da posição do entalhe.

**Non-Goals:**

- Redesenhar o encaixe. A posição e a proporção do entalhe no início de cada breakpoint permanecem exatamente as de hoje.
- Introduzir `clip-path: shape()`. Foi considerada e descartada — ver Decisões.
- Tornar o entalhe proporcionalmente estável dentro de cada breakpoint. Isso é uma consequência aceita, não um objetivo.
- Mexer em `MarqueeServices`, `ProductsSection`, `TestimonialsSection`, `FAQSection`, `NavBar` ou `Footer`.
- Alterar schema do Payload, tipos gerados, i18n ou rotas.

## Decisions

### D1 — O recorte se estende à direita até 99999, e o `border-radius` arredonda a borda

O arquivo já resolve esse problema no eixo vertical: o `path()` do `.services_shape` desce até `y=99999` porque a altura vem do CMS e não é conhecida em build time, e quem arredonda os cantos inferiores é o `rounded-2xl` do próprio elemento. O comentário no CSS registra que `border-radius` recorta o background independentemente do `clip-path` — os dois se intersectam.

A largura tem exatamente a mesma natureza: é desconhecida em build time. A decisão é aplicar o mesmo recurso no eixo X.

```
antes (md)                      depois (md)
┌──────────────┐ W=736          ┌──────────────┬ ─ ─ ─ ─ ─▶ 99999
│▓▓▓▓▓▓▓▓┐     │                │▓▓▓▓▓▓▓▓┐     ▓          recortado pelo
│        └─────│                │        └─────▓          rounded-2xl em W
└──────────────┘                └──────────────┴ ─ ─ ─ ─ ─▶
   path == W apenas                path ⊇ elemento
   em vw=768                       em qualquer vw
```

Os seis paths passam a ter a mesma forma: entalhe em coordenadas fixas ancoradas à esquerda, borda direita em `99999`. As únicas constantes que sobram variando por breakpoint são as três do entalhe (`473/507/523` em md, `643/677/693` em lg, `152/186/202` em xl).

**Alternativas consideradas:**

- **`clip-path: shape()`** — resolveria de forma exata, com `calc(100% − 16px)` preservando a proporção do entalhe. Descartada: exige `@supports` com um caminho de fallback completo, dobrando a superfície a manter, para corrigir um problema que o recurso já validado no repositório resolve. Fica registrada como evolução natural quando o piso de suporte permitir remover o fallback.
- **Travar `W` em larguras discretas** (`md:w-184 lg:w-248 xl:w-320` + `mx-auto`) — não toca em nenhum path, risco zero. Descartada: cria até 255px de goteira morta em 1279px e um layout que salta em degraus, trocando conteúdo cortado por espaço vazio.
- **Gerar o path a partir de uma variável CSS atualizada por container queries em passos de 64px** — reduziria o erro máximo a ~32px em vez de eliminá-lo, ao custo de dezenas de media queries.

### D2 — O único canto que deixa de coincidir com o box ganha um overlay de canto invertido

`border-radius` só arredonda os quatro cantos do *box* do elemento. Cinco dos seis cantos direitos afetados coincidem com cantos do box e são cobertos de graça:

| Canto | Coordenada | Coincide com o box? |
|---|---|---|
| vídeo, superior direito | `(W, 0)` | sim — `rounded-2xl` ✓ |
| vídeo, inferior direito (aba) | `(W, 470)` | sim, `h-117.5` = 470 — `rounded-2xl` ✓ |
| serviços, inferior direito | `(W, altura)` | sim — já é assim hoje ✓ |
| serviços, inferior esquerdo | `(0, altura)` | sim — já é assim hoje ✓ |
| serviços, superior esquerdo | `(0, 0)` | sim, e o arco também está no path ✓ |
| **serviços, superior direito do painel direito** | **`(W, 80)`** | **não — está 80px abaixo do topo do box** |

Esse último é o preço da decisão D1 e precisa ser restaurado por outro meio. A solução é um quadrado de 16×16 na cor de fundo, com o quarto de círculo recortado por gradiente:

```
                    W−16   W
                 80 ┌──────┐   ← overlay 16×16, cor de fundo
                    │░░╱   │
                    │ ╱    │   radial-gradient(circle 16px at 0 100%,
                 96 └──────┘     transparent 0 16px, var(--background) 16px)
                    ↑
              centro do arco = (W−16, 96), o mesmo do border-radius
```

O overlay **não pode ser filho** do `.services_shape`: `clip-path` recorta os descendentes. Ele vai como `::after` do wrapper posicionado (`div` da linha 70 de `page.tsx`), em `right: 0; top: 488px`. Os dois números são derivados, não medidos: `right: 0` porque o wrapper é `w-full` e sua borda direita é a da área útil; `488 = 408 + 80`, onde 408 é o `pt-102` do wrapper e 80 é o `y` do degrau, ambos constantes já existentes no sistema.

**Alternativa considerada:** reestruturar o `.services_shape` em dois elementos — o corpo (retângulo arredondado de largura cheia, começando em `y=80`) e a "orelha" esquerda como pseudo-elemento — de modo que `(W, 80)` virasse um canto de box. Descartada: o arco côncavo de raio 34 continuaria exigindo recorte, então a reestruturação adicionaria um elemento sem eliminar o `clip-path`.

### D3 — `xl` também converte, apesar de já estar correto

Em `xl` as duas larguras são fixas por outros meios (o vídeo por `xl:w-149.5`, o bloco de serviços pelo teto de 80rem do `container`), então os paths de `xl` já correspondem ao elemento. Ainda assim eles convertem para a mesma forma.

O motivo é remover uma dependência silenciosa: o requisito "Encaixe estável acima de 1280px" existe hoje justamente porque uma futura alteração no override `@utility container` quebraria o encaixe sem aviso. Convertendo `xl`, esse acoplamento deixa de ser carga estrutural e o requisito vira redundância defensiva. Em troca, os três breakpoints passam a ter estrutura idêntica e o overlay de D2 vale para todos sem media query de recorte.

### D4 — O vídeo migra de `sm:` para `md:`

A faixa 640–767px nunca teve geometria de encaixe. Duas saídas eram viáveis: desenhar um quarto par de paths para ela, ou alinhar a visibilidade do vídeo à geometria existente.

A migração para `md:` foi escolhida por não inventar design novo — desenhar paths para `sm` exigiria decidir onde fica o entalhe em tablet-retrato, uma escolha de design que este change não tem mandato para fazer. Migram juntos: `hidden sm:block` → `md:block`, `sm:absolute` → `md:absolute`, `sm:relative` → `md:relative`, `sm:pt-102` → `md:pt-102`, `sm:pt-34` → `md:pt-34`. O `pt-102` migrar junto é essencial: ele reserva 408px de espaço para o vídeo, e sem o vídeo isso seria um buraco.

O `clip-path: inset(0 round var(--radius-2xl))` da regra base de `.video_shape` deixa de ter efeito visível (o vídeo está oculto abaixo de 768) mas permanece como estado inicial coerente.

### D5 — A largura da `section` passa a ser declarada

`@utility container { max-width: 80rem }` **substitui** o `container` do Tailwind v4 em vez de estendê-lo, então o projeto não tem `width: 100%` nem `margin-inline: auto` — apenas o teto. A largura resultante hoje depende da resolução de tamanho intrínseco do flex pai (`flex flex-col items-center`), que por acaso produz o valor certo.

Como toda a geometria do encaixe é calculada sobre `W`, essa dependência é declarada explicitamente: `w-full` na `section` e `lg:mx-auto` → `mx-auto`. O `mx-auto` incondicional é inócuo abaixo de 1280px (não há sobra para distribuir) e correto acima.

### D6 — Rótulos quebram em vez de truncar

`text-nowrap` + `overflow-hidden` no `h3` dos cards. A célula mais estreita tem 3 de 12 colunas:

```
em vw=768:  célula = (736 − 11×16)/12 × 3 + 2×16 = 172px
            − p-4 (32) − ícone e gap (~28)        = 112px úteis
"Mobile Development" em text-sm                   ≈ 130px  ✗
"API & Integrations" em text-sm                   ≈ 125px  ✗
```

Remover `text-nowrap` permite duas linhas. As linhas do grid são `auto-rows-[60px]` com `row-span-2` — altura automática, então a célula acomoda a segunda linha. O ícone recebe `shrink-0` para não ser comprimido pelo título mais longo.

### D7 — `max-width` em elemento inline é inerte

`max-width` não se aplica a elementos inline não substituídos. Três ocorrências no código-fonte declaram um cap que nunca teve efeito:

| Local | Declaração | Efeito hoje |
|---|---|---|
| `ServicesSection:158` | `<span className="max-w-3xl">` | inerte — parágrafo corre a largura toda |
| `Hero:55` | `<motion.span className="max-w-lg">` | inerte — mesmo caso |
| `Hero:60` | `<motion.span className="max-w-106.5 flex">` | **válido** — o `flex` dá display de bloco |

As duas primeiras viram elementos de bloco. `SectionHeading:39` já usa `<div className="max-w-3xl">` e é o padrão a seguir. Os demais `<span>` que envolvem `<p>`/`TextReveal` nesses componentes são normalizados junto, por serem bloco dentro de inline.

### D8 — Hero ganha escala responsiva

`p-20` (80px) no root + `p-10` (40px) no painel interno = 120px por lado, sem variante. Em 375px sobram 135px de área útil para um `h1` de `text-6xl` (60px) com `leading-20` (80px). A correção escalona padding, tamanho de fonte e `leading` por breakpoint, mantendo os valores atuais intactos a partir de `lg`. Os dois CTAs, hoje `w-full` lado a lado, empilham abaixo de `sm`.

## Risks / Trade-offs

- **O entalhe desliza proporcionalmente dentro de cada breakpoint** → Consequência direta e aceita de D1. Ancorado em px a partir da esquerda, o entalhe fica em 64% da largura em 768px e em 48% em 1023px. Aceito conscientemente em troca de risco zero de suporte; `shape()` (D1, alternativas) é o caminho para eliminá-lo quando o piso de navegadores permitir.
- **A interseção de `clip-path` com `border-radius` é a base de tudo** → O comportamento já é explorado no eixo vertical e está documentado no próprio `globals.css`, mas passa a ser carga estrutural em cinco cantos em vez de dois. Deve ser verificado explicitamente em Chromium, WebKit e Gecko antes de considerar o change pronto.
- **O overlay de canto depende de `top: 488px`** → É um número derivado de `pt-102` + `y=80`. Se algum dos dois mudar, o overlay descola. Mitigação: comentário no CSS com a derivação, no mesmo padrão do bloco que já documenta G/R/W, e as duas constantes expressas como uma soma legível em vez de `488`.
- **`99999` no eixo X aumenta a bounding box do recorte** → O mesmo valor já é usado no eixo Y sem problema observado; a área efetivamente pintada continua limitada pelo box do elemento. Ainda assim, vale conferir se o `will-change: transform` combinado com uma bounding box muito grande não penaliza a composição em telas de baixa potência.
- **Quebrar títulos em duas linhas altera o ritmo visual do grid** → Cards de 3 colunas com título de duas linhas ficam mais densos que os vizinhos. É preferível a truncar, mas é uma mudança visível que o design deve aprovar.
- **Não há test runner no projeto** → Toda a verificação é visual e manual. Mitigação: a varredura de larguras está enumerada explicitamente nas specs (768, 900, 960, 1023, 1024, 1150, 1279, 1280, 1600) para que a checagem seja reprodutível em vez de exploratória.

## Migration Plan

Mudança puramente visual, sem migração de dados, sem alteração de contrato e sem feature flag. Rollback é `git revert` do commit.

A ordem importa para conseguir verificar cada peça isoladamente:

1. **D5** (largura explícita da `section`) primeiro — fixa `W` como contrato antes de mexer na geometria que depende dele.
2. **D1 + D3** (conversão dos seis paths) — nesse ponto o conteúdo já para de ser amputado, com um canto quadrado visível.
3. **D2** (overlay de canto) — fecha a geometria.
4. **D4** (migração `sm:` → `md:`) — independente dos anteriores, verificável isoladamente na faixa 640–767.
5. **D6, D7, D8** — independentes entre si e da geometria; podem ser verificados em qualquer ordem.

## Open Questions

- **`md:grid-rows-[repeat(20px)]` em `ServicesSection:165` não é CSS válido** — `repeat()` exige contagem e trilha. A declaração provavelmente está sendo descartada pelo browser, e quem sustenta o grid é `md:auto-rows-[60px]`. Fora do escopo deste change, mas convém confirmar se era intencional ou resíduo.
- **A quebra de título em duas linhas (D6) precisa de aval de design?** A alternativa seria alargar as células de 3 para 4 colunas nos slots com rótulos longos, o que redistribui o grid inteiro e sai do escopo de "não redesenhar".
- **Os CTAs do Hero empilham em qual largura?** D8 assume abaixo de `sm` (640px). Se o design pretende mantê-los lado a lado em 375px, os rótulos precisam de um tamanho de fonte menor em vez de empilhamento.
