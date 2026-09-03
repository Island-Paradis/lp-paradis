# Baseline — cut-sustained-runtime-cost

Medidas tiradas **antes** de qualquer mudança de implementação, para que o antes/depois sobreviva ao merge.

- Commit base: `3ff65f6` (branch `develop`, working tree limpo)
- Data: 2026-08-28
- Next 16.3.2, build de produção (`npm run build && npm run start`), porta 3210
- Chrome 152.0.7977.64, headless, perfil novo e descartável a cada execução

## Como medir (reprodutível)

O instrumento da change anterior — Lighthouse — **não serve aqui**. Ele observa os primeiros ~20 s de carregamento e vai embora, e o regime que esta change governa é o que sobra depois. Uma aba que acorda a CPU 120 vezes por segundo pelas próximas duas horas é invisível para ele.

O harness está em `scripts/measure-runtime.mjs` (medição) e `scripts/diagnose.mjs` (atribuição), dentro desta change, seguindo o precedente de `bundle-attribution.py`. Sem dependências novas: o Node 24 tem `WebSocket` global, então os scripts falam CDP puro.

```bash
cd openspec/changes/cut-sustained-runtime-cost/scripts
node measure-runtime.mjs --idle 60 --scroll 30 --pointer 60 --label baseline --out ../baseline-raw.json
node summarize.mjs ../baseline-raw.json
node diagnose.mjs --scroll-to 0 --window 5      # quem agenda os rAF
```

**Por que CDP e não cliques no DevTools.** `Performance.getMetrics` é literalmente a fonte de dados do Performance Monitor. Medir por ele torna o protocolo executável e repetível, em vez de depender de alguém olhar um gráfico — que foi como as tarefas 1.5, 4.4, 6.4 e 7.6 de `optimize-landing-performance` ficaram paradas.

**Métrica decisiva: `rAF/s`.** Uma contagem direta de callbacks de `requestAnimationFrame`, por monkey-patch instalado antes de qualquer script da página. Ela é melhor que "CPU %" para esta change porque não tem ruído de máquina: uma página ociosa **deve** agendar zero, e qualquer número acima disso é trabalho que não deveria existir.

**Protocolo fixo** (mudá-lo invalida a comparação): build de produção, aba com perfil novo, sem extensões, `/pt`, viewport 1440×900, `deviceScaleFactor: 1`. Espera de 12 s após o `navigate` para a hidratação assentar. Quatro regimes cronometrados, com 2,5 s de assentamento entre eles e 4 s extras após o scroll para o easing do Lenis terminar:

| Regime | O que é |
|---|---|
| `a-idle-top` | 60 s, home no topo, **nada acontece** |
| `b-scroll` | 30 s, roda do mouse, topo ao rodapé |
| `a2-idle-scrolled` | 60 s parado **onde o scroll parou** (rodapé) |
| `c-pointer` | 60 s de varredura do ponteiro pelo hero, sem rolar |

Verificado no ambiente de medição: `pointer: fine` = **true** e `prefers-reduced-motion` = **false**. Isto importa: significa que `CursorFollower`, `CursorGlow` e o magnetismo dos botões **de fato rodam** durante o regime (c), e que o Lenis é montado. Uma medida headless em que o ponteiro fosse grosseiro mediria uma página diferente da real.

## 1. Os três regimes

```
metrica         |       a-idle-top |         b-scroll | a2-idle-scrolled |        c-pointer
-------------------------------------------------------------------------------------------
rAF/s           |              120 |              120 |              120 |            139.6
CPU% main       |             7.89 |             7.53 |             2.09 |            10.65
Script s/s      |           0.0066 |           0.0137 |           0.0032 |           0.0123
Recalc/s        |          60.0147 |          24.4044 |                0 |          59.9066
Layout/s        |                0 |            1.855 |                0 |           0.1325
Heap MB end     |              5.8 |              6.8 |              6.9 |              6.7
Nodes end       |             1728 |             1745 |             1745 |             1745
Listeners end   |              484 |              484 |              484 |              484
```

### 1.1 A premissa da change está confirmada, com atribuição

**120 rAF/s com a página parada.** Não 60, não "alguns": exatamente 600 callbacks em 5 s, e o número **não muda** entre o topo da página e o rodapé.

