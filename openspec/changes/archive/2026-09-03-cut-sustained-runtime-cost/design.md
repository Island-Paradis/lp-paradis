## Context

A home consome CPU e memória de forma sustentada em desktop, nos quatro regimes: parada, rolando, com o ponteiro em movimento, e piorando ao longo do tempo com a aba aberta.

`optimize-landing-performance` já mediu esta página com rigor, e seu baseline é a base desta change — inclusive porque **exclui** as explicações fáceis. Lá está registrado que as bibliotecas de animação somam 1,2% do bundle e que 96,9% do peso vinha de três itens de carregamento. Nada daquilo explica uma aba parada consumindo CPU, porque o instrumento de lá (Lighthouse) observa os primeiros ~20 s e vai embora.

O estado atual, verificado no código das dependências e não por hipótese:

```
  motion-dom/frameloop/batcher.mjs          lenis/dist/lenis.mjs:726
  ────────────────────────────────          ────────────────────────
  processBatch() reagenda a si mesmo        raf = (time) => {
  SE houver processo keepAlive                ...
                                              if (autoRaf) rafId =
  useAnimationFrame → frame.update(              requestAnimationFrame(this.raf)
      cb, /* keepAlive */ true )            }
                                            ReactLenis default: autoRaf = true
  4 assinantes vivos:
    MarqueeServices        ×1
    TestimonialsSection    ×3 colunas
```

Duas árvores de `requestAnimationFrame` independentes, ambas permanentes, ambas indiferentes ao que está visível. Os guards de viewport existem em `scroll-based-velocity.tsx:197-198`, mas dentro do callback: o callback roda e retorna cedo.

O terceiro fato: o `<video>` de fundo (9,6 MB) é `autoPlay muted loop` sem nenhum observador. Decodifica pela vida inteira da sessão, dentro de um `Parallax` cujo div interno carrega `willChange: "transform"` permanente — uma camada composta dedicada segurando frames de vídeo, promovida para sempre.

**Restrição herdada, e ela é a espinha desta change:** nenhum item pode alterar o efeito percebido. Diferente da change anterior, aqui essa restrição é quase gratuita — praticamente tudo o que se corta é trabalho gasto produzindo efeito que ninguém está olhando.

## Goals / Non-Goals

**Goals:**

- Que a página com a aba aberta e parada tenda a **zero trabalho agendado**: nenhum `requestAnimationFrame` pendente quando não há nada em movimento na viewport.
- Que animação fora da viewport seja **desassinada**, não ignorada.
- Que mídia com reprodução automática não decodifique fora da viewport nem com a aba oculta.
- Que o heap não cresça monotonicamente com a página parada.
- Que cada item tenha um antes/depois medido no instrumento certo — Performance Monitor e Chrome Task Manager, não Lighthouse.

**Non-Goals:**

- Remover, encurtar ou enfraquecer qualquer animação. Item ② muda **como** o loop do Lenis é agendado, não se o smooth scroll existe.
- Tocar `CursorFollower`, `cursor-glow.tsx`, `NavBarRoot` ou `globals.css` — todos pertencem a `optimize-landing-performance`, que está aberta.
- Tocar `reveal.tsx` ou `text-reveal.tsx` — pertencem a `prevent-invisible-text`, e o contrato `data-reveal` é dela.
- Remover o `mix-blend-difference` do cursor. Ele é medido nesta change e deliberadamente não alterado (ver Decisão 7).
- Melhorar LCP, TBT ou peso transferido. Se acontecer, é efeito colateral, não critério.

## Decisions

### Decisão 1 — O guard de viewport governa a assinatura, não o corpo do callback

**Escolha:** `scroll-based-velocity.tsx` deixa de usar `useAnimationFrame` e passa a chamar `frame.update(cb, true)` / `cancelFrame(cb)` diretamente, de dentro do `IntersectionObserver` que já existe no arquivo.

`useAnimationFrame` é exatamente esse par de chamadas com o ciclo de vida amarrado ao `useEffect` (verificado em `framer-motion/dist/es/utils/use-animation-frame.mjs`). Usá-lo é abrir mão do controle sobre **quando** a assinatura existe, que é precisamente a variável que esta change precisa mexer.

