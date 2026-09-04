## 1. Baseline visual

- [x] 1.1 Rodar `npm run dev` e capturar o estado atual da home em 768, 1024, 1280 e 1600px de viewport, focando na região do encaixe entre o vídeo e o bloco escuro de serviços. São a referência de comparação para o resto da mudança.
- [x] 1.2 Confirmar nos screenshots os três defeitos que devem sumir: gap inferior visivelmente maior que o superior em 1280px, cantos direitos do vídeo cortados em ângulo reto em 768 e 1024px, e encaixe totalmente desalinhado em 1600px.

**Resultado do baseline** (sonda via `elementFromPoint`, que respeita o `clip-path`):

| vw | videoW | svcW | gapA | gapB | gapC | canto dir. quadrado | rodapé cortado |
|---|---|---|---|---|---|---|---|
| 768 | 736 | 736 | 18 | 16 | 18 | **sim** | 0 |
| 1024 | 992 | 992 | 18 | 16 | 18 | **sim** | **352px** |
| 1280 | 598 | 1280 | 18 | 16 | **24** | não | 0 |
| 1600 | 598 | 1280 | 18 | 16 | **24** | não | 0 |

Confirma a assimetria 18/16/24 em `xl` e os cantos cortados em `md`/`lg`. Dois desvios do previsto: (a) o encaixe em 1600px **não** está desalinhado — o `container` já é limitado a 1280px pelo projeto; (b) o corte do rodapé **já está ativo em `lg`**, com 352px de fundo escuro faltando. Artefatos atualizados (D5, D5b).

## 2. `.video_shape` — larguras reais e cantos concêntricos

Referência: tabela de geometria em `design.md` (D6). Arquivo: `src/app/(app)/globals.css`.

- [x] 2.1 Reescrever o path de `md` (`min-width: 768px`) para largura **736** (era 768), com a aba começando em `x=507`, canto convexo `r=16` em `(523,470)→(507,454)` e filete côncavo `r=34` em `(507,424)→(473,390)`.
- [x] 2.2 Reescrever o path de `lg` (`min-width: 1024px`) para largura **992** (era 1024), com a aba começando em `x=677`, convexo `r=16` em `(693,470)→(677,454)` e côncavo `r=34` em `(677,424)→(643,390)`.
- [x] 2.3 Reescrever o path de `xl` (`min-width: 1280px`) mantendo a largura **598**, com a aba começando em `x=186` (local), convexo `r=16` em `(202,470)→(186,454)` e côncavo `r=34` em `(186,424)→(152,390)`.
- [x] 2.4 Conferir que os três paths mantêm `L 16,390 A 16,16 0,0,1 0,374 L 0,16 Z` no fecho à esquerda — esse trecho não muda.
- [x] 2.5 Verificar cada arco: os de `r=16` percorrem 16 em `x` e 16 em `y`; os de `r=34` percorrem 34 em cada eixo. Nenhum segmento retrocede sobre o traçado anterior.

## 3. `.services_shape` — degrau simétrico e rodapé independente de altura

- [x] 3.1 Reescrever o path de `md` com o degrau em `y=80`: convexo `r=16` em `(473,0)→(489,16)`, côncavo `r=34` em `(489,46)→(523,80)`, depois `L 720,80 A 16,16 0,0,1 736,96`. Remover o `L 494,80` que retrocedia.
- [x] 3.2 Reescrever o path de `lg` com o mesmo degrau em `y=80`: `(643,0)→(659,16)` convexo, `(659,46)→(693,80)` côncavo, depois `L 976,80 A 16,16 0,0,1 992,96`.
- [x] 3.3 Reescrever o path de `xl` com o degrau **movido de 86 para 80** — esta é a correção que fecha o gap de 24px para 18px: `(834,0)→(850,16)` convexo, `(850,46)→(884,80)` côncavo, depois `L 1264,80 A 16,16 0,0,1 1280,96`. Remover o `L 855,86`.
- [x] 3.4 Substituir o rodapé dos três paths por `L <W>,99999 L 0,99999 L 0,16 Z`, eliminando as alturas fixas `2984`/`2600`/`2920` e o arco inválido de `xl` (`L 1280,2294 A 16,16 0,0,1 1264,2920`).
- [x] 3.5 Adicionar um comentário no CSS explicando que o `99999` é um sentinela deliberado e que os cantos inferiores ficam por conta do `border-radius` do elemento (D4 do design).

