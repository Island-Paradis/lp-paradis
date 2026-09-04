## Why

A geometria da home é desenhada com `clip-path: path()` em coordenadas absolutas, congeladas em três larguras (736 / 992 / 1280). A largura real do elemento, porém, é fluida (`min(1280, vw) − 32`), então os dois só coincidem exatamente em 768px, 1024px e ≥1280px. Em toda largura intermediária o recorte amputa a borda direita — até **255px** em 1023px e em 1279px — e o conteúdo continua sendo layoutado na largura cheia, virando texto branco sobre branco fora do card escuro.

O mesmo sintoma ("conteúdo cortado") tem mais quatro causas independentes que aparecem em *todas* as larguras, não só entre breakpoints: o vídeo aparece um breakpoint antes da geometria que o encaixa, títulos de serviço truncados por `text-nowrap`, caps de largura (`max-w-*`) inertes por estarem em elementos inline, e o Hero com padding e tipografia fixos sem variantes para mobile.

## What Changes

- **Recorte independente da largura do elemento**: os `path()` de `md` e `lg` deixam de terminar na largura do breakpoint e passam a se estender à direita até `99999`, aplicando horizontalmente o mesmo recurso que o arquivo já usa verticalmente. O arredondamento das bordas direitas passa a ser responsabilidade do `border-radius` do elemento.
- **Canto que deixa de coincidir com o box**: o canto superior direito do painel direito do `.services_shape` fica em `y=80`, dentro do elemento, e portanto não é alcançado pelo `border-radius`. Ele é restaurado por um overlay de canto invertido (`radial-gradient` na cor de fundo). Consequência aceita: o entalhe passa a ficar ancorado em px fixos a partir da esquerda, deslizando proporcionalmente dentro da faixa do breakpoint.
- **Faixa 640–767px**: o bloco de vídeo migra de `sm:` para `md:`, alinhando sua visibilidade à faixa onde a geometria de encaixe existe. Elimina a sobreposição de 62px entre o vídeo (470px de altura) e o card escuro (que começa em 408px) nessa faixa.
- **Títulos de serviço nunca truncados**: remoção do `text-nowrap` nos `h3` do grid de serviços, onde a célula de 3/12 colunas oferece ~112px úteis para rótulos como "Mobile Development" e "API & Integrations".
- **Caps de medida efetivos**: os `max-w-*` aplicados a elementos inline (`<span>`, `<motion.span>`) passam a ter um `display` que os torne válidos, restaurando os limites de medida de leitura pretendidos.
- **Hero legível em mobile**: `p-20` + `p-10` + `text-6xl` + `leading-20` ganham variantes responsivas; hoje são 120px de padding por lado sem breakpoint, deixando 135px de conteúdo em uma tela de 375px.
- **Largura da `section` explícita**: a `section` passa a declarar sua largura em vez de depender do comportamento de estiramento do flex pai, já que toda a matemática dos paths depende de `W = vw − 32`.

## Capabilities

### New Capabilities

- `responsive-content-fit`: garante que nenhum conteúdo da home seja cortado, truncado ou renderizado fora da sua superfície visível em qualquer largura de viewport — cobre truncamento de rótulos, caps de medida de leitura, e espaçamento/tipografia que não deixam área útil suficiente.

### Modified Capabilities

- `homepage-shape-interlock`: o requisito "Largura do path acompanha a largura real do elemento" assume que a largura útil é constante dentro de cada breakpoint, o que é falso — é essa premissa que produz a amputação. Passa a exigir que o recorte seja indiferente à largura do elemento. O requisito "Faixas sem entalhe permanecem inalteradas" descreve a faixa 640–767px como dois blocos empilhados, o que não corresponde ao render atual (há sobreposição) nem ao comportamento após a mudança (vídeo oculto).

## Impact

- `src/app/(app)/globals.css` — os quatro `path()` de `md` e `lg` (`.video_shape`, `.services_shape`); novo overlay de canto invertido; comentário-âncora que documenta as constantes G/R/W precisa refletir que `W` deixa de ser uma delas.
- `src/app/(app)/[locale]/page.tsx` — prefixos de breakpoint do bloco de vídeo e do seu wrapper (`sm:` → `md:`); largura explícita da `section`.
- `src/components/ServicesSection/index.tsx` — `text-nowrap` nos `h3`; `<span className="max-w-3xl">`.
- `src/components/Hero/index.tsx` — `p-20`, `p-10`, `text-6xl`, `leading-20`, `<motion.span className="max-w-lg">`.
- `openspec/specs/homepage-shape-interlock/spec.md` — dois requisitos revisados.
- Sem impacto em schema do Payload, tipos gerados, rotas ou dependências. Nenhuma mudança de API ou de dados.
- Verificação é visual e manual: não há test runner configurado no projeto.