`frame` e `cancelFrame` são exportados por `motion/react` — verificado em runtime, 383 exports, os dois presentes. **Nenhuma dependência nova, nenhum import de subpacote.**

**Alternativas consideradas:**

- *Hook condicional* — ilegal em React. Descartado sem discussão.
- *Montar/desmontar um componente filho `<RowTicker>` conforme a visibilidade* — idiomático e seguro, mas troca uma assinatura de rAF por um ciclo de montagem completo do React a cada travessia de borda. Numa página com scroll suave, as bordas são atravessadas devagar e com frequência. Pior negócio.
- *Manter `useAnimationFrame` e desligar por um ref* — é o que já existe. Sem ganho.

**Por que isto de fato apaga o loop, e não só o corpo dele:** `createRenderBatcher` só se reagenda em `if (runNextFrame && allowKeepAlive)`, e `runNextFrame` só é levantado quando há processo pendente. Cancelados os quatro `keepAlive`, o batcher **para**. Confirmado lendo `motion-dom/dist/es/frameloop/batcher.mjs`. Ele volta sozinho por `wake()` na próxima vez que qualquer coisa do Motion agendar trabalho — que é o comportamento correto.

**Consequência de graça:** as colunas 2 e 3 dos depoimentos são `hidden md:block` / `hidden lg:block`. Um elemento em `display: none` reporta `isIntersecting: false`, então em viewports estreitas essas colunas passam a nem assinar. Hoje elas animam invisíveis.

### Decisão 2 — O risco de salto na reassinatura não existe, e isso é verificável

O receio óbvio ao desassinar um loop de animação é o `delta` acumulado: a linha reentra na viewport, recebe um `delta` gigante e salta.

Não acontece, por duas propriedades do batcher do Motion, ambas lidas no fonte:

```js
// batcher.mjs
const maxElapsed = 40;
state.delta = useDefaultElapsed
    ? 1000 / 60
    : Math.max(Math.min(timestamp - state.timestamp, maxElapsed), 1);

const wake = () => { runNextFrame = true; useDefaultElapsed = true; ... }
```

O `delta` é do **batcher**, não do assinante — nunca acumula por callback. Está preso a [1, 40] ms. E o primeiro frame depois de um despertar usa `1000/60` fixo.

Isto rebaixa ① do item de maior risco da proposal para um item de risco baixo. A verificação continua sendo tarefa (não confio no raciocínio sozinho para um efeito visível), mas o argumento agora tem fonte.

### Decisão 3 — Lenis é conduzido pelo frameloop do Motion, e só enquanto está rolando

Aqui existe uma armadilha que a ordem dos itens tem que respeitar.

A integração conhecida é `autoRaf: false` + `frame.update(t => lenis.raf(t), true)`. Ela reduz dois loops a um e, de brinde, corrige a ordenação: o Lenis escreve a posição de scroll no passo `update`, antes de o Motion ler no passo `read`, eliminando um frame de latência no `useScroll`.

**Mas o `keepAlive: true` dessa integração manteria o frameloop do Motion acordado para sempre — desfazendo exatamente o que a Decisão 1 conquista.** Um loop permanente em vez de dois é 50% menos overhead de agendamento e 0% de ociosidade. Não é o alvo.

**Escolha:** conduzir o Lenis pelo frameloop do Motion **e** manter esse condutor assinado apenas enquanto há scroll em curso. O Lenis expõe `isScrolling` (`false | "native" | "smooth"`) com setter observável, e sua captura de input (`virtualScroll.on("scroll", ...)`) é independente do loop de rAF — o wheel atualiza o alvo mesmo com o loop dormindo. O condutor reassina no primeiro input e se desassina quando `isScrolling` volta a `false`.

**Cuidado obrigatório:** `lenis.raf(time)` calcula `deltaTime = time - (this.time || time)`. Diferente do Motion, o Lenis **não** clampa. Um `this.time` obsoleto de dois minutos atrás produz um `advance()` com delta enorme. Na prática o alvo é igual ao valor atual quando o loop dorme, então o salto seria para o lugar onde já se está — mas depender disso é frágil. `lenis.time` é redefinido no instante da reassinatura, antes do primeiro `raf`.

**Alternativa considerada:** deixar `autoRaf: true` e aceitar dois loops. Rejeitada — é metade do sintoma e a mais fácil de corrigir.

