## Context

Os dois blocos vivem em [page.tsx:70-105](../../../src/app/(app)/[locale]/page.tsx#L70-L105): um wrapper `relative` com `sm:pt-102` reserva 408px de espaço, o vídeo é posicionado `absolute right-0 top-0` dentro dele, e o bloco escuro de serviços entra no fluxo normal logo abaixo. O entrelaçamento em L é feito inteiramente por `clip-path: path()` em [globals.css:286-343](../../../src/app/(app)/globals.css#L286-L343) — seis paths, um por combinação de shape × breakpoint.

Traduzindo as classes do Tailwind (`--spacing: 0.25rem`):

| Token | Classe | px |
|---|---|---|
| Topo do bloco de serviços | `sm:pt-102` | 408 |
| Largura do vídeo em `xl` | `xl:w-149.5` | 598 |
| Altura do vídeo | `h-117.5` | 470 |
| Raio base | `--radius-2xl` | 16 |

E as larguras úteis, considerando que a `section` tem `px-4 xl:px-0` e o `container` do Tailwind v4 é só um `max-width`:

| Breakpoint | `container` max-width | padding | largura útil |
|---|---|---|---|
| md (768–1023) | 768 | 32 | **736** |
| lg (1024–1279) | 1024 | 32 | **992** |
| xl (≥1280) | 1280 | 0 | **1280** |

O `container` é sobrescrito pelo projeto com `max-width: 80rem` incondicional ([globals.css:260](../../../src/app/(app)/globals.css#L260)), então não há faixa `2xl` — acima de 1280px o bloco simplesmente centraliza. Ver D5.

### Estado atual

Aplicando os paths existentes em coordenadas do container, em `xl`:

```
   x=682              850  866                     1280
    │                  │    │                        │
────┼──────────────────┼────┼────────────────────────┤ y=0
    │            V Í D E O   (corpo)                 │
y=390 ═══════════════════════╗                       │
                        ┌────╫────────────────────┐  │
       gap A = 18px     │    ║   aba do vídeo     │  │
y=408 ──────────────────┘    ║   (390 → 470)      │  │
      ╔═══════════════╗ ↕    ║                    │  │
      ║   SERVICES    ║ gap B║                    │  │
      ║  (painel esq) ║ = 16 ╚════════════════════╪══╡ y=470
      ║               ║                              │
      ║               ║      gap C = 24px            │
      ║               ╚══════════════════════════════╡ y=494
      ║          SERVICES (painel direito)           ║
```

- **gap A** = `408 − 390` = 18
- **gap B** = `868 − 850` = 16 (aba local `x=184` → container `682+184=866`)
- **gap C** = `408 + 86 − 470` = 24

A origem do 24 fica clara comparando o degrau do `.services_shape` entre breakpoints:

| bp | degrau (y do painel direito) | gap C |
|---|---|---|
| md | 80 | **18** ✅ |
| lg | 80 | **18** ✅ |
| xl | **86** | **24** ❌ |

`md` e `lg` já estavam quase certos. Só `xl` foi ajustado à mão e ficou fora.

### Constraints

- Sem `browserslist` no `package.json` — não há piso de browser documentado. A técnica `clip-path: path()` é mantida por decisão explícita (ver Decisions).
- Sem test runner. A verificação é visual.
- Biome formata o CSS; `npm run lint` precisa passar.
- O conteúdo dos blocos vem do Payload e muda sem aviso — a altura não é conhecida em build time.

## Goals / Non-Goals

**Goals:**

- Respiro de 18px constante nos três trechos do encaixe, nos três breakpoints.
- Respiro de 18px também nas curvas dos dois cantos, via arcos concêntricos.
- Paths desenhados para a largura real do elemento em cada breakpoint.
- Recorte que não depende da altura do conteúdo.
- Geometria estável acima de 1280px.

**Non-Goals:**

- **Não** migrar para `clip-path: shape()` nem para custom properties. Foi considerado e recusado nesta rodada (ver Decisions).
- **Não** mexer no comportamento abaixo de 768px.
- **Não** mudar o `sm:pt-102`, o `h-117.5`, o `xl:w-149.5` nem o `y=390` do corpo do vídeo — são a referência de onde os 18px saem.
- **Não** tocar em coleções, globals ou tipos do Payload.
- **Não** adicionar um sétimo path para `2xl`.

## Decisions

### D1 — Manter `clip-path: path()`, corrigir os números

`clip-path: shape()` resolveria a raiz do problema: um `--gutter: 18px` como fonte única, `calc()` derivando os dois shapes, `100%` no lugar das alturas fixas, e nenhuma duplicação por breakpoint. Mas exige Chrome 135+ / Safari 18.4+ / Firefox 139+, e o projeto não declara piso de browser.

**Decisão:** manter `path()`. É o que já está em produção, tem suporte universal, e a mudança fica restrita a números — risco praticamente zero.

**Custo aceito:** os seis paths hardcoded continuam existindo e continuam precisando ser mantidos em sincronia manualmente. Este design mitiga isso derivando todos os números de quatro constantes (abaixo) e registrando a derivação, mas não elimina a duplicação. Se o bloco voltar a evoluir, `shape()` é a próxima parada.

*Alternativa considerada:* `shape()` com fallback `path()` sob `@supports`. Rejeitada por duplicar o código dos shapes — dobra o custo de manutenção justamente onde ele já é o problema.

### D2 — Quatro constantes, todo o resto derivado

Nenhum número entra num path sem sair desta tabela:

| Constante | Valor | Origem |
|---|---|---|
| `G` (respiro) | 18 | `sm:pt-102` (408) − base do corpo do vídeo (390) |
| `R` (raio convexo) | 16 | `--radius-2xl` |
| `R + G` (raio côncavo) | 34 | exigido pela concentricidade (D3) |
| `W` (largura útil) | 736 / 992 / 598 | ver tabela em Context |

Consequências diretas:

- Degrau do `.services_shape` = `408 + step − 470 = G` → **`step = 80`** nos três breakpoints. (`md` e `lg` já estão; `xl` muda de 86 para 80.)
- Aba do vídeo começa em `notch_x + G` no espaço do container.

### D3 — Arcos concêntricos nos cantos

Uma faixa de largura constante entre duas bordas curvas exige que os arcos compartilhem o centro. Com o convexo em `R`, o côncavo tem que ser `R + G`:

```
CANTO SUPERIOR                          CANTO INFERIOR

      vídeo (côncavo, r=34)                    services (côncavo, r=34)
            ╭──────                        ────────╮
           ╱                                        ╲
    ┄┄┄┄┄┄╯  ← 18px em toda a curva          ┄┄┄┄┄┄╯
         ╭─╮                                      ╭─╮
        ╱   ╲                                    ╱   ╲
  services (convexo, r=16)                 vídeo (convexo, r=16)

  centro comum em (notch_x − 16, 408 + 16)   centro comum em (tab_x + 16, 470 − 16)
```

Hoje os dois lados usam `r=16`, o que faz a faixa estreitar na diagonal. O efeito é sutil isolado, mas é a diferença entre "corrigido" e "desenhado direito" — e o custo é o mesmo, já que os paths vão ser reescritos de qualquer forma.

*Alternativa considerada:* manter `r=16` dos dois lados. Rejeitada — reintroduz uma assimetria (menor) logo no lugar que a mudança existe para consertar.

### D4 — Rodapé pelo `border-radius`, não pelo path

O elemento já tem `rounded-2xl`. O `border-radius` recorta o background do elemento independentemente do `clip-path`, então os cantos inferiores reais podem ser deixados por conta dele. O path passa a descer até um valor sentinela muito além de qualquer altura plausível (`99999`), com cantos inferiores retos.

Isso remove as alturas `2984`/`2600`/`2920`, remove o arco inválido de `xl` (`A 16,16` entre pontos a 626px), e torna o recorte imune ao crescimento do conteúdo do CMS de uma só vez.

O `path()` continua responsável pelos cantos que o `border-radius` não alcança — os do degrau, que são pontos interiores das bordas.

*Nota de limpeza:* com isso, o `rounded-l-2xl rounded-br-2xl ... rounded-2xl` no elemento passa a ter classes redundantes (as três são `2xl`). Vale reduzir a `rounded-2xl`.

### D5 — Nada a fazer acima de 1280px (premissa inicial refutada)

A proposta partia de que em viewport ≥1536px o `container` abriria para 96rem e o encaixe quebraria, e previa um `xl:max-w-320` como remédio.

**Isso estava errado.** O projeto sobrescreve o utilitário em [globals.css:260-262](../../../src/app/(app)/globals.css#L260-L262):

```css
@utility container {
  max-width: 80rem; /* 1280px */
}
```

O teto de 1280px já é incondicional — não existe faixa `2xl`. A medição em 1600px confirma: `services.width = 1280`, `video.width = 598`, gaps idênticos aos de 1280px (18/16/24). O `xl:max-w-320` seria um no-op.

**Decisão:** nenhuma mudança de markup para esse fim. O requisito de estabilidade acima de 1280px continua válido na spec — só que já é satisfeito pelo override existente, e a verificação em 1600px passa a ser um teste de regressão sobre ele.

### D5b — O bug de altura já está em produção

A proposta tratava as alturas fixas como risco futuro ("se o conteúdo do CMS crescer"). A medição mostra que **em `lg` já está acontecendo**: sondando o rodapé do bloco, a caixa mede 2952px mas o `path()` foi desenhado para 2600 — **352px do fundo escuro estão sendo cortados hoje**.

| viewport | altura da caixa | altura no path | cortado |
|---|---|---|---|
| 768 | 3000 | 3000 | 0 |
| **1024** | **2952** | **2600** | **352** |
| 1280 | 2920 | 2920 | 0 |

As outras duas coincidem por acaso — e a coincidência se desfaz sozinha assim que o conteúdo do Payload mudar. Isso eleva D4 de limpeza preventiva para correção de bug ativo.

### D6 — Geometria resultante

Todos os números abaixo saem de D2 e D3. `notch_x` (a posição do entalhe no bloco de serviços) é mantido como está hoje em cada breakpoint; tudo o mais é derivado dele.

**Coordenadas do container:**

| | md | lg | xl |
|---|---|---|---|
| Largura útil `W` | 736 | 992 | 1280 |
| Largura do vídeo | 736 | 992 | 598 |
| Offset do vídeo (`right-0`) | 0 | 0 | **682** |
| `notch_x` (serviços) | 489 | 659 | 850 |
| Início da aba = `notch_x + 18` | 507 | 677 | 868 |
| Centro do canto superior | (473, 424) | (643, 424) | (834, 424) |
| Centro do canto inferior | (523, 454) | (693, 454) | (884, 454) |
| Degrau (`step`) | 80 | 80 | 80 |

**`.video_shape`** — coordenadas locais (subtrair o offset em `xl`):

```
md:  M 0,16 A 16,16 0,0,1 16,0 L 720,0 A 16,16 0,0,1 736,16
     L 736,454 A 16,16 0,0,1 720,470
     L 523,470 A 16,16 0,0,1 507,454        ← convexo r=16
     L 507,424 A 34,34 0,0,0 473,390        ← côncavo r=34 (concêntrico)
     L 16,390 A 16,16 0,0,1 0,374 L 0,16 Z

lg:  … L 976,0 … 992,16 … 992,454 … 976,470
     L 693,470 A 16,16 0,0,1 677,454
     L 677,424 A 34,34 0,0,0 643,390
     L 16,390 A 16,16 0,0,1 0,374 L 0,16 Z

xl:  … L 582,0 … 598,16 … 598,454 … 582,470     (local: 868−682=186, 152=186−34)
     L 202,470 A 16,16 0,0,1 186,454
     L 186,424 A 34,34 0,0,0 152,390
     L 16,390 A 16,16 0,0,1 0,374 L 0,16 Z
```

**`.services_shape`** — coordenadas locais (topo do elemento = `y=0` = container `y=408`):

```
md:  M 0,16 A 16,16 0,0,1 16,0
     L 473,0 A 16,16 0,0,1 489,16           ← convexo r=16
     L 489,46 A 34,34 0,0,0 523,80          ← côncavo r=34 (concêntrico)
     L 720,80 A 16,16 0,0,1 736,96
     L 736,99999 L 0,99999 L 0,16 Z         ← rodapé pelo border-radius

lg:  … L 643,0 A 16,16 0,0,1 659,16
     L 659,46 A 34,34 0,0,0 693,80
     L 976,80 A 16,16 0,0,1 992,96
     L 992,99999 L 0,99999 L 0,16 Z

xl:  … L 834,0 A 16,16 0,0,1 850,16
     L 850,46 A 34,34 0,0,0 884,80
     L 1264,80 A 16,16 0,0,1 1280,96
     L 1280,99999 L 0,99999 L 0,16 Z
```

**Checagens que devem fechar:**

- Cada arco de `R=16` percorre exatamente 16 em `x` e 16 em `y`; cada arco de `R=34` percorre 34 em cada eixo.
- `x` final do arco côncavo do vídeo == `x` inicial do arco convexo do serviços (`473` em md, `643` em lg, `834` em xl no espaço do container) — é a tangente vertical do centro comum.
- `gap C = 408 + 80 − 470 = 18` nos três.
- Nenhum segmento retrocede: o `L 855,86` de `xl` e o `L 494,80` de `md` desaparecem.

## Risks / Trade-offs

- **Regressão visual em algum breakpoint não conferido** → verificar nas quatro larguras que exercitam caminhos distintos: 768, 1024, 1280 e 1600 (esta última valida D5). Conferir também 640–767, que não deve mudar.

- **O sentinela `99999` é feio e depende do `border-radius` para o rodapé** → é a única forma de desacoplar altura e recorte sem sair de `path()`. Documentado em D4 com um comentário no CSS explicando por que o número é arbitrário e quem cuida dos cantos.

- **Os seis paths continuam hardcoded** → aceito conscientemente em D1. Este design registra a derivação completa em D6, então uma futura alteração tem de onde recalcular em vez de ajustar no olho — que foi exatamente como o bug do `xl` nasceu.

- ~~**`xl:max-w-320` muda a largura em telas ≥1536px**~~ → risco eliminado por D5: o teto de 1280px já existe no `@utility container` e nenhuma mudança de markup é necessária. A mudança não altera o layout em viewport nenhum — só o recorte.

- **`r=34` é um filete visivelmente maior que o `r=16` de hoje** → é o preço da concentricidade, e é o que faz o respiro ficar constante na curva. Se o resultado destoar do resto da página, o ajuste é baixar `R` para 12 e o côncavo para 30, mantendo a relação `R + G`.

## Migration Plan

Mudança puramente de apresentação, sem estado nem dados. Deploy normal; rollback é reverter o commit.

Um único commit é suficiente, mas se for preferível revisar em partes, a ordem que mantém a página coerente a cada passo é: (1) larguras de `md`/`lg`, (2) rodapé independente de altura, (3) simetria e cantos concêntricos.

A verificação é feita por sonda automatizada em vez de inspeção a olho: `clip-path` recorta também o hit-testing, então `document.elementFromPoint` em centros de pixel (`+0.5`) revela a borda real de cada shape depois do recorte. Varrer uma linha ou coluna entre os dois blocos mede os três trechos do respiro diretamente no DOM renderizado, sem depender de comparação de imagem.

## Open Questions

- ~~**`xl:max-w-320` é aceitável em monitores grandes?**~~ Resolvida por D5: a pergunta não existe, o teto de 1280px já é incondicional.
- **O filete de `r=34` conversa com o resto da página?** Só dá para responder olhando o resultado renderizado. O plano B está registrado em Risks.
