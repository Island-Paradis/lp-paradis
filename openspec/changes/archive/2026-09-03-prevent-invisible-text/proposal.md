## Why

Textos da home existem no DOM mas não chegam à tela. A investigação mostrou que não se trata de um bug isolado, e sim de um padrão repetido: **toda técnica de revelação e estilização de texto do site tem o estado de falha igual a invisível.** Quando o mecanismo que deveria revelar o texto não roda — porque o JavaScript não hidratou, porque um observer não disparou, porque um gradiente não pintou, ou porque um container recortou — o resultado nunca é "texto sem animação". É texto ausente.

O caso mais grave é verificável sem abrir o navegador. O `motion` serializa a prop `initial` como `style` inline durante o SSR (`makeLatestValues` → `useInitialMotionValues` → `buildHTMLStyles`, confirmado em `framer-motion@12.38.0`). Isso significa que o HTML entregue pelo servidor já contém:

- `style="opacity:0"` em **todo** bloco envolvido por `<Reveal>` — o que hoje é praticamente a home inteira;
- `style="transform:translateY(110%)"` em **cada palavra** dos `<h2>` que passam por `<TextReveal>`, dentro de uma máscara `overflow-hidden`.

Sem JS bem-sucedido, a página é entregue em branco com o conteúdo presente e invisível. Isso atinge crawlers e previews de link sem JS, falhas de carregamento do bundle, e qualquer erro de hidratação em componente vizinho — e independe de viewport, o que explica o sintoma ser observado em todas as larguras.

## What Changes

O princípio único: **inverter o estado de falha de invisível para visível** em todos os mecanismos que hoje escondem texto.

- **Primitivas de revelação (`Reveal`, `TextReveal`) passam a falhar visíveis.** O estado renderizado no servidor passa a ser o estado final legível. O estado oculto só é aplicado depois que o cliente confirma que o sistema de animação está vivo e é capaz de reverter. Sem JS, sem observer, ou com erro de hidratação, o texto aparece normalmente — apenas sem animação.
- **`TextReveal` ganha rede de segurança temporal.** Hoje usa `once: true`; se o `IntersectionObserver` não relatar interseção, as palavras ficam permanentemente fora da máscara. Passa a haver um limite de tempo após o qual o estado revelado é forçado.
- **`Reveal` deixa de reverter para invisível ao sair da viewport.** Hoje não usa `once`, e o variant `hidden` é `opacity: 0` — todo bloco da home volta a ser invisível sempre que sai do campo de visão. Isso transforma qualquer falha de observer em conteúdo que some ao rolar.
- **Visibilidade deixa de depender exclusivamente de cor.** O `<h1>` do Hero usa `bg-clip-text` + `text-transparent`: o texto é literalmente transparente e só existe pelo gradiente recortado. Passa a existir uma cor sólida de fallback que só cede lugar ao gradiente quando o suporte é confirmado.
- **Containers que recortam deixam de poder amputar texto.** Cobre o `h-full` no header das células de serviço (que reivindica a altura toda e espreme a descrição contra o `overflow-hidden` da célula de altura fixa) e a regra geral para `clip-path`, `overflow-hidden` e alturas fixas.
- **Higiene de aninhamento HTML.** Restam `<p>` dentro de `<span>` em `page.tsx`; parte já foi convertida para `<div>` na branch atual. Uniformizar remove uma fonte de ruído de hidratação e de `validateDOMNesting`.
- **Procedimento de verificação sem JS.** Passa a existir um passo explícito e repetível — desligar o JavaScript e conferir que todo o texto da home permanece legível — que é o teste que captura a classe inteira de uma vez.

Não faz parte do escopo: alterar o desenho das animações (durações, easing, stagger, direções), mexer na geometria do encaixe `clip-path` entre o vídeo e o bloco de serviços, ou introduzir um runner de testes.

## Capabilities

### New Capabilities

- `text-visibility-guarantees`: A invariante transversal de que nenhum texto renderizado pode depender, para ser visto, de um mecanismo cujo estado de falha seja invisível. Cobre visibilidade por cor (gradiente recortado em texto), recorte por container (`overflow-hidden`, `clip-path`, alturas fixas) e o comportamento sem JavaScript.
- `scroll-reveal-animations`: O contrato das primitivas `Reveal` e `TextReveal` — qual é o estado renderizado no servidor, quando o estado oculto pode ser aplicado, quando a revelação é forçada, se a animação replica ao sair da viewport, e como `prefers-reduced-motion` é respeitado.

### Modified Capabilities

Nenhuma. `openspec/specs/` contém hoje apenas `homepage-shape-interlock`, cujos requisitos tratam da geometria do encaixe entre `.video_shape` e `.services_shape` e não mudam aqui.

## Impact

**Código afetado**

- `src/components/ui/reveal.tsx` — primitiva usada em `page.tsx`, `ServicesSection`, `FAQSection`, `TestimonialsSection` e `ProductsSection` (10 instâncias). É o arquivo de maior alcance da mudança.
- `src/components/ui/text-reveal.tsx` — usada em `page.tsx`, `ServicesSection` e `SectionHeading`.
- `src/components/Hero/index.tsx` — `<h1>` com `bg-clip-text` + `text-transparent`, e as `motion.div` com variants `hidden`/`show` próprias (mesmo padrão de falha, fora das primitivas).
- `src/components/ServicesSection/index.tsx` — `h-full` no header da célula; `overflow-hidden` na célula; `md:auto-rows-[60px]`.
- `src/app/(app)/[locale]/page.tsx` — aninhamento `<span><p>` restante e remoção do `console.log` de depuração deixado na linha 29.

**Coordenação com a change em aberto**

`fix-responsive-content-clipping` está em progresso (34/49 tarefas; as pendentes são todas de verificação visual) e sua tarefa 5.4 já cobre a leitura completa das células de serviço em 768px. Para não duplicar: aqui trata-se apenas da regra estrutural — um irmão flex não pode reivindicar a altura inteira de um container que recorta. As medições por breakpoint permanecem naquela change.

**Sem impacto**

Payload, esquema de coleções, i18n, rotas e build. A mudança é inteiramente de camada de apresentação e não altera nenhum contrato de dados.

**Risco principal**

Inverter o estado inicial das primitivas muda o que o servidor emite para quase toda a home. Se a aplicação do estado oculto no cliente não acontecer antes da primeira pintura, aparece um flash de conteúdo já visível antes da animação começar — exatamente o problema que o `initial` no SSR existe para evitar. O design precisa resolver esse conflito explicitamente, e não escolher um lado por omissão.
