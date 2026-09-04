## Why

A landing page consome CPU e memória de forma **sustentada** em desktop: durante o scroll, ao mover o ponteiro, e — o achado que motiva esta change — **com a página parada, sem ninguém interagindo**, piorando quanto mais tempo a aba fica aberta.

Isso é um eixo diferente do que `optimize-landing-performance` mediu. Aquela change instrumentou **bytes até a primeira pintura**: first-load JS, LCP, TBT, peso transferido. O Lighthouse, que é o instrumento dela, observa os primeiros ~20 segundos de carregamento e depois vai embora. Uma aba que acorda a CPU 120 vezes por segundo pelas próximas duas horas é invisível para ele.

O baseline daquela change já derrubou a explicação fácil: **as bibliotecas de animação somam 1,2% do bundle**. O problema nunca foi "tem animação demais". É que quatro assinantes de `requestAnimationFrame` nunca se desinscrevem, um vídeo de 9,6 MB decodifica para sempre, e três colunas de depoimentos mantêm no DOM nove cópias de cada card. Nada disso é um efeito visual — é infraestrutura de efeito visual que continua ligada quando o efeito não está sendo visto.

## What Changes

**Camada 1 — o trabalho que nunca para (CPU ociosa)**

- ① `ScrollVelocityRow` deixa de manter o callback de `useAnimationFrame` assinado quando a linha está fora da viewport ou a aba está oculta. Hoje o guard existe, mas **dentro** do callback: `frame.update(cb, keepAlive = true)` mantém quatro callbacks (1 marquee de serviços + 3 colunas de depoimentos) num conjunto persistente que o batcher reagenda todo frame, para sempre. Eles rodam e retornam cedo. O guard passa a governar a assinatura, não o corpo.
- ② Lenis deixa de rodar seu próprio `autoRaf`. O `ReactLenis` liga `autoRaf: true` por padrão e o loop se reagenda incondicionalmente — um segundo `requestAnimationFrame` permanente, independente do primeiro. Passa a ser conduzido por um único loop, ou parado quando não há scroll em curso.
- ③ O `<video>` de fundo pausa fora da viewport e com a aba oculta, e retoma ao reentrar. Hoje ele é `autoPlay muted loop` sem nenhum observador: decodifica continuamente mesmo com o usuário no FAQ, três telas abaixo.

**Camada 2 — o que fica retido (memória)**

- ④ O número de cópias da coluna vertical de depoimentos passa a ser derivado do que a viewport exige, em vez de um piso de 3 cópias por coluna. Hoje são **≥ 3 colunas × 3 cópias × N depoimentos** de cards vivos, cada um com um `next/image`, um SVG de rede social, `shadow-xl/5` e `border-3`.
- ⑤ Reabre a decisão registrada em `optimize-landing-performance` 6.3 — o `will-change: transform` permanente do `Parallax`. O argumento que a manteve ("aquele elemento de fato anima `y` continuamente") é correto, mas foi tomado antes de ③: o elemento promovido é o que segura os frames decodificados do vídeo. Com o vídeo pausado fora da viewport, a promoção permanente perde parte da justificativa. **Reabertura, não reversão** — o item exige medida nova para decidir.
- ⑥ `useTransform` em `scroll-based-velocity.tsx` deixa de montar uma string por linha por frame. Motion aceita número para `x`/`y` e o interpreta como px, então a alocação é eliminável sem mudar o resultado. Quatro linhas a 60 Hz são ~240 strings descartadas por segundo, indefinidamente — lixo constante alimentando GC, que é a hipótese mais direta para "piora com o tempo aberta".

**Transversal — o instrumento**

Esta change define um alvo de aceitação próprio, e ele **não é o do Lighthouse**: desktop, aba aberta em `/pt`, medida pelo Performance Monitor do Chrome (CPU usage, JS heap size, DOM nodes) em três regimes — parada, rolando, com o ponteiro em movimento — mais heap snapshots comparativos ao longo de 10 minutos para o eixo "piora com o tempo". Cada item precisa de um antes/depois nesse instrumento, não de uma justificativa teórica.

## Capabilities

### New Capabilities

- `idle-runtime-budget`: o que a página tem permissão de custar quando nada está acontecendo — loops de animação que continuam agendados sem trabalho, animação fora da viewport que é ignorada em vez de desassinada, e mídia com reprodução automática que não pausa. Cobre a camada 1.
- `client-memory-budget`: o que a página tem permissão de reter durante uma sessão, e por quanto tempo — duplicação de DOM para efeito visual, camadas de composição permanentes, retenção de buffers de mídia, e crescimento monotônico de heap com a página parada. Cobre a camada 2.