## 4. Ajustes no markup

Arquivo: `src/app/(app)/[locale]/page.tsx`.

- [x] 4.1 ~~Adicionar `xl:max-w-320` à `section`~~ — **cancelada**. A premissa (o `container` abrindo para 96rem acima de 1536px) foi refutada pela medição: o projeto sobrescreve o utilitário com `max-width: 80rem` incondicional em [globals.css:260](../../../src/app/(app)/globals.css#L260), e em 1600px o bloco já mede 1280px. Seria um no-op. Ver D5.
- [x] 4.2 Reduzir `rounded-l-2xl rounded-br-2xl ... rounded-2xl` no `.services_shape` (linha ~85) para apenas `rounded-2xl` — as três classes são `2xl` e o resultado já é idêntico; a redundância só confunde agora que o `border-radius` é quem cuida dos cantos inferiores.
- [x] 4.3 Conferir que o `.video_shape` (linha ~71) mantém `rounded-2xl`, já que ele também depende do `border-radius` para os cantos que o path não descreve.

## 5. Verificação

- [x] 5.1 Medir o encaixe em 1280px e confirmar os três trechos com 18px: base do corpo do vídeo → topo do painel esquerdo, borda da aba → borda do entalhe, base da aba → topo do painel direito.
- [x] 5.2 Repetir a medição em 768px e 1024px e confirmar os mesmos 18px, sem divergência entre breakpoints.
- [x] 5.3 Em 768px e 1024px, confirmar que os cantos superior direito e inferior direito do bloco de vídeo voltaram a aparecer arredondados.
- [x] 5.4 Em 1600px, confirmar que o encaixe tem a mesma aparência que em 1280px — agora um teste de regressão sobre o `@utility container` (D5), não uma correção.
- [x] 5.5 Conferir que em viewports abaixo de 640px e entre 640–767px nada mudou em relação ao baseline de 1.1.
- [x] 5.6 Validar o recorte independente de altura: confirmar que o corte de 352px medido em `lg` no baseline foi para zero, e que nos demais breakpoints o fundo escuro chega ao fim da caixa com os cantos inferiores arredondados.
- [x] 5.7 Rodar `npm run lint` e garantir que o Biome passa. — **O Biome NÃO passa: 42 erros e 15 warnings.** Todos pré-existentes: a contagem é idêntica com e sem este diff (verificado via `git stash`), e nenhum dos dois arquivos tocados tem erro (só 2 warnings de `optional chain` em linhas que não foram alteradas). A suíte já estava vermelha antes desta mudança; consertá-la está fora do escopo aqui.

**Resultado da verificação** (mesma sonda do baseline):

| vw | gapA/B/C antes | depois | simétrico | canto dir. | rodapé cortado |
|---|---|---|---|---|---|
| 768 | 18/16/18 | **18/18/18** | sim | quadrado → arredondado | 0 → 0 |
| 1024 | 18/16/18 | **18/18/18** | sim | quadrado → arredondado | **352 → 0** |
| 1280 | 18/16/**24** | **18/18/18** | sim | ok | 0 → 0 |
| 1600 | 18/16/**24** | **18/18/18** | sim | ok | 0 → 0 |

500px e 700px inalterados em relação ao baseline. Um validador separado confere os invariantes direto no CSS-fonte: todo arco `r=16` percorre 16 em cada eixo, todo `r=34` percorre 34, nenhum segmento retrocede, e os pares de cantos são concêntricos nos centros previstos por D6 — (473,424)/(523,454) em md, (643,424)/(693,454) em lg, (834,424)/(884,454) em xl.
- [ ] 5.8 Registrar no PR que o filete côncavo passa de `r=16` para `r=34` — é a única mudança visual além da simetria em si, e é a questão em aberto do design que precisa de aval humano (plano B nos Risks: baixar para 12/30 mantendo `R + G`).
