## Context

`Button` tem hoje dois caminhos de hover que não se conhecem.

O caminho **sem `textSwap`** vive inteiro na `cva` `buttonVariants` (`src/components/Button/index.tsx:10-38`): cada variante declara o seu `hover:bg-*` e acabou. É o que o `Footer`, o `Header` e o `LocaleSwitch` usam.

O caminho **com `textSwap`** acrescenta a esse um mapa paralelo, `swapInvert` (linhas 67-78), que injecta um `<span>` de preenchimento absoluto e classes de hover no `<button>`:

```
swapInvert[variant] = { text, fill }
                         │      │
                         │      └── <span aria-hidden absolute inset-0 translate-y-full
                         │            group-hover:translate-y-0>   500ms, cubic-bezier(.22,1,.36,1)
                         └───────── hover:text-* / hover:border-*  aplicado ao <button>
```

O mapa tem exactamente dois slots. Tudo o que o botão desenhe fora desses dois slots fica com a cor de repouso durante o hover. E há duas coisas nessa situação:

1. **O disco do `circleIcon`** — `rounded-full bg-primary p-1 text-white` cravado na linha 128, sem hover nenhum.
2. **O contorno** — existe na `cva`, e o slot `text` sequestra-o à socapa juntando `hover:border-primary!` à mesma string que trata a cor do rótulo.

Sobrepondo isto aos dois CTAs em causa:

```
CTA Serviços — outline, página clara            CTA Produtos — inverted, secção bg-primary
┌──────────────────────────┐                    ┌──────────────────────────┐
│  Ver serviços     ( ↘ )  │  repouso           │  Ver produtos       →    │  repouso
└──────────────────────────┘  ok                └──────────────────────────┘  ok
   borda #edeef0                                   bloco branco sobre #212528
   disco #212528 / seta #fff                       seta #212528 (currentColor)

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐                    ╷                          ╷
│▓▓Ver serviços▓▓▓▓▓▓▓▓▓▓▓▓│  hover             ╷  Ver produtos       →    ╷  hover
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘                    ╷                          ╷
   borda #212528  = fill  ✗ dissolve               fill #212528 = secção  ✗ dissolve
   disco #212528  = fill  ✗ dissolve               sem borda nenhuma      ✗ sem silhueta
   seta  #fff     — sobra a flutuar                seta #fff  ✓ herda currentColor
```

Os dois sintomas parecem diferentes — "o ícone não inverte" e "o contorno não se vê no escuro" — mas são a mesma avaria: **uma cor fixa que, no instante do hover, passa a coincidir com a superfície atrás dela.** No CTA de Serviços a superfície é o preenchimento que sobe; no CTA de Produtos é a própria secção.

A seta nua do CTA de Produtos é o único elemento que se comporta bem, e não é por acaso: não tem cor própria. O `IconBase` do `@solar-icons/react` (`dist/esm/lib/IconBase.mjs`) usa `color = "currentColor"` por omissão e passa-o como atributo de apresentação no `<svg>`; os traços usam `stroke="currentColor"`. O glifo herda o `color` do pai e inverte de graça. Este é o padrão a preservar, não a substituir.

**Restrições do projeto:** sem test runner (`CLAUDE.md`); a superfície de verificação é uma rota de fixture guardada por `NODE_ENV`. Biome, não ESLint. React Compiler ligado. Tailwind v4 com tokens em `src/app/(app)/globals.css` — só `--primary: #212528` e `--secondary: #edeef0` são relevantes aqui.

## Goals / Non-Goals

**Goals:**

- Que o disco do `circleIcon` e o seu glifo troquem de cor quando o preenchimento sobe, em sincronia com ele.
- Que o CTA de Produtos mantenha silhueta delimitada quando o preenchimento fica da cor da secção.
- Que a inversão passe a ser declarada por camada e por variante, em vez de haver camadas que ninguém declarou.
- Que a caixa de conteúdo tenha as mesmas dimensões em repouso e em hover.
- Que os estados fiquem verificáveis numa página só.

**Non-Goals:**

- O botão `outline-inverted` do `Footer`. Não usa `textSwap`, portanto nunca chega ao `swapInvert`. Corrigi-lo é mexer na `cva`, que é o outro caminho.
- As cores de **repouso** do `circleIcon` nas variantes `primary` e `outline-inverted`. Estão erradas em teoria — um disco `#212528` sobre um botão `#212528` — mas nenhuma das duas usa `circleIcon` hoje, e inventar cores para um caso inexistente é escrever código não verificável.
- A variante `primary` com `textSwap` (`Hero`), que tem a falha estrutural da `inverted` ao contrário: preenchimento `bg-white` sobre página clara. Fica para quando for observada; o slot `rim` acomoda-a sem redesenho.
- Durações, curvas de easing e direcções das animações existentes.
- Introduzir um test runner.

