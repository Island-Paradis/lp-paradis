## Context

A landing page é inteiramente dirigida por Payload, renderizada em RSC, e sua identidade é o movimento: cursor customizado, halo no hero, marquee reativo à velocidade de scroll, parallax, revelações por bloco e por palavra, transição de página. O scroll é conduzido por Lenis.

O diagnóstico que originou esta change (ver `proposal.md`) separou o custo em duas camadas, e a conclusão foi que **as animações não são o problema**. O `scroll-based-velocity.tsx`, o componente com mais máquina de animação do projeto, já pausa fora da viewport, pausa com a aba escondida e respeita `prefers-reduced-motion`. O que custa está nas decisões ao redor: um barril de ícones que não pode ser tree-shaken, fontes em TTF, e quatro pontos que pagam layout ou paint por frame.

O Lenis muda a economia do problema de um jeito que vale explicitar, porque é a razão de metade desta change existir:

```
scroll nativo:   eventos esporádicos, coalescidos pelo browser
                 └─▶ ler layout num handler é ocasional

com Lenis:       rAF conduz o scroll; evento a CADA frame durante o easing
                 └─▶ ler layout num handler é layout forçado por frame,
                     dentro do próprio frame de animação
```

Duas changes estão abertas e tocam território adjacente. `prevent-invisible-text` (58/60) é dona do script de failsafe em `layout.tsx`, da marcação `data-reveal` e da rede de segurança no fim de `globals.css`; `fix-responsive-content-clipping` (34/49) toca os mesmos shapes em `globals.css`. O escopo desta change foi cortado para minimizar a superfície compartilhada.

O alvo de aceitação é **Android médio, CPU throttled 4x, rede 4G** — escolhido porque é onde as duas camadas doem simultaneamente, e onde a diferença entre "otimização real" e "otimização que só aparece no gráfico" fica visível.

## Goals / Non-Goals

**Goals:**

- Reduzir o bundle crítico eliminando a causa estrutural, não sintomas: um import que impede tree-shaking, e um formato de fonte que não deveria chegar ao browser.
- Eliminar layout forçado e animação sobre propriedades de layout do caminho de scroll e de ponteiro.
- Preservar integralmente o movimento percebido. Este é um goal, não uma restrição periférica: um item que só rende performance ao custo de movimento é revertido.
- Deixar cada ganho medido no perfil de referência, com baseline registrada, para que um item sem efeito real possa ser identificado como tal.

**Non-Goals:**

- Refatorar os `IntersectionObserver` por palavra do `TextReveal`. Três usos, headlines curtas, ganho pequeno, e o refactor esbarra no contrato de `prevent-invisible-text`.
- Substituir Lenis por scroll nativo. Isso é remover uma animação, e é exatamente a saída que a change existe para não tomar.
- Reintroduzir `viewport once` no `Reveal`. Já foi decidido contra, com a justificativa registrada no próprio arquivo, e a decisão continua válida.
- Otimizar o admin do Payload ou qualquer rota fora de `(app)/[locale]`.

## Decisions

### 1. Ícone entra como componente, não como nome

`Button` e `Badge` trocam `trailingIcon?: IconName` / `icon?: IconName` (string) por uma prop tipada como `React.ElementType`. O call site importa o ícone específico com import nomeado estático.

Isto elimina simultaneamente o `import * as Icons` e o `type IconName = keyof typeof Icons` que dependia dele. São quatro call sites no total — `page.tsx:61`, `ProductsSection:26`, `ServicesSection:143`, `SectionHeading:25` — o que torna a troca barata.

**Por que não um mapa nome→componente.** Manteria a API de string e resolveria o tree-shaking, mas cria um registro que precisa ser editado toda vez que alguém quer um ícone novo — um ponto de fricção permanente para eliminar um problema pontual.

**Por que não `next/dynamic` por ícone.** Adiciona um round-trip de rede e um estado de carregamento para um SVG de 24px. O custo de latência superaria o de bytes.

