## Why

O encaixe entre o bloco de vídeo (`.video_shape`) e o bloco escuro de serviços (`.services_shape`) na home tem três larguras diferentes de respiro branco — 18px no trecho de cima, 16px no vertical e 24px no de baixo. A assimetria é visível em desktop e faz o recorte parecer desalinhado em vez de intencional.

A causa é que os seis `clip-path: path()` em `globals.css` foram desenhados à mão, um por breakpoint, sem uma fonte única de verdade. Ao medir a geometria para corrigir o gap, apareceram outros três defeitos no mesmo bloco de CSS que ninguém tinha notado: cantos do vídeo desaparecendo em `md`/`lg`, um arco inválido no rodapé do `services_shape` em `xl`, e alturas fixas em pixel que cortam o fundo escuro se o conteúdo do CMS crescer. Corrigir tudo junto evita mexer duas vezes nos mesmos paths.

## What Changes

**Simetria do encaixe (o pedido original)**

- Uniformizar o respiro entre os dois shapes em **18px constantes** nos três trechos do recorte, em `md`, `lg` e `xl`.
- Corrigir o degrau do `.services_shape` em `xl`: hoje começa em `y=86` (gap de 24px), passa a `y=80` (gap de 18px), alinhando `xl` ao que `md` e `lg` já faziam.
- Tornar os arcos dos cantos **concêntricos**, para que o respiro continue com 18px também nas curvas e não só nas retas. Hoje os dois lados usam `r=16`, o que faz a faixa branca estreitar na diagonal dos cantos. Passa a `r=16` no canto convexo e `r=34` no côncavo correspondente (`34 = 16 + 18`).
- Remover os artefatos de desenho manual: o `L 855,86` que anda 5px para trás em `xl` (auto-interseção no contorno) e os arcos de degrau que não são quartos de círculo (`A 16,16` percorrendo 10×18px).

**Defeitos latentes nos mesmos paths**

- `.video_shape` em `md` está desenhado para 768px e em `lg` para 1024px, mas o elemento mede 736px e 992px (a `section` tem `px-4`). Os 32px excedentes são cortados, **removendo os cantos arredondados do lado direito do vídeo** nesses dois breakpoints. Corrigir as larguras para 736 e 992.
- O rodapé do `.services_shape` em `xl` tem `L 1280,2294 A 16,16 0,0,1 1264,2920`: um arco de raio 16 entre pontos a 626px de distância. Pela spec SVG o browser escala os raios até caber, produzindo uma curva gigante em vez de um canto. Corrigir.
- As alturas `2984`/`2600`/`2920` são a altura estimada do bloco de serviços. **Medindo a página renderizada, esse defeito já está ativo em `lg`:** a caixa mede 2952px e o path foi desenhado para 2600, ou seja **352px do fundo escuro estão sendo cortados hoje**. Em `md` e `xl` os números coincidem por acaso, e a coincidência se desfaz assim que o conteúdo do Payload mudar. Estender o path além de qualquer altura plausível e delegar o arredondamento inferior ao `border-radius` que o elemento já tem.

**Investigado e descartado**

- A suspeita de que o encaixe quebraria em viewport ≥1536px (com o `container` do Tailwind abrindo para 96rem) **não se confirmou**: o projeto sobrescreve o utilitário com `max-width: 80rem` incondicional em `globals.css`. A medição em 1600px mostra largura de 1280px e gaps idênticos aos de 1280px. Nenhuma mudança de markup é necessária para isso, e a verificação em 1600px vira apenas um teste de regressão.

**Sem mudança de comportamento**

- Abaixo de `sm` (640px) o vídeo continua oculto; entre `sm` e `md` os dois blocos continuam retângulos empilhados sem entalhe. Nada muda nessas faixas.
- Nenhuma alteração em coleções, globals ou tipos do Payload.

## Capabilities

### New Capabilities

- `homepage-shape-interlock`: o recorte entrelaçado entre o bloco de vídeo e o bloco escuro de serviços na home — a largura do respiro entre eles, o comportamento dos cantos, e como o recorte acompanha os breakpoints e a altura do conteúdo vindo do CMS.

### Modified Capabilities

Nenhuma. Não existem specs em `openspec/specs/`.

## Impact

**Código**

- `src/app/(app)/globals.css` — os seis blocos `path()` de `.video_shape` (linhas 286–314) e `.services_shape` (linhas 316–343). É o arquivo central da mudança.
- `src/app/(app)/[locale]/page.tsx` — apenas as classes de raio redundantes no `.services_shape` (`rounded-l-2xl rounded-br-2xl ... rounded-2xl`), que valem uma limpeza agora que o `border-radius` passa a ser responsável pelos cantos inferiores. Nenhuma alteração de layout.

**Não afetado**

- Coleções e globals do Payload, `payload-types.ts`, i18n, e qualquer outro componente. A mudança é puramente de apresentação e não toca dados.

**Risco**

- Baixo. `clip-path: path()` tem suporte universal e a técnica não muda — só os números. O risco real é regressão visual não percebida em algum breakpoint, mitigada por conferência nos quatro pontos de largura (768, 1024, 1280, 1600).

**Dependências**

- Nenhuma nova. Não há runner de testes no projeto; a verificação é visual.