**Ordenação obrigatória:** ② vem **depois** de ①. Antes disso, medir ② isoladamente não diz nada, porque o frameloop do Motion estaria acordado de qualquer jeito.

### Decisão 4 — O vídeo pausa por um wrapper que renderiza `children`

**Escolha:** um client component que envolve o `<video>` sem o substituir, no molde documentado em `reveal.tsx` ("Being a client component that renders `children`, it can wrap both client and server sections"). Ele acha o `<video>` por um ref no próprio wrapper, e liga `IntersectionObserver` + `visibilitychange` a `play()` / `pause()`.

O ponto que decide a forma é hidratação. O comentário em `page.tsx:82-99` registra a cicatriz: o React #418 causado por estado que diverge entre servidor e cliente, e o `<source media>` foi escolhido justamente para não precisar de `matchMedia` no cliente. Um wrapper que só **anexa comportamento** mantém o `<video>` e seu `<source media>` no componente de servidor, byte a byte iguais no HTML. Não há markup condicional, então não há divergência possível.

`autoPlay` permanece no markup: o caminho sem JavaScript e o caminho antes da hidratação continuam exatamente como hoje.

**Alternativas consideradas:**

- *Transformar o `<video>` em client component* — funciona, mas move o `<source media>` para dentro de código de cliente e reabre uma decisão que já foi tomada e medida. Sem necessidade.
- *`document.getElementById`* — dispensa o wrapper e paga com acoplamento por string. Pior.
- *Anexar a lógica ao `Parallax`* — junta duas responsabilidades sem relação num componente reutilizável. Não.

**Detalhe que sempre morde:** `video.play()` devolve uma Promise que rejeita com `AbortError` quando um `pause()` chega antes de a reprodução começar — cenário normal em scroll rápido através da seção. Precisa de `.catch()`, senão vira ruído de console (e, com um error overlay ligado, vira interrupção de desenvolvimento).

### Decisão 5 — `will-change` do `Parallax` vira temporal, e isso completa a 6.x em vez de revertê-la

A tarefa 6.3 de `optimize-landing-performance` manteve o `willChange: "transform"` de `parallax.tsx:43` com o argumento de que "aquele elemento de fato anima `y` continuamente". O argumento é verdadeiro.

Mas a mesma change escreveu, em `scroll-frame-budget`, o requisito **"`will-change` tem escopo temporal"**: aplicado apenas enquanto a mudança está prestes a ocorrer ou está ocorrendo. O `Parallax` foi a exceção porque sua animação parecia contínua.

Ela não é. Ela é contínua **enquanto o elemento cruza a viewport**, que é uma fração da sessão. E com ③ implementado, fora da viewport aquela camada segura frames de um vídeo pausado — memória de GPU reservada para conteúdo que não muda.

**Escolha:** `willChange` alternado pelo mesmo `IntersectionObserver` de ③, com `rootMargin` folgado o bastante para que a promoção aconteça antes de o elemento ser visível. Não é reversão da 6.3; é a aplicação do princípio que a própria 6.x estabeleceu, agora que ③ removeu a razão da exceção.

**Depende de ③.** Sem o vídeo pausado, a camada continua tendo conteúdo em movimento e a exceção da 6.3 continua válida. Se ③ for revertido, ⑤ cai junto.

### Decisão 6 — `useTransform` devolve número, não string

`scroll-based-velocity.tsx:190-194` monta `` `${-wrap(0, unit, offset)}px` `` a cada frame, por linha. O Motion aceita número em `x`/`y` e o interpreta como px. Quatro linhas a 60 Hz são ~240 strings efêmeras por segundo, indefinidamente.

Isoladamente é pequeno. É listado porque casa diretamente com "piora com o tempo aberta": alocação constante é pressão de GC, e pressão de GC aparece como pausas periódicas, não como CPU média alta. Com ① implementado a alocação já some fora da tela; ⑥ a remove também dentro dela, e custa uma linha.

**Este é o item que a tarefa de fecho deve estar mais disposta a considerar sem ganho mensurável** — mas ele também não tem custo nenhum para manter.

### Decisão 7 — O `mix-blend-difference` é medido e não é alterado

O `CursorFollower` é `fixed`, `z-9999`, `mix-blend-difference`, e se move todo frame em que o ponteiro anda. Blend mode obriga o compositor a ler o backdrop e re-misturar; a região se move sobre a página inteira. É custo real, e é candidato legítimo ao sintoma "ao mover o mouse".