**Precedente no próprio codebase.** `Card`, `ServicesSection` e `MarqueeServices` já importam ícones nomeados diretamente. `Button` e `Badge` são as duas exceções, não o padrão.

### 2. Fontes: WOFF2, e o conjunto de pesos vem de auditoria

`next/font/local` serve o arquivo declarado sem transcodificar. Os 20 TTFs (2.8MB) viram WOFF2.

O conjunto de pesos **não** deve ser derivado apenas dos dois `font-gilroy` encontrados por grep. `--font-gilroy` é exposto como variável de tema em `globals.css`, então pode haver uso indireto. A tarefa inclui auditar antes de cortar — cortar um peso em uso é uma regressão silenciosa que só aparece como fallback de fonte.

Ordem deliberada: **converter primeiro, cortar depois.** A conversão é segura e entrega a maior parte do ganho; o corte de pesos é onde mora o risco, e fica isolado num passo próprio que pode ser revertido sozinho.

### 3. Nav: o blur só existe onde é visível

O achado que decide este item: no estado não-rolado a nav usa `bg-background`, e `--background` é `#ffffff` — **totalmente opaco**. O `backdrop-blur-2xl` está aplicado incondicionalmente e, nesse estado, não produz nenhum efeito visível. É custo puro.

```
hoje:      backdrop-blur-2xl SEMPRE
           ├─ topo (bg opaco)   → blur invisível, custo pago
           └─ rolado (bg /50)   → blur visível, custo pago

depois:    backdrop-blur apenas no estado `scrolled`
           ├─ topo              → nada a borrar, nada a pagar
           └─ rolado            → efeito preservado
```

Isso já remove todo o custo de blur da região onde o usuário começa a rolar, com **zero mudança visual**. Só depois disso, e só se a medição justificar, o passo seguinte reduz a intensidade no estado rolado — que é o único ponto desta change com efeito visual admitido, e o único que precisa de aprovação de olho.

A ordem importa: a parte grátis vem antes da parte negociável, para que a negociação aconteça já sabendo quanto ainda sobrou para ganhar.

### 4. Cursor: escala para baixo a partir do tamanho maior

O `CursorFollower` anima hoje `width`, `height`, `marginLeft` e `marginTop` com mola — quatro propriedades de layout, reflow por frame durante toda a transição. Passa a animar `scale`.

A direção da escala não é indiferente:

```
base 8px  →  scale 11.25x   camada rasterizada a 8px e ampliada → borda borrada
base 90px →  scale 0.089x   camada rasterizada a 90px e reduzida → borda nítida  ✓
```

Logo: elemento com tamanho fixo de 90px (o estado `view`, o maior), escalado **para baixo** nos demais estados. A centralização, que hoje é feita com `marginLeft`/`marginTop` animados, passa a `translate(-50%, -50%)` estático dentro do mesmo `transform` — deixa de ser animação e vira parte da composição.

O label "View" só existe no estado `view`, onde a escala é 1, então não precisa de contra-escala. A decisão registrada no arquivo de não marcar esse label com `data-reveal` permanece válida e pelo mesmo motivo.

O `mousemove` passa a ser coalescido por frame. A distinção que guia isso: `x.set()`/`y.set()` em `MotionValue` não passam pelo ciclo de render do React e ficam como estão; o que é coalescido é o `closest('[data-cursor]')` mais os dois `setState`.

### 5. CursorGlow: o scroll invalida, o mousemove mede

O handler de scroll chama `getBoundingClientRect()` hoje — layout forçado por frame sob Lenis. A correção óbvia (throttle por rAF) não resolve nada: continua sendo um layout forçado por frame, só que ordenado.

A solução é inverter quem faz o trabalho:

```
scroll   →  rectDirty = true          (uma escrita de boolean, zero layout)
mouseenter │
mousemove  ├─▶ if (rectDirty) measure()   (mede só quando alguém vai usar)
           └─▶ usa o rect
resize   →  ResizeObserver → measure()
```

O rect só é lido quando o ponteiro está de fato se movendo sobre o hero, e no máximo uma vez por frame. Rolar sem hover custa uma atribuição de boolean.

