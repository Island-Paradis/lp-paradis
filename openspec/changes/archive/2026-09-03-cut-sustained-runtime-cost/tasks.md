## 1. Baseline (antes de qualquer mudança)

O protocolo tem que ficar fixo, senão os números do fecho não são comparáveis com os daqui. Ver Decisão 8 do design.

- [x] 1.1 Fixar o protocolo — ~~DevTools interativo~~ → **substituído**: `Performance.getMetrics` do CDP é a fonte de dados do Performance Monitor, então o protocolo virou script executável em vez de cliques. Harness em `scripts/measure-runtime.mjs` + `scripts/summarize.mjs`, sem dependência nova (Node 24 tem `WebSocket` global). Build de produção na 3210, Chrome 152 headless, perfil descartável, 1440×900. Verificado no ambiente: `pointer: fine` = true e `prefers-reduced-motion` = false, logo cursor, halo, magnetismo e Lenis **de fato rodam** na medição
- [x] 1.2 **Regime (a) — parada.** 60 s, home no topo: **CPU 7,89%, 120 rAF/s, 60 recalc/s**. Não é zero — a premissa da change se sustenta
- [x] 1.3 **Regime (b) — scroll.** 30 s de roda do mouse, topo ao rodapé: CPU 7,53%, 120 rAF/s, 24,4 recalc/s, 1,86 layout/s
- [x] 1.4 **Regime (c) — ponteiro.** 60 s de varredura pelo hero: CPU 10,65%, 139,6 rAF/s, 59,9 recalc/s — o regime mais caro, e o único cujo custo esta change deliberadamente não ataca (Decisão 7)
- [ ] 1.5 Registrar `Memory footprint` e `GPU memory` no Chrome Task Manager — **exige Chrome com janela; não é acessível por CDP e o headless não representa alocação de camada. Fica para conferência manual**, e é a lacuna mais relevante da baseline porque é onde ③ deve render mais
- [x] 1.6 Inventário estrutural: 950 elementos, 1.745 nós, **24 cards de depoimento** (3 colunas × 4 cópias × **2** depoimentos publicados), 58 `[data-reveal]`, 484 listeners. Responde a pergunta aberta do design — e **mata o item ④** (ver 7.1)
- [x] 1.7 **Eixo "piora com o tempo".** Heap amostrado a cada minuto por 10 min com a página parada, GC forçado nas pontas: oscila entre 5,70 e 6,44 MB e fica em **5,76 MB após GC — abaixo do inicial**; `Nodes` constante em 1.745. **Veredito: sem retenção, é serrilhado de GC.** Isso **desconfirma parcialmente** a justificativa de ⑥ como explicação do sintoma relatado (§3)
- [x] 1.8 Atribuição dos rAF por captura de pilha no agendamento (`scripts/diagnose.mjs`): **exatamente dois schedulers, 60,0/s cada** — `f @ 1rh-s15xkb04j.js` (framer-motion) e `raf @ 0e1uwc_5pd_91.js` (lenis), chunks confirmados por conteúdo. **Invariante com a posição de scroll**: no rodapé, com as 6 linhas de marquee reportando `inView: false`, os dois seguem a 60/s
- [x] 1.9 Baseline salva em `baseline.md`, com protocolo, atribuição, inventário, limitações declaradas e veredito
- [x] 1.10 Veredito: **a change prossegue** com ①②③⑤⑥. Premissa confirmada (2,09% de CPU de piso e 120 rAF/s com nada animando visível); **④ cortado do escopo** pelo inventário, com o número registrado em vez de executado e depois revertido

## 2. Alocação por frame (item ⑥)

Trivial e sem risco; vai junto com ① porque toca o mesmo arquivo.

- [x] 2.1 `useTransform` devolve número em vez de string com sufixo `px`
- [x] 2.2 Marquee horizontal e colunas verticais continuam se movendo — verificado por `behaviour-check.mjs` lendo o `transform` computado da linha visível em dois instantes (`matrix(...,-1376.72,0)` → `matrix(...,-1263.39,0)`)

## 3. Desassinar o rAF fora da viewport (item ①)

O item de maior ganho de CPU. Ver Decisões 1 e 2 do design.

