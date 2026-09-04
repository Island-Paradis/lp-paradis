## 1. Baseline (antes de qualquer mudança)

- [x] 1.1 Confirmar que `next build` roda com o `.env` presente; registrar qualquer variável faltante antes de prosseguir
- [x] 1.2 ~~Adicionar `@next/bundle-analyzer`~~ → **substituído**: o analisador se pluga pelo hook `webpack`, que o Turbopack ignora. Usar o `next build --experimental-analyze` embutido no Next 16, sem dependência nova. Script de agregação em `scripts/bundle-attribution.py`
- [x] 1.3 Rodar o build analisado na branch base e registrar o tamanho do first-load JS da rota `(app)/[locale]`, com a contribuição de `@solar-icons/react` isolada
- [x] 1.4 Registrar LCP, TBT e tamanho total transferido no perfil de referência (Android médio, CPU 4x throttle, rede 4G), em `/pt` e `/en` — via `npx lighthouse@12`, cujo preset mobile padrão já é esse perfil
- [ ] 1.5 Gravar um trace de performance de scroll contínuo na home e anotar: custo de paint da nav, entradas de forced reflow, e etapas de layout durante movimento do cursor — **exige DevTools interativo, fica para conferência manual**
- [x] 1.6 Salvar as medidas em `openspec/changes/optimize-landing-performance/baseline.md` para que o antes/depois sobreviva ao merge

> **Resequenciamento após a baseline.** A medição inverteu a prioridade da camada 1: o vídeo é 69,4% do peso da página no alvo (8,5 MB, baixado mesmo em viewport móvel), contra 17,5% dos ícones e 10,0% das fontes. O grupo 8.1–8.2 é o maior ganho de bytes e um dos menores riscos, então passa a ser executado **antes** dos grupos 2 e 3. A ordem de risco crescente do design se mantém; só a posição do vídeo muda, e por medição.

## 2. Barril de ícones (item ①)

- [x] 2.1 Trocar `trailingIcon?: IconName` por uma prop tipada como `React.ComponentType<IconProps>` em `src/components/Button/index.tsx`, removendo `import * as Icons` e `type IconName`
- [x] 2.2 Trocar `icon?: IconName` por `React.ComponentType<IconProps>` em `src/components/Badge/index.tsx`, removendo `import * as Icons` (o import de tipo em `@solar-icons/react/lib/types` fica: é `import type`, apagado na compilação, e não passa pelo barril)
- [x] 2.3 Atualizar os quatro call sites com imports nomeados estáticos: `page.tsx` (`ArrowRightDown`), `ProductsSection` (`ArrowRight`), `ServicesSection` (`Widget6`), `SectionHeading` (`Widget6`)
- [x] 2.4 Verificar por grep que nenhum `import * as` de pacote de ícones sobrou em código alcançável a partir de um `"use client"` — só restam `import * as React`, que é estático e não indexado
- [x] 2.5 Rodar `npm run lint` e o build analisado; confirmar que a contribuição de `@solar-icons/react` caiu para o proporcional aos ícones usados — **12.738.385 B → 86.780 B (−99,3%)**. Os 42 erros do Biome são pré-existentes (idênticos na base limpa); os arquivos tocados têm 0 erros
- [x] 2.6 Conferir que os quatro ícones renderizam idênticos, incluindo `weight="Bold"` onde é passado via `iconProps` — HTML server-rendered comparado contra a base: **40 `<svg>` e 73 `<path>` antes e depois**

## 3. Fontes (item ②)