## Decisions

### 1. Quatro slots no `swapInvert`, em vez de regras avulsas no JSX

O mapa passa a `{ text, fill, icon, rim }`:

```
swapInvert[variant] = { text, fill, icon, rim }
                         │      │     │     │
                         │      │     │     └── cor do contorno em hover  → <button>
                         │      │     └──────── disco + glifo em hover    → <span class="icon">
                         │      └────────────── painel que sobe           → <span aria-hidden>
                         └───────────────────── cor do rótulo em hover    → <button>
```

`rim` sai de dentro de `text`, onde estava escondido. Hoje `text` para a variante `outline` vale `"hover:text-white! hover:border-primary!"` — duas decisões visuais diferentes numa string com um nome que só descreve uma delas. Separá-las é a razão pela qual a mudança seguinte (dar cor ao contorno da `inverted`) não obriga a reescrever a cor do rótulo.

**Alternativa considerada:** pôr as classes de hover do ícone directamente no JSX do `<span>`, com um ternário por variante. Rejeitada — espalha a tabela de cores por dois sítios, e a próxima variante a precisar de ícone teria de ser lembrada em ambos. O mapa é a tabela; o JSX consome-a.

**Alternativa considerada:** mover tudo para a `cva` como variantes compostas. Rejeitada por ser uma reescrita grande de um componente que oito ficheiros consomem, para resolver dois botões.

### 2. A classe morta `icon` passa a ser o gancho

O `<span>` do ícone já tem `icon` no `className` (linha 127) e `grep -rn "icon" src/app/\(app\)/globals.css` não devolve nada — não existe regra para ela em lado nenhum. É um gancho que alguém preparou e nunca usou. É onde `invert.icon` é aplicado, o que evita inventar um nome novo.

### 3. Tabela de cores

A regra que decide cada célula: **cada camada contrasta com a superfície imediatamente atrás dela** — para o contorno, a superfície é o fundo da página; para o disco e o rótulo, é o preenchimento do botão nesse instante.

| variante | | repouso | hover |
|---|---|---|---|
| **outline**<br>página clara | superfície | branco (página) | `#212528` (fill) |
| | rótulo | `#212528` | branco |
| | disco / glifo | `#212528` / branco | branco / `#212528` |
| | contorno | `#edeef0`, 1,5px | `#212528`, 1,5px |
| **inverted**<br>secção `#212528` | superfície | branco (botão) | `#212528` (fill) — **= a secção** |
| | rótulo | `#212528` | branco |
| | disco / glifo | — (não usa `circleIcon`) | — |
| | contorno | transparente, 1,5px | `neutral-500` `#737373`, 1,5px |

O contorno da `outline` em hover fica de propósito igual ao preenchimento. Não viola a regra: o que está atrás do contorno é a página branca, e `#212528` sobre branco é o contraste máximo disponível. A silhueta é carregada pela fronteira fill/página. Um aro mais claro ali leria como halo à volta de uma pastilha escura.

### 4. O contorno da `inverted` é opaco, não `white/40`

`border-white/40` era a escolha óbvia e está errada. O `background` de um elemento pinta por baixo da área da borda (`background-clip: border-box`, que o Preflight do Tailwind não altera), e o `<span>` de preenchimento é `absolute inset-0` — `inset-0` resolve contra a **padding box**, portanto o painel nunca cobre a borda. A borda compõe-se sobre o `bg-white`/`hover:bg-white/90` do próprio botão, não sobre a secção escura. `white/40` sobre branco dá branco: o alfa não faz nada e o aro sai sólido.

Um valor opaco torna o resultado independente desse detalhe. `neutral-500` (`#737373`) contra `#212528` dá cerca de 3,4:1 — linha fina e nítida, sem gritar.

**Alternativa considerada:** `border-secondary` (`#edeef0`). Contraste muito mais alto, usa um token do sistema em vez de um neutro do Tailwind, mas a 1,5px sobre `#212528` lê como contorno luminoso e chama mais atenção que o próprio rótulo.

**Alternativa considerada:** mudar `background-clip` para `padding-box` na variante para o alfa passar a funcionar. Rejeitada — resolve o alfa e estraga o repouso, onde a borda transparente deixaria de se fundir com o bloco branco.

### 5. 1,5px reservados sempre, cor a mudar

`border` conta para dentro do box. Passar 1px → 1,5px em hover encolhe a caixa de conteúdo meio pixel de cada lado a meio da animação, e estes dois botões têm `magnetic` a deslocá-los ao mesmo tempo — é onde um tremor sub-pixel se nota mais. Portanto a espessura é fixa nos dois estados e só a cor muda:

- `outline`: `border` → `border-[1.5px]` na `cva`. Muda também o repouso, que engorda ligeiramente o aro `#edeef0` — era parte do pedido.
- `inverted`: ganha `border-[1.5px] border-transparent`. Em repouso a borda transparente deixa ver o `bg-white` do botão por baixo (ponto 4), portanto o bloco continua a ler-se sem aro. A largura já está paga.

**Alternativa considerada:** `ring` em vez de `border`, que não ocupa espaço no box. Rejeitada — o botão já usa `ring` para `focus-visible:ring-2 ring-ring/50` e as duas regras colidiriam no elemento focado.

### 6. O ícone transita com a duração e o easing do painel

O `<span>` do ícone não tem hoje transição nenhuma. Sem uma, o disco salta para branco no instante em que o cursor entra, enquanto o painel escuro ainda está lá em baixo — disco branco sobre botão claro, ou seja, o mesmo defeito ao contrário durante 500ms. `invert.icon` traz portanto `transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`, copiando o painel.

Não são precisos `!` nas classes de hover do disco: `bg-primary` e `group-hover:bg-white` são modificadores diferentes, o `tailwind-merge` mantém os dois, e o `group-hover:` tem mais especificidade. O `hover:text-white!` do `<button>` também não interfere — o `<span>` tem `color` declarado, e herança só se aplica a quem não declara.

### 7. A fixture mostra os estados; o hover continua a ser feito à mão

`src/app/(app)/[locale]/(pages)/fixtures/buttons/page.tsx`, no molde da fixture do `Footer`: guarda `NODE_ENV === "development"` como primeira instrução, `notFound()` caso contrário. Renderiza cada variante com `textSwap`, com e sem `circleIcon`, sobre fundo claro e sobre `bg-primary`.

Não força o estado de hover. Forçá-lo obrigaria a duplicar as classes `group-hover:` numa variante `data-*`, o que faria a fixture testar uma cópia das regras em vez das regras. Quem verifica passa o rato — o que a página garante é que as combinações estão todas ali, lado a lado, sem navegar a home.

## Risks / Trade-offs

- **A `cva` `outline` é partilhada, e 1,5px chega a botões que ninguém pediu para mudar** → `Hero` (`outline`, sem ícone) e `Header` (`outline` com `bg-white` por cima) passam a ter aro de 1,5px em repouso. É meio pixel numa borda `#edeef0` sobre branco, praticamente no limiar do visível, mas ambos entram na lista de conferência visual das tasks.

- **O rótulo continua a transitar com um easing diferente do painel** → O `<button>` tem `transition-colors` com o easing por omissão do Tailwind (`cubic-bezier(.4,0,.2,1)`), enquanto o painel usa `cubic-bezier(.22,1,.36,1)`. Depois desta mudança o ícone acompanha o painel e o rótulo não, o que é uma incoerência nova entre irmãos. Não é corrigida aqui porque alinhar o `<button>` mudaria a sensação de **todos** os botões com `textSwap` do site, e o proposal exclui mexer em easing. Fica registado como a próxima coisa a decidir.

- **A tabela de cores está em código, não em tokens** → `neutral-500` é um neutro do Tailwind, não um token de `globals.css`. Se o site ganhar tema escuro a sério, esta célula é das que partem. Mitigação: está numa única tabela, num único ficheiro, e o design.md diz porque é aquele valor.

- **A fixture não previne regressões, só as torna visíveis** → Não há runner. Se alguém acrescentar uma variante ao `swapInvert` sem os quatro slots, nada falha no build: o ícone volta a ficar com cor fixa. A única mitigação real é o tipo do mapa exigir os quatro campos, o que torna a omissão um erro de TypeScript em vez de um bug visual.

## Migration Plan

Alteração puramente visual, num só componente e numa rota nova de desenvolvimento. Sem migração de dados, sem alteração de esquema do Payload — não é preciso `npx payload generate:types`. Sem dependências novas.

Reversão: `git revert` do commit. Nenhum estado persistido depende disto.

## Open Questions

- O aro `#737373` do CTA de Produtos é a espessura e o tom certos, ou fica pesado ao vivo sobre a secção? Só se decide com o rato em cima; a fixture existe para essa conversa ser curta.
- O `Hero` (`primary` + `textSwap`) dissolve-se no fundo claro como o CTA de Produtos se dissolve no escuro? Está fora de escopo por não ter sido observado, mas se a verificação visual das tasks o confirmar, o slot `rim` já lá está.
