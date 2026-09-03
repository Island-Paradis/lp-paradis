# Baseline — optimize-landing-performance

Medidas tiradas **antes** de qualquer mudança de implementação, para que o antes/depois sobreviva ao merge.

- Commit base: `76fd568` (branch `chore/implementation-openspec-on-codebase`, working tree com as duas changes abertas)
- Data: 2026-08-28
- Next 16.3.2, build Turbopack, `next build`

## Como medir (reprodutível)

O `@next/bundle-analyzer` **não serve neste projeto**: ele se pluga pelo hook `webpack` do `next.config`, que o Turbopack ignora. O Next 16 traz o analisador embutido:

```bash
npx next build --experimental-analyze
```

Isso escreve `.next/diagnostics/route-bundle-stats.json` (first-load por rota) e `.next/diagnostics/analyze/data/<rota>/analyze.data` (atribuição por módulo, JSON com prefixo de 4 bytes big-endian de comprimento). O script de agregação por pacote está em `scripts/bundle-attribution.py` dentro desta change.

## 1. First-load JS por rota

| Rota | First-load JS (raw) |
|---|---:|
| **`/[locale]`** | **13.486.084 B** |
| `/admin/[[...segments]]` | 2.731.683 B |
| `/_not-found` | 455.246 B |

A landing page carrega **~5x mais JavaScript que o painel admin do Payload**. É o número que sozinho justifica a change.

Gzip (nível 6) dos 12 chunks de first-load de `/[locale]`: **2.384.758 B**. Um único chunk responde por 12.796.695 B raw / 2.170.394 B gzip — 95% do raw.

## 2. Atribuição por pacote — chunks de cliente de `/[locale]`

Total: 13.662.028 B raw (inclui chunks de rota além do first-load).

| Pacote | raw | % raw |
|---|---:|---:|
| **`@solar-icons/react`** | **12.738.385** | **93,2%** |
| `next` (runtime) | 579.066 | 4,2% |
| `motion-dom` | 100.285 | 0,7% |
| *(código da aplicação)* | 98.883 | 0,7% |
| `framer-motion` | 47.414 | 0,3% |
| `tailwind-merge` | 26.916 | 0,2% |
| `lenis` | 20.018 | 0,1% |
| `@radix-ui/*` (4 pacotes) | 18.829 | 0,1% |

> A coluna `compressed_size` do relatório do Next não bate com `gzip -6` medido à mão (3,3 MB vs 2,38 MB). Use os números raw para atribuição relativa e o gzip medido como proxy de transferência.

### O que este número estabelece

A tese da change está confirmada com folga:

```
   @solar-icons/react   ████████████████████████████████████  93,2%
   toda a máquina de animação
   (motion-dom + framer-motion + lenis)  ▏                     1,2%
```

**As bibliotecas de animação somam 1,2% do bundle. O barril de ícones soma 93,2%.** Remover animação para ganhar performance nesta página seria atacar 1,2% do problema — que é exatamente o que a change existe para não fazer.

O `@solar-icons/react` chega ao cliente por dois `import * as Icons` com indexação dinâmica, em `Button` e `Badge`, servindo **quatro** call sites.

## 3. LCP / TBT no perfil de referência

Lighthouse 12.8.2 contra `next start`, preset mobile padrão — que **é** o perfil de referência do design: Moto G Power emulado, `cpuSlowdownMultiplier: 4`, RTT 150ms, 1638 Kbps.

```bash
npx lighthouse@12 http://localhost:3210/pt --only-categories=performance \
  --output=json --chrome-flags="--headless=new --no-sandbox"
```

| Métrica | `/pt` | `/en` |
|---|---:|---:|
| Performance score | **39** | 38 |
| First Contentful Paint | 1,0 s | 0,9 s |
| **Largest Contentful Paint** | **22,3 s** | 22,2 s |
| **Total Blocking Time** | **2.030 ms** | 1.980 ms |
| Speed Index | 8,3 s | 11,3 s |
| Time to Interactive | 22,4 s | — |
| Cumulative Layout Shift | 0 | — |
| Peso total | 11.988 KiB | 11.860 KiB |
| Main-thread work | 6,3 s | — |
| Script bootup | 4,3 s | 4,3 s |