- [x] 3.1 Auditar o uso real de `--font-gilroy` — a família é aplicada em **dois** lugares, ambos com peso explícito: `page.tsx` (`font-medium`, 500) e `Hero/index.tsx` (`font-bold`, 700). Zero itálicos, zero usos sem peso. Sobrevivem 500 e 700, ambos `normal`
- [x] 3.5 Reduzir a declaração aos pesos aprovados na auditoria — **18 TTFs baixados (1.224.350 B) → 2**. Executado **antes** da conversão, invertendo a ordem do design: o risco que a ordem original isolava (cortar um peso em uso) foi eliminado pela auditoria de 3.1, que veio inequívoca, e o corte entregava 89% do ganho sem exigir ferramenta nenhuma
- [x] 3.2 Converter os arquivos Gilroy de TTF para WOFF2 — via `fontTools` (`pip3 install --user fonttools brotli`; ferramenta de usuário, nada adicionado ao projeto). Medium 143.724 → 45.448 B, Bold 137.256 → 44.540 B (−68%)
- [x] 3.3 Atualizar `src/fonts/gilroy.ts` para apontar aos WOFF2 e remover os TTF do repositório — `src/fonts/gilroy/` foi de 2,8 MB / 20 arquivos para 92 KB / 2 arquivos. Os TTFs seguem recuperáveis pelo histórico do git
- [x] 3.4 Verificar renderização tipográfica: `font-gilroy` continua aplicado nos dois lugares com `font-medium` e `font-bold`, e **CLS = 0** — a troca de formato não introduziu deslocamento
- [x] 3.6 Reconferir após o corte — 0 TTFs requisitados, 2 WOFF2 do Gilroy (90.886 B). O terceiro `.woff2` na rede é o Inter do `next/font/google`, pré-existente e não tocado. Nenhum fallback de fonte observado

## 4. Blur da nav — parte grátis (item ③a)

- [x] 4.1 Confirmar que `--background` é opaco nos dois temas definidos em `globals.css` e que o estado não-rolado da nav de fato não revela nada atrás de si — `#ffffff` (claro) e `#151718` (escuro), ambos sem canal alfa; o estado não-rolado usa `bg-background` puro
- [x] 4.2 Em `NavBarRoot.tsx`, condicionar `backdrop-blur` ao estado `scrolled`, mantendo a transição de entrada existente
- [ ] 4.3 Verificar **de olho** que o topo da página está visualmente idêntico e que o estado rolado permanece inalterado — o argumento é forte (fundo opaco ⇒ blur sem efeito visível), mas a confirmação é visual
- [ ] 4.4 Regravar o trace de scroll e registrar a queda de custo de paint atribuída à nav — **depende da 1.5, que exige DevTools**

## 5. Layout forçado no scroll (item ⑤)

- [x] 5.1 Em `src/components/ui/cursor-glow.tsx`, trocar o handler de `scroll` por uma marcação de rect obsoleto, sem nenhuma leitura de geometria
- [x] 5.2 Medir o rect sob demanda no `mouseenter` e no `mousemove`, apenas quando marcado como obsoleto
- [x] 5.3 Trocar o listener de `resize` por `ResizeObserver` sobre o elemento pai — pega também as mudanças de tamanho que não vêm da janela, como a animação de entrada do hero
- [ ] 5.4 Verificar **interativamente** o caso que motivou o `measure()` no `mouseenter`: rolar até o hero mudar de posição, entrar com o ponteiro, e confirmar que o halo aparece alinhado
- [x] 5.5 Confirmar que não há mais leitura de geometria em handler de scroll — verificado por grep sobre todos os `addEventListener("scroll", ...)`: nenhuma ocorrência de `getBoundingClientRect`/`offsetTop`/`scrollHeight`. A confirmação no trace depende da 1.5

## 6. `will-change` permanente (item ⑥)

- [x] 6.1 Remover `will-change: transform` de `.video_shape` e `.services_shape` em `globals.css`, mantendo `transform: translateZ(0)`
- [ ] 6.2 Verificar **de olho** o encaixe entre os dois shapes em `md`, `lg` e `xl` contra o que `homepage-shape-interlock` define, procurando serrilhado ou deslocamento novo
- [x] 6.3 Confirmar que o parallax do vídeo continua correto, já que é o `div` interno que anima e não o shape — `parallax.tsx:43` mantém seu próprio `willChange`, e é legítimo: aquele elemento de fato anima `y` continuamente
- [ ] 6.4 Registrar a mudança de uso de memória de camadas no perfil de referência — **depende de DevTools**