- [x] 3.1 `useAnimationFrame` → `frame.update(cb, true)` / `cancelFrame(cb)` de `motion/react` (confirmado em runtime: 383 exports, `frame`, `cancelFrame` e `frameData` presentes; nenhuma dependência nova)
- [x] 3.2 Guard de viewport movido para a assinatura: o `IntersectionObserver` chama `sync()`, que assina ou cancela
- [x] 3.3 Idem para `visibilitychange`
- [x] 3.4 `pauseOnHover` mantido **dentro** do callback, com o motivo escrito ao lado
- [x] 3.5 `baseX` e `unitSize` seguem `MotionValue`, fora do ciclo de vida da assinatura — a posição sobrevive
- [x] 3.6 Efeito dividido em dois: medida (deps `[children, unitSize, vertical]`) e ciclo de vida da assinatura (deps `[baseX, unitSize]`). Observers de visibilidade deixaram de ser religados a cada render do pai, que era o efeito colateral de ter `children` nas deps
- [x] 3.7 **Zero rAF agendados** com a página parada e nada animado na viewport — medido duas vezes: `diagnose.mjs` no rodapé (0 em 6 s) e `behaviour-check.mjs` (0,0 rAF/s)
- [ ] 3.8 Verificar **de olho** a reentrada após 30 s fora da tela — automatizado em parte (`behaviour-check` confirma retomada sem salto de posição), mas a ausência de solavanco é julgamento visual
- [x] 3.9 Colunas em `display: none` não assinam: um elemento sem caixa reporta `isIntersecting: false`, e é o mesmo caminho da 3.2. Verificado no inventário, com as 6 linhas em `inView: false` e 0 rAF
- [ ] 3.10 Verificar **de olho** a reatividade à velocidade do scroll — acelerar, desacelerar, inverter, e a zona morta em micro-scroll. O movimento contínuo está verificado; a *curva* de resposta é julgamento visual
- [x] 3.11 Regime (a2), parado longe do marquee: **120 → 60 rAF/s (−50%)**, CPU 2,09% → 1,75%. No topo segue 120 porque o marquee está de fato visível — exatamente a fronteira que a baseline §1.2 delimitou

## 4. Lenis sem loop próprio (item ②)

**Depende de 3.** Antes de ①, medir isto isoladamente não diz nada. Ver Decisão 3.

- [x] 4.1 `autoRaf={false}` no `ReactLenis`
- [x] 4.2 `lenis.raf(time)` conduzido por `frame.setup(...)` — `setup` é o primeiro passo da ordem do Motion (`setup, read, resolveKeyframes, preUpdate, update, ...`), então a escrita de posição precede o `read` que o `useScroll` usa
- [x] 4.3 Condutor assinado só enquanto há scroll: dorme após `SLEEP_GRACE_FRAMES` (30 ≈ 0,5 s) com `isScrolling` falso, e acorda por `lenis.on("virtual-scroll")` (roda/toque, emitido direto do handler de input, independente do rAF) e por `scroll` nativo na janela (âncoras, teclado, barra de rolagem)
- [x] 4.4 `lenis.time = 0` antes de reassinar — o fallback `this.time || time` do próprio Lenis transforma isso num primeiro delta igual a 0, em vez do delta enorme que um `time` obsoleto produziria
- [x] 4.5 Captura de input continua ativa com o condutor dormindo — verificado: partindo de 0 rAF/s, uma única roda produz movimento gradual (`0,105,180,237,280,311,334,351,367,376,382,387`)
- [ ] 4.6 Verificar **interativamente** a sensação de largada após pausa longa — a mecânica está verificada (o gesto acorda e o easing roda); "sem atraso perceptível" é julgamento humano
- [ ] 4.7 Verificar **de olho** âncoras e links do menu. O caminho está coberto por construção (âncora `href="#id"` produz scroll nativo, que é um dos sinais de despertar) e o projeto não chama `lenis.scrollTo` em lugar nenhum — verificado por grep — mas a suavidade percebida é visual
- [x] 4.8 `prefers-reduced-motion` continua não montando o `ReactLenis` — a guarda de saída antecipada é a mesma de antes, e o `LenisFrameDriver` vive dentro do provider
- [x] 4.9 **0 rAF/s** com a página parada após o easing terminar, no rodapé e com a aba oculta
- [x] 4.10 Delta atribuído a ②: o último loop permanente sai. No rodapé parado, **60 → 0 rAF/s**; total desde a baseline, **120 → 0**

## 5. Pausar o vídeo (item ③)