**Por que não `event.offsetX/offsetY`.** Seriam relativos ao nó sob o ponteiro, que é qualquer filho do hero, não o hero. Daria coordenadas erradas de forma inconsistente.

### 6. `will-change` sai; `translateZ(0)` fica

`.video_shape` e `.services_shape` carregam `transform: translateZ(0)` **e** `will-change: transform`. O argumento para remover o segundo é mais forte que "é caro": **nenhum dos dois elementos anima o próprio transform.** O parallax anima um `div` interno. `will-change: transform` num elemento cujo transform nunca muda é uma promessa que nunca se cumpre — reserva de camada de GPU pela vida inteira da página, em dois elementos de página inteira, no aparelho onde essa memória é mais escassa.

O `translateZ(0)` permanece: é provavelmente o que existe de fato para estabilizar o rasterizado do `clip-path`, e é a mais barata das duas promoções. Se a remoção revelar artefato de recorte, isso é sinal de que a promoção importa — e ela continua lá.

Este é o único ponto de contato com `fix-responsive-content-clipping`. O conflito de merge, se houver, será nas linhas de `will-change`, não na geometria dos paths.

### 7. Vídeo: `<source media>` decide, não JavaScript

O wrapper do vídeo é `hidden md:block`, mas `display: none` não impede o browser de buscar um `<video autoplay>`. A gate precisa ser real.

Decisão: usar o atributo `media` no `<source>`. Se nenhum source casa, nada é buscado — sem JavaScript, sem `matchMedia`, sem componente de cliente novo.

**Por que não gate por JavaScript.** Exigiria um client component com `matchMedia` e um estado que difere entre servidor e cliente. Este projeto já tem uma cicatriz exatamente aí: o comentário em `HydrationSignal` documenta o React #418 causado por `useReducedMotion()` divergindo entre servidor e cliente, e a cascata que aquilo provocou na rede de segurança de visibilidade. Não vale repetir o padrão por um vídeo decorativo.

**Trade-off aceito.** `media` em `<source>` é avaliado na seleção do source e não é reavaliado em redimensionamento na maioria dos browsers. Redimensionar de mobile para desktop na mesma sessão pode deixar a área sem vídeo até um reload. Para uma landing page, é um caso raro com degradação suave — o `poster` cobre o espaço.

**Poster.** O campo `backgroundVideo` vive na global `HomePage`. O poster acompanha, como campo de upload opcional no mesmo grupo, seguindo a filosofia do projeto de conteúdo dirigido pelo CMS. Isso implica alterar o schema e rodar `npx payload generate:types`. Se esse custo for indesejado, a alternativa é entregar só a gate de media e deixar o poster para depois — o item se divide limpo.

### 8. Medição: analisador embutido do Next 16, não `@next/bundle-analyzer`

`.env` existe no working tree, então `next build` roda e a medição de bundle é viável — era o pré-requisito que poderia ter bloqueado toda a camada 1.

**Revisado durante a implementação.** O plano original previa `@next/bundle-analyzer`. Ele não serve aqui: pluga-se pelo hook `webpack` do `next.config`, e este projeto compila com Turbopack, que ignora esse hook. O Next 16 traz `next build --experimental-analyze`, que escreve `route-bundle-stats.json` (first-load por rota) e um grafo de atribuição por módulo. É estritamente melhor — mesma informação, nenhuma dependência nova — e é o que a change usa, com `scripts/bundle-attribution.py` agregando por pacote.

A medida resultante (ver `baseline.md`) confirmou a tese da change de forma mais contundente do que o diagnóstico estático previa: `@solar-icons/react` é **93,2%** dos bytes de cliente da rota, e toda a máquina de animação somada — `motion-dom`, `framer-motion`, `lenis` — é **1,2%**.

A baseline é tirada **antes do primeiro commit de implementação**, na branch base, e guardada dentro do diretório da change para que o antes/depois sobreviva ao merge. Sem isso, "ficou mais rápido" não é uma afirmação verificável, e a change perde a capacidade de identificar um item que não entregou nada.