E ele é intocável dentro desta change, por dois motivos independentes: o arquivo pertence a `optimize-landing-performance`, e remover o blend **alteraria o efeito percebido** — é o que faz o ponto ser legível sobre fundo claro e escuro.

**Escolha:** medir o custo e registrá-lo em `baseline.md` sem mudar nada. O número passa a existir para informar uma decisão de produto futura, no mesmo espírito da tarefa 9.6 daquela change ("com o número final na mão, decidir se ainda vale"). Uma change de performance que descobre um custo e o esconde por ser inconveniente não presta.

### Decisão 8 — O instrumento, e por que não é o Lighthouse

O baseline anterior usou `npx lighthouse@12` com o preset mobile. Aqui ele é o instrumento errado: mede carregamento, e o sintoma é regime permanente.

**Instrumento primário — Chrome DevTools → Performance Monitor** (`⌘⇧P` → *Show Performance Monitor*). Séries relevantes: `CPU usage`, `JS heap size`, `DOM Nodes`, `JS event listeners`, `Layouts / sec`, `Style recalcs / sec`.

**Instrumento secundário — Chrome Task Manager** (`Shift+Esc`): colunas *Memory footprint* e *GPU memory*, por aba. É a única leitura prática de memória de camada, e é o que decide ③ e ⑤.

**Instrumento para "piora com o tempo" — Memory → Heap snapshot**, um em t=0 e outro em t=10 min com a página **parada**, comparados por *Retained Size*. Se o heap cresce com a página parada, existe retenção; se não cresce mas há serrilhado, é pressão de GC (hipótese de ⑥).

**Protocolo, e ele precisa ser fixo para que os números sejam comparáveis:** `next build && next start`, aba anônima sem extensões, `/pt`, janela em 1440×900, três regimes de 60 s cada — (a) parada com a home no topo, (b) scroll contínuo do topo ao rodapé em ~30 s, (c) ponteiro percorrendo o hero e os botões. Registrar CPU média e pico de cada regime.

O regime (a) é o que carrega esta change. **Se a CPU em (a) não for mensuravelmente diferente de zero antes e mensuravelmente zero depois, ① e ② falharam**, independentemente do que os outros números digam.

### Decisão 9 — Ordem de execução

Medição primeiro, depois risco crescente, com duas dependências rígidas:

```
  1. baseline (3 regimes + heap 10 min + custo do blend)
        │
  2. ⑥ alocação  ──┐  (trivial, junto com ①)
  3. ① desassinar ─┴──▶  4. ② Lenis     (② só é mensurável depois de ①)
        │
  5. ③ pausar vídeo ─────▶  6. ⑤ will-change temporal   (⑤ só se justifica depois de ③)
        │
  7. ④ cópias dos depoimentos   (provavelmente o menor; último de propósito)
        │
  8. fecho: remedir, podar o que não rendeu, conferir o inventário de movimento
```

④ vai por último porque a Decisão 1 provavelmente já elimina o **CPU** das colunas ocultas de graça, e o que sobra para ④ é contagem de nós de DOM e memória — que pode ser pequeno. Deixá-lo no fim é deixá-lo fácil de abandonar.

### Decisão 10 — ④ reduz o excedente, não as colunas

O cálculo é `Math.max(3, Math.ceil(cs / bs) + 2)` (`scroll-based-velocity.tsx:151`). Com uma coluna de N depoimentos mais alta que a caixa de `h-170`, `ceil(cs/bs)` é 1 e o resultado é 3 — o piso de 3 nem chega a atuar; quem manda é o `+2`.

Para um wrap contínuo por `wrap(0, unit, offset)` basta cobrir a viewport mais uma unidade para a costura: `ceil(cs/bs) + 1`. O `+2` é uma cópia inteira de folga por coluna, em três colunas.

**Escolha:** reduzir o excedente de `+2` para `+1` e verificar a costura em movimento nos três breakpoints. Uma coluna com 8 depoimentos sai de 24 para 16 cards; três colunas, de 72 para 48.