A divisa entre as duas é deliberada e vale para o vídeo, que aparece nas duas: **`idle-runtime-budget` é dona de "não roda"; `client-memory-budget` é dona de "não retém".** Pausar o decode é a primeira; liberar buffers e camadas é a segunda.

Ambas herdam a restrição de fechamento das capabilities de `optimize-landing-performance`: nenhuma otimização pode alterar o efeito visual percebido. É o que separa esta change de "remover as animações" — e, neste caso específico, é uma restrição barata de honrar, porque quase tudo aqui é trabalho gasto em efeito que ninguém está vendo.

### Modified Capabilities

Nenhuma. `homepage-shape-interlock` é a única capability já em `openspec/specs/`, e esta change **não toca** `translateZ(0)` em `.video_shape` / `.services_shape` — a decisão de mantê-lo, registrada na 6.1 daquela change, é respeitada aqui sem reabertura.

## Impact

**Código**

- `src/components/ui/scroll-based-velocity.tsx` — itens ①, ④ e ⑥. É o arquivo mais afetado, e o único cujo comportamento interno muda de verdade.
- `src/components/SmoothScroll/index.tsx` — item ②.
- `src/app/(app)/[locale]/page.tsx` — item ③, o `<video>`. Provavelmente exige extrair um client component pequeno para o observador, com a mesma cautela de hidratação que o comentário existente ali já documenta.
- `src/components/ui/parallax.tsx` — item ⑤, condicional à medida.
- `src/components/TestimonialsSection/index.tsx` — item ④, se o teto de cópias precisar de informação que só o call site tem.

> **Acrescentado durante a implementação:** `biome.json` passou a excluir `openspec` de `files.includes`. O harness de medição desta change vive em `openspec/changes/<nome>/scripts/` (precedente de `bundle-attribution.py`), mas em `.mjs`/`.json` em vez de Python — e portanto passou a ser lintado, subindo o total do repositório de 42 para 52 erros. São artefatos de planejamento e dados de medição, não código publicado. `src/` continua integralmente lintado.
>
> **Item ④ não foi executado.** O inventário mediu 24 cards de depoimento (2 depoimentos publicados), então o item entregava 0,6% do DOM em troca de risco de costura. Decisão registrada em `baseline.md` §2.1 e na tarefa 7.1; `TestimonialsSection/index.tsx` e o cálculo de cópias ficaram intactos.

**Fronteiras com trabalho em andamento**

- `optimize-landing-performance` (31/51) é dona de `CursorFollower`, `cursor-glow.tsx`, do `backdrop-blur` em `NavBarRoot`, do `will-change` em `globals.css` e do `<source media>` + poster do vídeo. Esta change **não re-litiga nenhum deles**. Do vídeo, ela toca só a reprodução; do `Parallax`, só reabre a 6.3 com argumento novo e medida nova. A decisão pendente sobre a intensidade do blur da nav (tarefa 9.6) continua sendo daquela change.
- `prevent-invisible-text` (58/60) é dona do contrato `data-reveal` e do failsafe em `layout.tsx`. Nada aqui toca `reveal.tsx` ou `text-reveal.tsx`.
- `fix-responsive-content-clipping` (34/49) toca `globals.css` e os shapes. Esta change não toca `globals.css`, o que elimina a superfície de conflito.

**Fora de escopo, deliberadamente**

- **O `mix-blend-difference` do `CursorFollower`.** É custo de composição por frame sobre a página inteira enquanto o ponteiro anda, e é real. Mas é também o que torna o ponto legível sobre fundo claro e escuro — removê-lo violaria a restrição de fechamento. Fica **medido e não alterado**, como um número que informa uma decisão futura de produto, no mesmo espírito da tarefa 9.6 da change anterior.
- **A contagem de `IntersectionObserver` dos `Reveal`.** São ~30 observers vivos porque a primitiva não usa `once`, e essa escolha está argumentada por escrito em `reveal.tsx`. O ganho é pequeno, o arquivo pertence a `prevent-invisible-text`, e mexer nele colidiria com duas changes abertas ao mesmo tempo.
- **Trocar Lenis por scroll nativo.** Item ② muda **como** o loop do Lenis é agendado, não se ele existe. Remover o smooth scroll é remover uma animação.

**Risco**

O item de maior risco é ① — não pelo efeito, que é invisível, mas porque desassinar e reassinar um loop de animação introduz um instante de transição. Uma linha que reentra na viewport precisa retomar de onde parou, sem salto de posição e sem um frame de `delta` gigante acumulado. É a única parte desta change onde um erro é visível, e o design precisa dizer como isso é evitado.

O item ② tem risco de responsividade: se o loop do Lenis for parado cedo demais, o primeiro evento de wheel depois da pausa chega a um loop dormindo.

Os demais são invisíveis se feitos certo, e a checagem de que continuam invisíveis é parte da definição de pronto.