### 3.1 O achado que amarra as três camadas

**Elemento de LCP: `<p class="text-lg text-primary leading-8">`** — a descrição do Hero.

FCP em 1,0 s e LCP em 22,3 s é um vão de 21 segundos. A explicação está na interação entre camada 1 e camada 3, e não em nenhuma das duas sozinha:

```
  o <p> do Hero está dentro de um motion.div com initial opacity: 0
        │
        └─▶ só fica visível quando o React hidrata
                  │
                  └─▶ hidratação espera 2,15 MB de chunk de ícones
                      parsear e 4,3 s de bootup de script
                            │
                            └─▶ LCP = 22,3 s
```

A animação de entrada não é cara. Ela é **refém** do bundle. O `opacity: 0` inicial custa zero enquanto a hidratação é rápida; com 12 MB na frente, ele vira 21 segundos de tela sem o conteúdo principal.

Isso reforça a tese da change em vez de contradizê-la: o caminho para consertar o LCP é **retirar os bytes**, não retirar a animação. É também por que a rede de segurança de `prevent-invisible-text` existe e precisa continuar existindo.

### 3.2 Atribuição do peso transferido — 12.275.220 B em 42 requisições

| Recurso | bytes | % da página |
|---|---:|---:|
| `Circuit Board Technology Video.mp4` | 8.520.251 | **69,4%** |
| chunk de ícones (`25lejzio1hbnh.js`) | 2.150.573 | **17,5%** |
| 18 arquivos TTF do Gilroy | 1.224.350 | **10,0%** |
| todo o resto (39 requisições) | 380.046 | 3,1% |

**Três itens somam 96,9% da página, e são exatamente os itens ①, ② e ⑦ da change.**

### 3.3 Duas hipóteses do design, agora medidas

**O vídeo É baixado em viewport móvel.** O Lighthouse roda a 375px, onde o wrapper é `hidden md:block`. Os 8,5 MB aparecem na rede assim mesmo. O que a spec afirmava como risco (`display: none` não impede o fetch de um `<video autoplay>`) está confirmado por medição, e o item ⑦ deixa de ser o penúltimo em prioridade para ser **o maior ganho de bytes no alvo da change**.

**Os 18 TTFs são baixados, itálicos inclusive.** `next/font/local` faz preload de toda face declarada. A página busca `UltraLightItalic`, `ThinItalic`, `BlackItalic` e mais 15, a ~68 KB cada, para renderizar dois pesos. Cerca de 1,16 MB dos 1,22 MB é desperdício puro — e o problema não era só os 2,8 MB parados no repositório, como o design supunha, mas 1,2 MB atravessando a rede a cada carregamento.

### 3.4 Bootup por script

| Script | total | scripting |
|---|---:|---:|
| `2mvlh3vi_n00p.js` (229 KB raw) | 3.206 ms | 2.774 ms |
| `25lejzio1hbnh.js` (ícones, 12,8 MB raw) | 1.162 ms | 7 ms |
| `1rh-s15xkb04j.js` | 861 ms | 248 ms |

O chunk de ícones quase não **executa** (7 ms) — ele custa 1,16 s de *parse/compile*. É a assinatura típica de código morto embarcado: o browser paga para ler o que nunca vai rodar.

## 3.5 Progresso medido — camada 1 completa

Mesmo comando, mesmo perfil, após os itens ⑦ (gate do vídeo), ① (barril de ícones) e ② (fontes).

| Métrica | baseline | vídeo | + ícones | + fontes | Δ total |
|---|---:|---:|---:|---:|---:|
| Performance score | 39 | — | 48 | **64** | +25 |
| LCP | 22,3 s | 23,1 s | 11,4 s | **4,6 s** | **−79%** |
| TBT | 2.030 ms | 3.860 ms | 880 ms | **610 ms** | **−70%** |
| Speed Index | 8,3 s | 10,0 s | 7,0 s | **5,4 s** | −35% |
| Peso da página | 11.988 KiB | 3.667 KiB | 1.606 KiB | **497 KiB** | **−95,9%** |
| First-load JS (raw) | 13.486.084 B | — | 831.720 B | **831.720 B** | **−93,8%** |
| First-load JS (gzip-6) | 2.384.758 B | — | 253.861 B | **253.861 B** | −89,4% |
| CLS | 0 | — | — | **0** | — |