## 7. Cursor (item ④)

- [x] 7.1 Em `CursorFollower`, fixar o elemento em 90px e substituir a animação de `width`/`height` por `scale`, com os estados `default` e `hover` escalando para baixo
- [x] 7.2 Substituir `marginLeft`/`marginTop` animados por centralização estática — **não** por `translate(-50%,-50%)` como o design previa: no Motion, `x` é apelido de `translateX`, e os dois na mesma `style` se sobrescrevem. As margens ficam, mas derivadas de `BASE_SIZE` constante, então o layout é calculado uma vez em vez de por frame
- [x] 7.3 Coalescer por frame o `closest('[data-cursor]')` e os dois `setState`, deixando `x.set()`/`y.set()` fora da coalescência por não passarem pelo ciclo de render
- [ ] 7.4 Conferir **de olho** a nitidez da borda em tela retina e não-retina, com `mix-blend-difference` ativo sobre fundo claro e escuro
- [x] 7.5 Verificar que nenhuma propriedade de layout sobrou sob animação — grep sobre todos os `animate=`/`variants=`: nenhuma ocorrência de `width`/`height`/`margin*`/`top`/`left`/`padding*`. O label "View" segue só no estado `view` (escala 1) e sem `data-reveal`, pelo motivo documentado no arquivo. *A conferência visual dos três estados fica com a 7.4*
- [ ] 7.6 Confirmar no trace que os frames da transição não contêm etapa de layout atribuída ao cursor — **depende de DevTools**
- [ ] 7.7 Verificar **interativamente** que o cursor continua colado ao ponteiro em movimento rápido, sem atraso introduzido pela coalescência

## 8. Vídeo (item ⑦)

- [x] 8.1 Adicionar `media="(min-width: 768px)"` ao `<source>` do vídeo em `page.tsx`, alinhado ao breakpoint do wrapper `hidden md:block`
- [x] 8.2 Confirmar no painel de rede que o arquivo não é requisitado abaixo de 768px e continua sendo requisitado acima — **mobile (375px): 0 requisições `.mp4`; desktop (1350px): 1 requisição, 9,6 MB**
- [ ] 8.3 Adicionar campo de upload opcional para o poster no mesmo grupo de `backgroundVideo` na global `HomePage`
- [ ] 8.4 Rodar `npx payload generate:types` e ajustar os tipos `Populated*` em `src/service/types.ts` se necessário
- [ ] 8.5 Renderizar o `poster` no `<video>`, com degradação limpa quando o campo estiver vazio
- [ ] 8.6 Verificar que o vídeo reproduz em loop como hoje acima de 768px e que o poster cobre o espaço antes de ele chegar

## 9. Fecho: medir, podar, decidir

- [ ] 9.1 Repetir as três medidas de 1.3, 1.4 e 1.5 e registrar a diferença **por item** em `baseline.md`
- [ ] 9.2 Identificar qualquer item que não tenha entregue ganho mensurável e revertê-lo em vez de defendê-lo
- [ ] 9.3 Percorrer o inventário de movimento — cursor, halo, marquee, parallax, revelações de bloco e de palavra, transição de página, swap de texto, magnetismo — e confirmar que todos seguem presentes com o mesmo comportamento aparente
- [ ] 9.4 Verificar com `prefers-reduced-motion` ativo que cada componente tocado mantém o caminho degradado que já tinha, incluindo a garantia de visibilidade de `prevent-invisible-text`
- [ ] 9.5 Verificar que `reveal.tsx` e `text-reveal.tsx` não foram tocados e que o contrato `data-reveal` mais o failsafe de `layout.tsx` seguem intactos
- [ ] 9.6 Com o número final na mão, decidir se ainda vale reduzir a intensidade do blur no estado `scrolled` da nav — único item de decisão visual da change, e o único que precisa de aprovação de olho
- [ ] 9.7 Rodar `npm run lint` e `next build` limpos antes de fechar