`diagnose.mjs` capturou a pilha no momento do agendamento e atribuiu cada um:

```
  301  60.2/s   f    @ 1rh-s15xkb04j.js     ← framer-motion (batcher)
  301  60.2/s   raf  @ 0e1uwc_5pd_91.js     ← lenis
```

Os chunks foram confirmados por conteúdo: o primeiro contém `framer`, o segundo contém `lenis`, `smoothWheel` e `syncTouch`. São os dois loops que o design previu, cada um a 60 Hz, exatamente como `batcher.mjs` e `lenis.mjs:726` descrevem.

**A medida do rodapé é a que fecha o argumento.** Com o scroll em `y = 4711`, o inventário reporta as **seis** linhas de marquee com `inView: false` — o marquee de serviços e as três colunas de depoimentos, todas fora da viewport. Todos os guards de `scroll-based-velocity.tsx:197` estão curto-circuitando. E mesmo assim:

```
  300  60.0/s   f    @ framer-motion
  300  60.0/s   raf  @ lenis
```

**120 despertares por segundo para não fazer nada.** É a definição exata do que `idle-runtime-budget` proíbe, e é a resposta à pergunta aberta do design ("a CPU em regime parado é realmente não-zero?"): sim — **2,09% de CPU de thread principal, contínuos, indefinidamente**.

### 1.2 O experimento natural que separa "loop" de "animação"

Os regimes (a) e (a2) são a mesma coisa — página parada, ninguém interagindo — e diferem apenas no que está na viewport:

```
  a-idle-top          marquee de serviços VISÍVEL (32 px assomando na borda)
    CPU 7,89%   Recalc 60/s   rAF 120/s

  a2-idle-scrolled    NADA animado visível
    CPU 2,09%   Recalc  0/s   rAF 120/s
                     ▲              ▲            ▲
                     │              │            └── idêntico: os loops não
                     │              │                dependem do conteúdo
                     │              └── some junto com a animação
                     └── ~2,1 pontos são os loops; o resto é o marquee visível
```

Isto **delimita honestamente o que ①+② compram**: o piso de 2,09% e os 120 rAF/s. Não os 7,89% do topo — ali o marquee está de fato visível e seu trabalho é legítimo. Registrar essa distinção agora evita atribuir a ① um ganho que ele não vai entregar.

Os 60 recalcs/s no topo acompanham o marquee visível e desaparecem quando ele sai da tela. O canal de escrita de estilo da sonda reportou 0 escritas inline nos dois casos, o que **não corrobora** a atribuição — o patch de `CSSStyleDeclaration` não intercepta o caminho que o Motion usa. A atribuição acima vem do experimento natural (a vs a2), não da sonda; o canal de estilo do `diagnose.mjs` é conhecidamente incompleto e não deve ser usado como evidência.

### 1.3 O vídeo nunca pausa — confirmado, não inferido

Em toda medição, em toda posição de scroll:

| Onde | `paused` | `inView` | `currentTime` |
|---|---|---|---|
| `scrollY = 0` | **false** | false | 6,5 s |
| `scrollY = 4700` (rodapé) | **false** | false | 11,1 s |

O `currentTime` avançando entre as duas leituras prova que não é só a flag: o vídeo **está decodificando** com o usuário no rodapé, três telas abaixo, com o elemento fora da viewport nas duas medidas. `readyState = 4` (dados suficientes para tocar até o fim) nos dois casos.

Premissa do item ③ confirmada.

## 2. Inventário estrutural

| Item | Contagem |
|---|---:|
| Elementos no DOM (documento principal) | 950 |
| Nós (`Performance.getMetrics`, todos os documentos) | 1.745 |
| Cards de depoimento renderizados | **24** |
| Elementos `[data-reveal]` | 58 |
| Linhas de marquee (1 horizontal + 3 verticais + 2 outras) | 6 |
| Cópias por coluna de depoimentos | 4 |
| Listeners de evento JS | 484 |
| Altura de scroll | 5.611 px |

### 2.1 Item ④ não sobrevive ao inventário

São 24 cards, não 72: **3 colunas × 4 cópias × 2 depoimentos**. Só existem **dois** depoimentos publicados no CMS hoje, o que responde à pergunta aberta do design.