**Alternativa rejeitada:** renderizar só as colunas que o breakpoint mostra, por `matchMedia`. Cortaria dois terços do DOM, e é exatamente o padrão que este projeto já pagou para não usar — o mesmo comentário em `page.tsx` que motivou o `<source media>` e a cicatriz do React #418 registrada em `HydrationSignal`. Não se reintroduz um bug conhecido por memória.

## Risks / Trade-offs

**[① A linha salta ao reentrar na viewport]** → O `delta` do Motion é do batcher, clampado a [1, 40] ms, e o primeiro frame após `wake()` usa `1000/60` fixo (Decisão 2). `baseX` é uma `MotionValue` e sobrevive à desassinatura, então a posição é preservada. Ainda assim é verificação **de olho** obrigatória: rolar até tirar o marquee da tela, esperar, voltar.

**[② O primeiro wheel após a pausa chega a um loop dormindo]** → A captura de input do Lenis (`virtualScroll`) é independente do rAF: o evento atualiza o alvo e é ele quem acorda o condutor. O risco residual é um frame de latência na primeira roda depois de uma pausa longa. Verificação interativa: parar por 30 s, dar uma rolada curta, sentir se há atraso na largada.

**[② `lenis.raf` recebe um `deltaTime` obsoleto]** → O Lenis não clampa delta, diferente do Motion. `lenis.time` é redefinido imediatamente antes da reassinatura.

**[③ `play()` rejeita com `AbortError` em scroll rápido]** → `.catch()` explícito. É comportamento normal do elemento, não erro.

**[③ O vídeo reinicia visivelmente ao reentrar]** → `pause()` preserva `currentTime`; retomar continua de onde parou. Verificação de olho: sair da seção, voltar, confirmar que não voltou ao frame zero.

**[⑤ Pop de promoção/rebaixamento de camada na borda]** → `rootMargin` folgado, para que a promoção anteceda a visibilidade. Se o pop persistir, ⑤ é revertido — o ganho é memória de GPU, não vale um artefato visual.

**[④ Costura visível com uma cópia a menos]** → Verificação em movimento nos três breakpoints, nas duas direções, incluindo o estado de velocidade máxima do scroll (onde a translação por frame é maior e a costura, se existir, aparece). Reverter ao `+2` na dúvida.

**[Conflito de merge com as três changes abertas]** → Baixo por construção: esta change não toca `globals.css`, nem `reveal.tsx`/`text-reveal.tsx`, nem os arquivos do cursor e da nav. A superfície compartilhada é `page.tsx` (o `<video>`, onde `optimize-landing-performance` ainda tem as tarefas 8.3–8.6 do poster) e `parallax.tsx` (tarefa 6.3). Ambas são pequenas e conhecidas.

**[O trade-off honesto: a página fica mais difícil de raciocinar]** → Um loop de animação que às vezes existe é mais difícil de depurar do que um que sempre existe. A mitigação é a mesma que este codebase já pratica em toda parte — o *porquê* fica escrito ao lado do código, não no histórico do git.

## Migration Plan

Não há migração de dados, esquema de Payload, nem contrato de API. Toda mudança é de comportamento de cliente, entregue no mesmo deploy do resto.

**Rollback:** cada item é independente e revertível isoladamente, com a exceção declarada de ⑤, que cai junto com ③. A tarefa de fecho exige explicitamente que qualquer item sem ganho mensurável seja revertido em vez de defendido — mesma regra da change anterior.

## Open Questions

- **Quantos depoimentos existem hoje no CMS?** O número decide se ④ vale a pena: com N=8 são 72 cards vivos; com N=3, são 27 e o item provavelmente não sobrevive à tarefa de poda. Responde-se na baseline lendo `DOM Nodes` no Performance Monitor.
- **A CPU em regime parado é realmente não-zero?** É a premissa desta change inteira, e ela é hipótese até a baseline. Se a página parada já custa ~0% de CPU, ① e ② perdem a motivação principal e a change se reduz a ③/⑤ (memória) — o que ainda seria válido, mas seria outra change.
- **Existe crescimento de heap ou só serrilhado de GC?** Muda o alvo de "piora com o tempo aberta": retenção real é um bug a caçar; serrilhado é ⑥ e parentes.
- **O `mix-blend-difference` custa quanto, de fato?** Fica registrado sem ação nesta change (Decisão 7). Se o número for grande, alimenta uma conversa de produto que não é desta change resolver.
