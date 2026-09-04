## Why

A hidratação do React falha de forma determinística em toda carga com `prefers-reduced-motion: reduce` ativo, e a causa está no código do projeto, não numa dependência com defeito.

`useReducedMotion()` do `motion` lê a preferência **durante a renderização**, num inicializador de `useState`:

```js
// framer-motion@12.43.0 — utils/reduced-motion/use-reduced-motion.mjs
!hasReducedMotionListener.current && initPrefersReducedMotion();
const [shouldReduceMotion] = useState(prefersReducedMotion.current);
```

E `prefersReducedMotion.current` vale `null` no servidor por projeto — `initPrefersReducedMotion()` retorna cedo quando `window` não existe (`motion-dom@12.43.0`). Logo:

| | valor de `useReducedMotion()` | markup |
|---|---|---|
| servidor | `null` (falsy) | caminho de movimento completo |
| primeira renderização no cliente, reduce **off** | `false` | caminho de movimento completo — **casa** |
| primeira renderização no cliente, reduce **on** | `true` | caminho reduzido — **não casa** |

Nove arquivos ramificam nesse valor dentro do corpo de renderização. Dois deles trocam a árvore inteira (`text-reveal.tsx:30`, `parallax.tsx:68`): sob reduce, o servidor emite N `<span>` mascarados e o cliente pede uma `<div>` única. Isso é divergência de forma de DOM, o tipo que o React não consegue remendar — ele descarta e re-renderiza a raiz (React #418, já anotado em `HydrationSignal/index.tsx:29`).

O custo não é teórico e já está pago em dívida espalhada pelo repositório:

- **A rede de segurança de visibilidade compensa o defeito em vez de proteger contra falhas reais.** `HydrationSignal` reaplica `.js` e remove `.reveal-failsafe` porque o re-render de raiz zera os atributos de `<html>`. É código defensivo cuja justificativa documentada é este bug.
- **O `<script>` inline do failsafe é substituído por um nó inerte.** Quando o React re-renderiza a raiz, ele recria `<script>` via parsing de fragmento (`react-dom-client:13001`), o que marca o elemento como *already started* — permanentemente não-executável. É deliberado, e é a origem do aviso `Encountered a script tag while rendering React component` visto em `[locale]/layout.tsx:81`.
- **Quem pediu movimento reduzido paga a página duas vezes.** Toda a home é renderizada no servidor, descartada e reconstruída no cliente. É exatamente o público com menos margem para isso.

Vale registrar o que **não** é causa: a detecção de ponteiro fino (`cursor-glow.tsx:65`, `CursorFollower/index.tsx:35`, `use-magnetic.ts:49`) já usa o padrão correto — `useState(false)` mais efeito — e não divergir. `useReducedMotion()` é a única leitura de ambiente em tempo de renderização no `src/`.

## What Changes

O princípio único: **nenhuma renderização pode ler o ambiente.** O que o servidor emite e o que o cliente pede na primeira renderização passam a ser idênticos, sempre, independentemente de qualquer preferência do usuário.

A preferência continua respeitada — muda apenas onde ela é consultada. Duas categorias, e a fronteira entre elas é o que decide o tratamento:

- **Movimento reduzido que altera markup passa para CSS.** `Reveal`, `TextReveal`, `Parallax`, `Hero` e o `template` de rota deixam de ramificar: emitem sempre o caminho de movimento completo, e uma regra sob `@media (prefers-reduced-motion: reduce)` neutraliza o deslocamento. O mecanismo é o mesmo `!important` que a rede de segurança em `globals.css` já usa para vencer o `style` inline do `motion` — proven, não novo.
- **Movimento reduzido que altera comportamento passa para um hook com efeito.** `SmoothScroll` (montar ou não o Lenis), `CursorGlow`, `CursorFollower` e `useMagnetic` decidem sobre interação pós-montagem, não sobre markup inicial. Um hook próprio devolve `false` no servidor **e na primeira renderização do cliente**, e atualiza depois da montagem. Um frame de atraso não é observável para nada nessa categoria.
- **`TextReveal` perde o subtree alternativo.** Sob reduce, as palavras passam a aparecer sem deslocamento e sem animação, em vez do fade de opacidade de hoje. O caminho de movimento completo anima apenas `y` — não há opacidade para transicionar quando o deslocamento é neutralizado. É uma mudança de comportamento observável e por isso vira delta de spec, não detalhe de implementação.
- **O hook próprio corrige um segundo defeito de graça.** `useReducedMotion()` do `motion` nunca reage a mudanças da preferência depois da montagem — há um `TODO` no código-fonte dizendo isso. O hook do projeto assina o `MediaQueryList`.
- **`HydrationSignal` tem os comentários reescritos, não o código removido.** As duas linhas defensivas ficam — defesa em profundidade contra falhas de hidratação genuínas —, mas os comentários hoje afirmam como fato um bug que esta change elimina. Comentário que descreve um mundo que não existe mais é pior que comentário nenhum.

**Não faz parte do escopo:** trocar o veículo do script inline do failsafe, adotar `@media (scripting: none)`, ou relaxar a exigência de que ele rode antes da primeira pintura. Foram considerados e ficam de fora deliberadamente — o aviso do `<script>` desaparece como consequência de a hidratação passar a funcionar, e é essa a forma de verificação. Também fora: alterar durações, easing, stagger ou distâncias do caminho de movimento completo.

## Capabilities

### New Capabilities

- `hydration-integrity`: A invariante de que nenhum caminho de renderização consulta o ambiente do navegador — media queries, ponteiro, viewport, armazenamento, fuso — durante a renderização. Define o que o servidor e a primeira renderização do cliente devem ter em comum, qual é o padrão obrigatório para consultar o ambiente, e como a ausência de divergência é verificada.

### Modified Capabilities

- `scroll-reveal-animations`: O requisito "Preferência por movimento reduzido é respeitada sem custo de visibilidade" muda de mecanismo e de resultado observável. O caminho reduzido deixa de ser um subtree alternativo escolhido em JavaScript e passa a ser o mesmo markup com o deslocamento neutralizado em CSS; sob reduce, `TextReveal` passa a revelar as palavras sem animação em vez de com fade de opacidade.

## Impact

**Código afetado**

Ramificação em tempo de renderização, categoria *markup* — passa a CSS:

- `src/components/ui/reveal.tsx` — `initial` condicional; primitiva de maior alcance da home (10 instâncias).
- `src/components/ui/text-reveal.tsx` — `return` alternativo completo; o pior dos dois casos estruturais.
- `src/components/ui/parallax.tsx` — `return` alternativo completo.
- `src/components/Hero/index.tsx` — valores de variant e `staggerChildren`.
- `src/app/(app)/[locale]/(pages)/template.tsx` — `initial` condicional.

Ramificação em tempo de renderização, categoria *comportamento* — passa ao hook com efeito:

- `src/components/SmoothScroll/index.tsx` — monta `ReactLenis` ou devolve `children`. Vale registrar que **este não é hoje fonte de divergência**: com `root`, o `ReactLenis` renderiza `children` sem wrapper (`lenis-react.mjs:116`), então o DOM não difere. Entra na change pela invariante, não pelo sintoma.
- `src/components/ui/cursor-glow.tsx`, `src/components/CursorFollower/index.tsx`, `src/lib/use-magnetic.ts` — portões de interação.

Novo e adjacente:

- `src/lib/use-reduced-motion.ts` — o hook do projeto, seguindo o padrão de nomes de `src/lib/use-*.ts`.
- `src/app/(app)/globals.css` — a regra sob `@media (prefers-reduced-motion: reduce)`, vizinha da rede de segurança já documentada no fim do arquivo.
- `src/components/HydrationSignal/index.tsx` — comentários.

**Sem impacto**

Payload, esquema de coleções, i18n, rotas, Dockerfile e o contrato de dados. A mudança é inteiramente de camada de apresentação.

**Como isto se verifica**

O sinal de aceitação é negativo e barato: com `prefers-reduced-motion: reduce` ativo, o console do navegador não emite React #418 nem `Encountered a script tag while rendering React component`. Hoje emite os dois. Não há runner de testes no projeto (ver `CLAUDE.md`), então a verificação é manual e o alternar da preferência do sistema é o gatilho.

**Risco principal**

`[data-reveal]` cobre quatro dos cinco componentes de markup com precisão — em `Reveal`, `TextReveal`, `Hero` e no `template`, o atributo já está exatamente no elemento que carrega o deslocamento. **`Parallax` é a exceção: não carrega `data-reveal` em nenhum elemento.** O atributo é, por projeto, o marcador de "estado inicial invisível" (ver `scroll-reveal-animations`), e o parallax nunca é invisível — só deslocado. Então a regra de CSS não o alcança, e o design tem duas saídas: marcá-lo com `data-reveal`, o que mentiria sobre o significado do atributo e o exporia à rede de segurança de visibilidade sem necessidade; ou introduzir um segundo marcador com semântica própria.

O risco real está aí, e é de alcance, não de recorte: um marcador novo para "elemento cujo `transform` é decorativo" precisa nascer com fronteira explícita, senão vira o balde onde tudo com `transform` cai — inclusive `transform` que serve a layout. E há um efeito colateral específico do parallax a verificar: hoje, sob reduce, ele descarta o wrapper `overflow-hidden`; depois da mudança o wrapper permanece, com o deslocamento zerado. Conteúdo que hoje transborda sem ser recortado passa a poder ser recortado.