O cálculo `Math.max(3, Math.ceil(cs / bs) + 2)` com um bloco de 2 cards produz 4 cópias. Reduzir o excedente de `+2` para `+1` levaria de 4 para 3 cópias: **24 cards → 18**, ou seja, 6 elementos a menos num DOM de 950 — **0,6%**.

Não vale o risco de costura. A tarefa 7.1 previa exatamente este ponto de decisão ("com o número de 1.6 na mão, decidir se o item vale a execução"), e o número decidiu: **④ não será implementado.** Registrado aqui em vez de executado e depois revertido.

Ressalva honesta: este número é uma propriedade do **conteúdo atual**, não do código. Com 20 depoimentos publicados, `bs` cresce, o cálculo muda e o item volta a fazer sentido. O que fica registrado é "não vale hoje", não "o cálculo está certo".

### 2.2 O DOM e o heap não são o problema

950 elementos e 5,8–6,9 MB de heap são números pequenos. Seja qual for a causa de "a aba fica pesada com o tempo", **não é a quantidade de DOM nem o heap de JavaScript** — o que empurra a suspeita para a memória de mídia e de camada do vídeo (item ③/⑤), que é justamente a que este harness não enxerga (ver Limitações).

## 3. Heap ao longo do tempo — o eixo "piora com o tempo aberta"

Página parada, amostra por minuto, GC forçado nas pontas para separar retenção de serrilhado.

| t (min) | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | pós-GC |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MB | 6,15 | 6,44 | 6,28 | 5,70 | 6,01 | 5,86 | 5,72 | 6,01 | 5,86 | 5,75 | 6,04 | **5,76** |

`Nodes` constante em 1.745 nas onze amostras.

**Veredito: não há retenção.** A oscilação entre 5,70 e 6,44 MB é o dente de serra normal de coleta, e após um GC forçado o heap fica em 5,76 MB — **abaixo** do valor inicial.

Isto **desconfirma parcialmente** uma hipótese do design. O item ⑥ foi justificado, entre outras coisas, como a explicação mais direta para "piora quanto mais tempo fica aberta", via pressão de GC. O heap não sustenta essa história: ele é pequeno (≈6 MB) e estável. ⑥ continua sendo correto e gratuito, mas **não é a causa do sintoma relatado**, e dizer o contrário seria inventar significado para um número que não o tem.

O que sobra como explicação candidata para o sintoma, e que este harness **não** consegue medir, é a memória de mídia e de camada do vídeo — ver §4. É por isso que a conferência manual com o Chrome Task Manager continua sendo a lacuna mais importante desta change.

> Ressalva de procedimento: esta série foi coletada com o servidor de produção sendo reiniciado no meio da janela. A página já estava carregada e ociosa, sem depender de rede, então as amostras seguem válidas — mas a série foi repetida ao final, contra o build final e sem interrupção, e deu o mesmo veredito (§6.3).

## 4. Limitações desta baseline

Registradas para que ninguém leia mais dos números do que eles dizem.

- **Sem memória de GPU nem `Memory footprint` por processo.** O Chrome Task Manager não é acessível por CDP, e o modo headless não representa fielmente a alocação de camada e o pipeline de mídia. **As tarefas 1.5, 5.10 e 6.6 continuam exigindo verificação manual** com `Shift+Esc` num Chrome normal. É a lacuna mais relevante desta baseline, porque é exatamente onde o item ③ deve render mais.
- **Headless.** A composição e o decode de vídeo podem custar diferente de um Chrome com janela. Os números de CPU são comparáveis **entre si** no mesmo protocolo, que é o que a change precisa; não são comparáveis com o que o usuário vê no Activity Monitor.
- **O canal de escrita de estilo do `diagnose.mjs` é incompleto** (§1.2). Só o canal de rAF é confiável.
- **`c-pointer` é sintético.** A varredura em lissajous atravessa o hero e os botões, mas não reproduz o padrão de um usuário real. Serve para comparar antes/depois, não para estimar custo real.
- **Uma execução por regime.** Sem repetições, sem intervalo de confiança. Diferenças pequenas (< 1 ponto de CPU) no fecho devem ser tratadas como ruído.

## 5. Veredito da tarefa 1.10 — a change prossegue

A premissa central era hipótese e virou medida:

- ✅ **CPU em regime parado é não-zero:** 2,09% de piso, com nada visível animando.
- ✅ **Há assinantes de rAF vivos com a página parada:** 120/s, atribuídos a framer-motion e Lenis, invariantes com a posição de scroll.
- ✅ **O vídeo decodifica fora da viewport:** confirmado com `currentTime` avançando.
- ❌ **④ (cópias dos depoimentos) não se justifica:** 24 cards, ganho de 0,6% do DOM. Cortado do escopo.
- ⏳ **O eixo "piora com o tempo"** depende de §3 e da verificação manual de memória de mídia.

Escopo confirmado para ①, ②, ③, ⑤ e ⑥. Item ④ encerrado sem execução, com o número que motivou a decisão.

---

# Depois — resultados por item

Mesmo protocolo, mesmo Chrome, mesma viewport. Build final com ①②③⑤⑥ (④ não executado, ver §2.1).

## 6.1 Os três regimes, antes e depois

```
metrica         |            a-idle-top |              b-scroll |      a2-idle-scrolled |             c-pointer
---------------------------------------------------------------------------------------------------------------
rAF/s           |       120 → 60 (-50%) |     120 → 60.1 (-50%) |       120 → 0 (-100%) |   139.6 → 79.8 (-43%)
CPU% main       |            7.89 → 8.29|            7.53 → 6.39|         2.09 → 0.00   |          10.65 → 12.21
Recalc/s        |             60.0 → 60.0|          24.4 → 25.0 |             0 → 0     |          59.9 → 60.0
Heap MB end     |             5.8 → 5.8 |             6.8 → 6.7 |           6.9 → 6.7   |            6.7 → 6.3
Nodes           |         1728 → 1728   |         1745 → 1745   |        1745 → 1745    |         1745 → 1745
Listeners       |           484 → 487   |           484 → 487   |          484 → 487    |           484 → 487
```

## 6.2 O que estes números dizem, e o que não dizem

**O resultado central, e ele é categórico:**

```
  a2-idle-scrolled — página parada, nada animado visível

     rAF/s      120  ──────────────────────────────▶  0      (-100%)
     CPU% main  2,09 ──────────────────────────────▶  0,00   (-100%)
```

De 120 despertares por segundo, indefinidamente, para **nenhum**. A página agora dorme. O `diagnose.mjs` confirma pela outra ponta: zero rAF agendados em 6 s, contra os dois schedulers a 60/s cada da baseline.

**Nos demais regimes, o ganho é de agendamento, não de CPU medida.** No topo e sob o ponteiro a contagem de rAF cai 50% e 43%, mas a CPU não acompanha. O motivo é honesto e já estava previsto em §1.2: nesses regimes o marquee está **de fato visível**, e seu trabalho é legítimo. O que ①+② removem ali é o loop do Lenis girando em paralelo — agendamento, não trabalho útil.

**Sobre a CPU aparentemente maior no topo e sob o ponteiro.** A leitura ingênua da tabela sugere regressão de +5% e +15%. Ela está errada, e a armadilha é exatamente a que §4 desta baseline antecipou ("uma execução por regime, sem repetições"). Com três repetições em cada build:

| regime | base (3 reps) | final (3 reps) |
|---|---|---|
| `c-pointer` CPU% | 12,40 / 11,75 / *10,65* | 12,44 / 11,97 / 12,21 |
| `a-idle-top` CPU% | 8,14 / 8,26 / *7,89* | 8,26 / 8,50 / 8,29 |

As faixas se sobrepõem. O 10,65 e o 7,89 da baseline original eram amostras baixas isoladas; a variação entre execuções do **mesmo** build é maior que a diferença entre builds. **Não há regressão, e também não há ganho de CPU nesses dois regimes.** O ganho real ali é a metade dos rAF — e o vídeo pausado, cujo custo este harness não enxerga.

**O contador de listeners sobe de 484 para 487.** É esperado e limitado: o listener de `play` do vídeo, o `visibilitychange` e o `scroll` do condutor do Lenis. Todos com `removeEventListener` no cleanup; o número é constante ao longo da sessão.

## 6.3 Heap, de novo, contra o build final

| t (min) | 0 | 2 | 4 | 6 | 8 | 10 | pós-GC |
|---|---|---|---|---|---|---|---|
| MB | 6,17 | 6,29 | 5,81 | 5,81 | 5,79 | 5,79 | **5,77** |