## Risks / Trade-offs

**Cortar um peso de fonte que está em uso** → A ordem (converter antes, cortar depois) isola o risco num passo próprio e reversível. O corte só acontece após auditoria explícita de `--font-gilroy`, não a partir do grep de `font-gilroy` em TSX.

**A redução do blur da nav muda a aparência** → É o único item com efeito visual admitido, e por isso foi partido em dois: a parte grátis (remover o blur onde o fundo é opaco, zero mudança visual) vai primeiro e sozinha. A parte negociável vem depois, medida, e é decisão de olho — não de perfilador.

**Escalar o cursor para baixo a partir de 90px muda a qualidade da borda** → A direção foi escolhida justamente por isso, mas `mix-blend-difference` sobre uma camada escalada precisa de conferência visual em tela retina e não-retina. Se a borda degradar, o fallback é manter dois elementos de tamanho fixo e alternar opacidade — mais DOM, mesma classe de custo.

**Remover `will-change` revela artefato de `clip-path`** → O `translateZ(0)` fica no lugar exatamente para cobrir isso. A verificação nos três breakpoints (`md`/`lg`/`xl`) é parte da definição de pronto, e `homepage-shape-interlock` já define o que "correto" significa ali.

**Conflito de merge com `fix-responsive-content-clipping`** → Restrito às duas linhas de `will-change` em `globals.css`. A geometria dos paths não é tocada. Coordenar a ordem de merge resolve; se não houver coordenação, o conflito é trivial de resolver a favor da outra branch mais a remoção.

**`media` em `<source>` não reavalia no resize** → Aceito e documentado acima. Um usuário que redimensiona de mobile para desktop na mesma sessão vê o `poster` em vez do vídeo até recarregar.

**Adicionar campo de poster expande a change para o schema do Payload** → O item se divide: a gate de `media` entrega o ganho de bytes sozinha. O poster é melhoria de percepção e pode sair do escopo sem prejudicar o resto.

**Otimizar sem medir de verdade** → O diagnóstico que originou esta change foi análise estática, não profiling. A ordem de prioridade é uma aposta informada, não um trace. Por isso a baseline vem antes de tudo: se um item medir zero, ele é descartado em vez de defendido.

## Migration Plan

Sem migração de dados. O único passo com efeito fora do código é o campo opcional de poster na global `HomePage`, que é aditivo — conteúdo existente continua válido sem ele.

Ordem de implementação, escolhida para que o risco cresça monotonicamente:

```
  1. baseline medida                     (nada muda ainda)
  2. barril de ícones                    ganho grande, risco ~zero
  3. fontes → WOFF2                      ganho grande, risco ~zero
  4. blur da nav só quando `scrolled`    ganho real, ZERO mudança visual
  5. rect do CursorGlow                  ganho por frame, invisível
  6. will-change                         ganho de memória, verificar shapes
  7. cursor: scale + coalescência        maior refactor, conferir de olho
  8. gate de media do vídeo              ganho mobile
  9. poster do vídeo                     toca schema do Payload
 10. medida final por item               descartar o que não rendeu
 11. blur do estado `scrolled`           ÚNICO item de decisão visual
```

Rollback: cada passo é um commit independente e reversível isoladamente. Nenhum depende do anterior a não ser pela medição.

## Open Questions

- **Quais pesos de Gilroy sobrevivem?** Resolve-se na auditoria do passo 3, não agora. Se a auditoria mostrar uso indireto amplo via `--font-gilroy`, o corte encolhe e só a conversão de formato entrega o ganho — o que ainda é a maior parte dele.
- **O poster do vídeo entra nesta change?** O passo 9 está no plano, mas é o único que toca o schema do Payload. Se a preferência for manter a change fora do CMS, ele sai e o passo 8 entrega sozinho.
- **Quanto blur sobra na nav?** Deliberadamente não decidido aqui. O passo 4 é grátis e vem primeiro; o passo 11 só existe se a medição mostrar que ainda vale, e a decisão é de olho, com número na mão.
