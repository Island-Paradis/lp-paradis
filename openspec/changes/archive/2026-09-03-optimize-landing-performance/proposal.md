## Why

A landing page carrega e rola mal em aparelho Android médio, e o custo não está nas animações — está em decisões ao redor delas. Um `import * as` do `@solar-icons/react` com acesso dinâmico impede tree-shaking de uma biblioteca de 26MB de ESM dentro do bundle crítico; 2.8MB de TTF são servidos para usar dois pesos; e quatro pontos do runtime pagam layout ou paint por frame durante um scroll que o Lenis mantém ativo o tempo todo.

A distinção importa porque a identidade visual do site é o movimento. A tentação óbvia — cortar animação para ganhar performance — resolveria o sintoma destruindo o produto. Esta change existe para provar que não é preciso: **cada item aqui preserva o efeito percebido, ou é revertido.**

## What Changes

**Camada 1 — bytes até a primeira pintura**

- `Button` e `Badge` deixam de receber ícone por nome (`trailingIcon: IconName` + `Icons[nome]`) e passam a receber o componente já importado pelo call site. Remove os dois únicos `import * as Icons` do codebase. **BREAKING** para os call sites desses dois componentes (mudança de tipo de prop).
- Fontes Gilroy convertidas de TTF para WOFF2, reduzidas aos pesos efetivamente usados. Os 20 arquivos atuais cobrem 10 pesos × 2 estilos; o site usa `font-medium` e `font-bold`, em dois lugares.
- O `<video>` de fundo do bloco de serviços ganha `poster` e política de `preload` explícita, e para de ser buscado em viewports onde seu wrapper é `hidden`.

**Camada 2 — custo por frame durante o scroll**

- `CursorFollower` passa a animar `scale` em vez de `width`/`height`/`marginLeft`/`marginTop`. O efeito é o mesmo círculo crescendo; o custo deixa de ser reflow por frame.
- O `mousemove` do `CursorFollower` passa a ser coalescido por frame, em vez de rodar `closest()` e dois `setState` por evento.
- `CursorGlow` para de chamar `getBoundingClientRect()` no listener de `scroll`. A medida passa a vir de `ResizeObserver` e do `mouseenter` que já existe.
- `backdrop-blur-2xl` na nav sticky é reduzido ou substituído por fundo opaco, mantendo a leitura de vidro no estado `scrolled`.
- `will-change: transform` permanente sai de `.video_shape` e `.services_shape`.

**Transversal**

- A change define um alvo de aceitação: **Android médio, CPU throttled 4x, rede 4G**. Cada item precisa de um antes/depois medido nesse perfil, não de uma justificativa teórica.

## Capabilities

### New Capabilities

- `client-bundle-budget`: o que a landing page tem permissão de enviar ao browser no carregamento inicial — proibição de barris não-tree-shakeable, formato e escopo dos arquivos de fonte, e política de carregamento de mídia pesada. Cobre a camada 1.
- `scroll-frame-budget`: o que a página tem permissão de custar por frame enquanto o usuário rola ou move o ponteiro — ausência de layout forçado em handlers de scroll, ausência de animação sobre propriedades de layout, `will-change` com escopo temporal, e limite de efeitos de paint contínuo. Cobre a camada 2.

Ambas as capabilities carregam a mesma restrição de fechamento: nenhuma otimização pode alterar o efeito visual percebido. É o que separa esta change de "remover as animações".

### Modified Capabilities

Nenhuma. `homepage-shape-interlock` é a única capability já em `openspec/specs/`, e o `will-change` que esta change remove de `.video_shape`/`.services_shape` não participa de nenhum dos seus requisitos — ela trata de geometria de `clip-path`, não de compositing.

## Impact

**Código**

- `src/components/Button/index.tsx`, `src/components/Badge/index.tsx` — remoção do barril; mudança de tipo de prop.
- Os quatro call sites afetados, verificados por grep — a superfície é pequena, o que torna a troca barata:
  - `trailingIcon`: `src/app/(app)/[locale]/page.tsx:61` (`ArrowRightDown`), `src/components/ProductsSection/index.tsx:26` (`ArrowRight`).
  - `Badge icon`: `src/components/ServicesSection/index.tsx:143` (`Widget6`), `src/components/SectionHeading/index.tsx:25` (`Widget6`).
- `src/fonts/gilroy.ts` e `src/fonts/gilroy/` — substituição dos arquivos e da declaração.
- `src/components/CursorFollower/index.tsx`, `src/components/ui/cursor-glow.tsx`, `src/components/NavBar/NavBarRoot.tsx`.
- `src/app/(app)/globals.css` — `.video_shape` e `.services_shape`.
- `src/app/(app)/[locale]/page.tsx` — o `<video>`.
- `next.config.ts` — bundle analyzer, se for a via escolhida para medir.

**Fronteiras com trabalho em andamento**

- `prevent-invisible-text` (58/60) é dona do script de failsafe em `layout.tsx`, da marcação `data-reveal` e da rede de segurança no fim de `globals.css`. O escopo desta change foi cortado deliberadamente para **não** tocar `reveal.tsx` nem `text-reveal.tsx`. O `CursorFollower` tem um comentário explicando por que seu label "View" não leva `data-reveal`; essa decisão permanece.
- `fix-responsive-content-clipping` (34/49) toca `globals.css` e os shapes. Conflito de merge é provável na região de `.video_shape`/`.services_shape` — apenas nas linhas de `will-change`, não na geometria.

**Fora de escopo, deliberadamente**

- Os `IntersectionObserver` por palavra do `TextReveal`. São 3 usos com headlines curtas, o ganho é pequeno, e o refactor esbarra no contrato de `prevent-invisible-text`.
- Trocar Lenis por scroll nativo. Isso é remover uma animação.
- Reintroduzir `viewport once` no `Reveal`. Foi decidido contra, com justificativa registrada no próprio arquivo.

**Risco**

O único item com efeito visual real é o `backdrop-blur` da nav. Os outros seis são invisíveis se feitos certo — e a checagem de que continuam invisíveis é parte da definição de pronto.