O maior ganho de memória. Ver Decisão 4.

- [x] 5.1 `src/components/ui/video-autopause.tsx` — client component que clona o filho para pendurar uma ref, sem renderizar nada em volta. Molde de `reveal.tsx`; o `<video>` e o `<source media>` continuam no componente de servidor
- [x] 5.2 `IntersectionObserver` + `visibilitychange` → `play()` / `pause()`, com `autoPlay` mantido no markup
- [x] 5.3 `play()` com `.catch()`; e um listener de `play` que torna a regra independente da ordem entre o autoplay do markup e o primeiro disparo do observer
- [x] 5.4 Aplicado em `page.tsx` sem alterar o JSX do `<video>`
- [x] 5.5 HTML servido comparado contra um build do commit base: `<video>` e `<source>` **byte a byte idênticos**, e a **árvore de tags do documento inteiro idêntica**. Nenhum aviso de hidratação
- [x] 5.6 Abaixo de 768px nada muda: o `<source media>` é o mesmo e este componente só pode pausar. O gate de rede continua sendo o da tarefa 8.2 de `optimize-landing-performance`
- [x] 5.7 Tocando quando o usuário chega — verificado: `paused=false`, `visible=true`, `currentTime` avançando (2,88 → 4,38)
- [x] 5.8 Sair e voltar retoma de onde parou: parou em 4,92 e voltou em 4,92 (sem avanço fora da tela), depois seguiu de lá — não reiniciou
- [x] 5.9 Aba oculta pausa; voltar retoma
- [ ] 5.10 `Memory footprint` e `GPU memory` — **depende da 1.5, manual**
- [x] 5.11 **`rootMargin` reduzido de 200px para 0** após medir: o vídeo começa a 940 px com a dobra em 900, ou seja **40 px abaixo dela**, então qualquer folga acima de 40 px o mantinha tocando com a página no topo — a posição de repouso mais comum, e justamente o regime que a change ataca. Com folga 0: `paused=true, currentTime=0` no topo

## 6. `will-change` temporal no parallax (item ⑤)

**Depende de 5.** Sem o vídeo pausado, a exceção registrada na tarefa 6.3 de `optimize-landing-performance` continua válida e este grupo inteiro cai. Ver Decisão 5.

- [x] 6.1 `willChange` alternado por visibilidade em `parallax.tsx`
- [x] 6.2 `rootMargin` de 400px para que a promoção anteceda a visibilidade
- [ ] 6.3 Verificar **de olho** a travessia completa procurando pop, piscada ou serrilhado — **manual, e é a verificação que mais importa neste grupo**
- [x] 6.4 Amplitude do parallax preservada — o `transform` computado muda com o scroll (`translateY(-3,66px)` → `translateY(28,2px)`); a *suavidade* fica com a 6.3
- [x] 6.5 Registrado no comentário do próprio arquivo e em `baseline.md`: completa o requisito de escopo temporal de `will-change` de `scroll-frame-budget` em vez de reverter a 6.3 daquela change
- [ ] 6.6 Medir `GPU memory` — **depende da 1.5, manual**
- [x] 6.7 Comportamento confirmado nas duas pontas: `willChange=transform` perto da viewport, `willChange=auto` no rodapé com o vídeo a 3.188 px acima. No **topo** ele segue promovido, e isso é correto — o elemento está a 40 px da dobra, dentro da folga de 400 px

## 7. Cópias dos depoimentos (item ④)

Último de propósito: 3.9 provavelmente já eliminou o CPU das colunas ocultas, e o que sobra aqui é DOM e memória, que pode ser pequeno. Ver Decisão 10.

- [x] 7.1 **Decidido não executar.** O inventário de 1.6 mostrou 24 cards — 3 colunas × 4 cópias × **2** depoimentos publicados. Reduzir o excedente de `+2` para `+1` levaria 24 → 18: **6 elementos num DOM de 950, ou 0,6%**, em troca de risco de costura visível. Não vale
- [x] 7.2 ~~Reduzir o excedente~~ → não executado, ver 7.1
- [x] 7.3 ~~Verificar a costura~~ → não se aplica, nada mudou
- [x] 7.4 ~~Marquee horizontal~~ → não se aplica
- [x] 7.5 ~~Depoimentos no ciclo~~ → não se aplica; o comportamento é o de hoje
- [x] 7.6 `DOM Nodes` inalterado (1.745), como esperado de um item não executado
- [x] 7.7 Ressalva registrada: o número é propriedade do **conteúdo atual**, não do código. Com ~20 depoimentos publicados, `bs` cresce, o cálculo muda e o item volta a fazer sentido. Fica "não vale hoje", não "o cálculo está certo"