Mesmo veredito: **sem retenção**, serrilhado de GC. `Nodes` constante em 1.745.

## 6.4 Comportamento — 18/18 automatizadas

`scripts/behaviour-check.mjs`, contra o build final:

- vídeo pausado no topo (`currentTime: 0`), tocando quando visível, pausado ao sair, `currentTime` congelado fora da tela, **retomando de onde parou**, pausando com a aba oculta e retomando ao voltar
- **zero rAF** parado no rodapé e com a aba oculta; ~60 no topo (só o marquee visível)
- marquee visível continua se movendo; uma única roda produz movimento gradual em 12 posições distintas — **o easing do Lenis está vivo**
- parallax desloca com o scroll; `will-change` presente perto da viewport e `auto` no rodapé

`scripts/reduced-motion-check.mjs` — **8/8**: Lenis não é montado, nenhum `[data-reveal]` com texto fica invisível dentro da viewport, o parágrafo do hero (elemento de LCP) está com `opacity: 1`, o `Parallax` renderiza sem wrapper transformado, zero rAF no rodapé e vídeo pausado.

> Das 18 verificações de comportamento, **5 falharam na primeira execução e todas as 5 eram defeito do teste**, não do produto: alvos de scroll calculados uma vez e já obsoletos, folga curta demais para o assentamento, e uma asserção que contradizia a folga de promoção de 400 px do próprio `Parallax`. Registrado porque o mesmo erro é fácil de repetir.

## 6.5 HTML servido — inalterado

Comparado contra um build do commit base:

- `<video>` e `<source media>`: **byte a byte idênticos**
- **árvore de tags do documento inteiro: idêntica**

A diferença de 259 bytes no total é payload RSC, não markup. Nenhum aviso de divergência de hidratação. É a evidência que a tarefa 5.5 pedia, e o motivo pelo qual `VideoAutoPause` clona o filho em vez de renderizá-lo.

## 6.6 O que continua pendente de olho humano

Nada disto é opcional; só não é automatizável neste ambiente.

1. **`Memory footprint` e `GPU memory`** no Chrome Task Manager (`Shift+Esc`), com a página longe do vídeo — tarefas 1.5, 5.10, 6.6. **É a lacuna mais importante**, porque é onde ③ e ⑤ devem render mais, e é a explicação candidata que sobrou para "piora com o tempo aberta" depois que o heap foi descartado (§3).
2. **Pop de promoção de camada** na borda do parallax — tarefa 6.3. É o único item com risco de artefato visual.
3. **Sensação de largada do scroll** após pausa longa — tarefa 4.6.
4. **Inventário visual de movimento** e âncoras do menu — tarefas 9.4 e 4.7.

## 6.7 Custo do `mix-blend-difference` — medido, não alterado

Tarefa 8, e Decisão 7 do design: o regime `c-pointer` é o mais caro da página, **≈12,2% de CPU de thread principal** contra ≈8,3% parado no topo — cerca de **4 pontos** atribuíveis ao movimento do ponteiro, isto é, ao `CursorFollower` com `mix-blend-difference`, ao `CursorGlow` e ao magnetismo dos botões.

O número fica registrado e **nada foi alterado**: o blend é o que torna o ponto legível sobre fundo claro e escuro, e removê-lo violaria a restrição de fechamento das duas capabilities. `git status` confirma `CursorFollower/index.tsx` e `cursor-glow.tsx` intactos.

Fica como insumo para uma decisão de produto futura, no mesmo espírito da tarefa 9.6 de `optimize-landing-performance`. Uma change de performance que descobre um custo e o esconde por ser inconveniente não presta.

## 6.8 Achado fora de escopo, para a próxima change

`scroll-based-velocity.tsx` aplica `will-change-transform` **permanente** por classe Tailwind no elemento interno de cada linha de marquee — quatro elementos, um deles de 680 px de altura em três colunas. É a mesma espécie de promoção permanente que o item ⑤ acabou de dar escopo temporal no `Parallax`, e que `scroll-frame-budget` já proíbe em folha de estilo.

**Não foi tocado**, porque não está na lista de itens da proposal e o inventário de itens é o contrato desta change. Fica registrado como candidato — e ele casa com a lacuna de §6.6, item 1: é memória de camada, exatamente o que não foi possível medir aqui.