Por item:

| Item | O que mudou | Ganho |
|---|---|---:|
| ⑦ vídeo | `media="(min-width: 768px)"` no `<source>` | −8,5 MB no mobile |
| ① ícones | `@solar-icons/react` no bundle: 12.738.385 → 86.780 B | −99,3% |
| ② fontes | 18 TTFs (1.224.350 B) → 2 WOFF2 (90.886 B) | −92,6% |

### Uma leitura contraintuitiva do passo do vídeo

Isolado, o gate do vídeo **piorou** LCP (22,3 → 23,1 s) e TBT (2.030 → 3.860 ms), mesmo cortando 69% do peso. Não é ruído: retirar 8,5 MB de contenção de rede faz o JavaScript chegar mais cedo, e o trabalho de main-thread que antes ficava diluído pela espera se concentra numa janela menor. Enquanto o gargalo era a hidratação presa em 2,15 MB de chunk de ícones, aliviar a rede só antecipava o engarrafamento.

O ganho do vídeo é real e permanece — 8,5 MB a menos numa conexão medida é o item mais valioso da change para quem paga por dado —, mas ele **não move LCP**. Quem moveu foi o item ①, e só depois dele o ② aparece. É a justificativa retroativa para a insistência do design em medir por item: sem isso, o gate do vídeo teria sido lido como uma regressão e revertido.

### O que sobrou

Peso atual: 497 KiB, sendo ~140 KB de fontes (90 KB Gilroy + 49 KB Inter, este último pré-existente e fora do escopo). O LCP continua sendo o `<p>` do Hero, ainda preso à hidratação — agora em 4,6 s em vez de 22,3 s. A camada 2 (itens ③ a ⑥) ainda não foi tocada.

## 3.6 Resultado final — camadas 1 e 2

| Métrica | baseline | final | Δ |
|---|---:|---:|---:|
| **Performance score** | 39 | **75** | **+36** |
| **LCP** | 22,3 s | **4,5 s** | **−80%** |
| **TBT** | 2.030 ms | **230 ms** | **−89%** |
| Speed Index | 8,3 s | 5,7 s | −31% |
| FCP | 1,0 s | 1,1 s | ~ |
| CLS | 0 | 0 | — |
| **Peso da página** | 11.988 KiB | **497 KiB** | **−95,9%** |
| Script bootup | 4,3 s | 1,1 s | −74% |
| Main-thread work | 6,3 s | 2,5 s | −60% |
| First-load JS (raw) | 13.486.084 B | 831.720 B | −93,8% |

**Nenhuma animação foi removida, encurtada ou enfraquecida.**

Ressalva de atribuição: o Lighthouse mede carregamento, não scroll sustentado. A queda adicional de TBT (610 → 230 ms) após os itens da camada 2 é consistente com a remoção do `backdrop-filter` incondicional e do `will-change` permanente, mas o audit não exercita scroll nem ponteiro. **A verificação própria da camada 2 continua pendente e depende do trace da tarefa 1.5.**

## 4. Trace de scroll

*(pendente — tarefa 1.5. Exige DevTools interativo: atribuição de custo de paint por camada e entradas de forced reflow não saem do Lighthouse. Fica para conferência manual.)*

## Notas de ambiente

- `node_modules` tem layout de npm **e** de pnpm simultaneamente (`.package-lock.json` e `.pnpm/` presentes); `package-lock.json` está modificado e `pnpm-lock.yaml`/`pnpm-workspace.yaml` não versionados. Os caminhos resolvidos no build são os do pnpm. Condição pré-existente, fora do escopo desta change, mas registrada porque afeta a reprodutibilidade das medidas.
- `next.config.ts` reporta `⨯ turbopackServerFastRefresh` como experimento não reconhecido em todo build. Pré-existente, sem efeito nas medidas.