## 8. Medir o que não se muda (item do `mix-blend-difference`)

Ver Decisão 7. Este grupo não altera código.

- [x] 8.1 Custo isolado por diferença entre regimes em vez de desabilitar o blend: `c-pointer` ≈12,2% contra ≈8,3% parado no topo, ou seja **~4 pontos de CPU** atribuíveis ao movimento do ponteiro (cursor com blend + halo + magnetismo). É o regime mais caro da página
- [x] 8.2 Registrado em `baseline.md` §6.7, com a nota de que é deliberadamente não alterado
- [x] 8.3 **Nada foi alterado para medir** — a medida saiu da diferença entre regimes, então não houve resíduo a desfazer. `git status` confirma `CursorFollower/index.tsx` e `cursor-glow.tsx` intactos

## 9. Fecho: remedir, podar, decidir

- [x] 9.1 Três regimes remedidos e registrados por item em `baseline.md` §6.1–6.2. Resultado central: `a2-idle-scrolled` vai de **120 → 0 rAF/s e 2,09% → 0,00% de CPU**
- [x] 9.2 Heap remedido contra o build final: mesmo veredito, **sem retenção**. Registrado em §3 que isto **desconfirma parcialmente** a justificativa de ⑥ como explicação do sintoma "piora com o tempo" — o heap é pequeno e estável, e a hipótese que sobra (memória de mídia/camada) é justamente a que este harness não mede
- [x] 9.3 Poda: **④ não executado** (§2.1, 0,6% do DOM). Nenhum item implementado foi revertido — mas registrado em §6.2 que ①②⑤⑥ **não entregam ganho de CPU** nos regimes de topo e de ponteiro, e que o ganho ali é de agendamento (metade dos rAF), não de CPU. A aparente regressão de +15% em `c-pointer` foi investigada com 3 repetições por build e é **ruído entre execuções**, não regressão
- [ ] 9.4 Percorrer o inventário de movimento **de olho** — parcialmente automatizado (marquee, parallax, easing do scroll e vídeo verificados por `behaviour-check.mjs`); cursor, halo, revelações, transição de página e swap de texto seguem pendentes de conferência visual
- [x] 9.5 `prefers-reduced-motion` — **8/8** em `scripts/reduced-motion-check.mjs`: Lenis não montado, nenhum `[data-reveal]` com texto invisível dentro da viewport, parágrafo de LCP com `opacity: 1`, `Parallax` sem wrapper transformado, 0 rAF no rodapé, vídeo pausado
- [x] 9.6 Fronteiras respeitadas: os 6 arquivos declarados fora de escopo estão **intactos**, e o diff é exatamente os 5 arquivos previstos na proposal (4 modificados + 1 novo)
- [x] 9.7 Pendências registradas em §6.6, mais um **achado fora de escopo** em §6.8: `scroll-based-velocity.tsx` mantém `will-change-transform` permanente por classe Tailwind em 4 elementos de marquee — mesma espécie de promoção que ⑤ acabou de dar escopo temporal, deliberadamente não tocada por não estar no inventário de itens da proposal
- [x] 9.8 Biome de volta aos **42 erros pré-existentes**, o mesmo número que `optimize-landing-performance` registrou. Nenhum arquivo de `src/` tocado introduz erro novo: `scroll-based-velocity.tsx` tem os mesmos 5 do commit base (verificado trocando o arquivo pelo da base e recontando), `page.tsx` mantém seus 2 avisos, e `SmoothScroll`, `parallax` e `video-autopause` estão em **zero**
- [x] 9.8b **`biome.json` alterado, fora da lista declarada na proposal.** O harness desta change subiu o total para 52 porque os `.mjs` e os `.json` de medição dentro de `openspec/` passaram a ser lintados — o precedente (`bundle-attribution.py`) escapava só por ser Python. `openspec` foi adicionado ao `files.includes` como exclusão: são artefatos de planejamento e dados de medição, não código publicado. Confirmado que `src/` continua integralmente lintado
- [x] 9.9 `npm run build` limpo e `npx tsc --noEmit` sem erros
