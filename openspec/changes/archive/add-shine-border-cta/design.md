## Context

O botão de submissão de `/get-quote` é hoje um `<Button type="submit" variant="primary" size="lg" disabled={isPending}>` — o único CTA de peso do site sem nenhuma camada de movimento. `Hero` e `ProductsSection` passam `magnetic` e `textSwap`; o submit passa nada.

**O que se instala.** O registry entry de `@magicui/shine-border` é um único `<div>` `"use client"` sem dependências de runtime. Todo o movimento é CSS:

```
background: radial-gradient(transp, transp, COR, transp, transp)
background-size: 300% 300%           ← muito maior que a caixa
padding: var(--border-width)
mask:    linear-gradient(#fff 0 0) content-box  ─┐
         linear-gradient(#fff 0 0)              ─┤ exclude
                                                 ┘
  → pinta só a moldura de --border-width

@keyframes shine: background-position 0% 0% → 100% 100% → 0% 0%
className: motion-safe:animate-shine pointer-events-none
           absolute inset-0 size-full rounded-[inherit]
           will-change-[background-position]
```

O `motion-safe:` e o `pointer-events-none` já vêm do registry, o que satisfaz por construção dois requisitos de `cta-shine-border` (degradação sob movimento reduzido; camada inerte ao ponteiro).

**Restrições em vigor.** O cabeçalho de `QuoteForm.tsx` documenta três proibições pagas por erros anteriores neste repo — nenhum import de `@/i18n/navigation` (arrasta o parser ICU do `@formatjs`, +33,6 KB), nenhum ícone de biblioteca, nenhum barril indexado dinamicamente. O componente do registry não toca em nenhuma. A camada nova entra "de graça" no chunk do formulário.

**Estado de camadas do `Button` hoje.** Para `variant="primary"` sem `textSwap`, o caminho de render é mínimo:

```
<button class="… rounded-full bg-primary text-white">   ← NÃO é `relative`
  {content}
</button>
```

O `relative overflow-hidden isolate` só entra quando `swap` está ligado ([`Button/index.tsx:254`](../../../src/components/Button/index.tsx#L254)), e o painel de preenchimento só existe quando `invert` está definido, que depende do mesmo `swap`. Ou seja: a camada do anel tem de trazer o seu próprio contexto de posicionamento, porque o botão que a vai receber não o tem.

## Goals / Non-Goals

**Goals:**

- Anel animado permanente no botão de submissão de `/get-quote`, ligado por uma prop `shine` opt-in no `Button` partilhado.
- Ordenação de camadas resolvida uma vez, no `Button`, de forma correcta também para o caso `shine + textSwap` que hoje não existe em produção mas que qualquer call site futuro pode pedir.
- Custo contínuo confinado a uma rota e a um elemento, e declarado como excepção em `idle-runtime-budget` em vez de ficar silencioso.
- Anel **legível**: nem um vestígio de 1px a 33% de opacidade, nem uma moldura. Calibrado nos dois dials que decidem isso, e não só na espessura.
- Zero dependências novas em `package.json`, e o movimento continua a ser CSS declarativo — o que mantém a excepção de custo ocioso elegível.

**Non-Goals:**

- Ligar o anel em qualquer outro CTA. Nenhum outro call site muda.
- Usar o anel como indicador de submissão. Foi considerado e rejeitado (ver Decisões); o feedback de `isPending` continua a ser o `disabled:opacity-50` de hoje.
- Alterar a `cva`, as variantes ou a geometria de contorno do `Button`. O `swapInvert` ganha um quinto campo — é a única excepção, e é o mecanismo da tabela a ser usado como foi desenhado, não uma mudança do seu contrato.
- Trocar de efeito. O `border-beam` do mesmo registry dá um brilho mais óbvio, mas depende de `motion` a animar `offsetDistance`, que não é compositável: rAF permanente, contra o requisito de não assinar o loop de animação e contra a condição «Declarativa» da excepção de custo ocioso. Fica de fora enquanto essas duas se mantiverem.
- Migrar o `Button` para o padrão shadcn de `src/components/ui/`. Ele vive em `src/components/Button/` e continua lá.
- Ligar ou testar o bloco de tema `.dark` de `globals.css`. A cor do anel resolve por token para não se opor a ele, mas activá-lo está fora de âmbito.

## Decisions

### Anel permanente, e não em hover nem em `isPending`

Decisão do autor da change, tomada contra duas alternativas mais baratas em custo ocioso:

| Gatilho | Comunica | Custo ocioso |
|---|---|---|
| **Sempre** ← escolhido | "olha para aqui" | repaint contínuo enquanto a rota está aberta |
| Hover/focus | "isto está vivo" | zero |
| `isPending` | "estou a trabalhar" | zero |

A alternativa `isPending` resolvia um problema real — hoje a submissão só produz `opacity-50`, e o visitante não sabe se algo aconteceu — e a alternativa hover alinhava com a linguagem do site, onde todo o movimento de botão é reactivo (painel que sobe, rótulo que desliza, ímã). Nenhuma das duas foi escolhida: o objectivo é chamar o olho para o CTA terminal, e um efeito que só aparece depois do gesto não chama o olho para nada.

A consequência é assumida e paga em `idle-runtime-budget`, não escondida.

### O anel vive dentro do elemento, não num invólucro

O `ShineBorder` é `absolute inset-0` + `rounded-[inherit]`, logo precisa de um pai posicionado com o raio certo. Duas topologias:

```
A) INVÓLUCRO (rejeitado)              B) DENTRO do <button> (escolhido)

<span relative inline-flex            <button relative rounded-full
      rounded-full>                           bg-primary>
  <ShineBorder/>                        <ShineBorder/>
  <Button/>                             {content}
</span>                               </button>

o span mede o que o layout lhe der   o anel É o perímetro do botão
→ anel pode não coincidir            → coincide por construção
choca com o wrapper de `magnetic`    ortogonal a `magnetic`
padrão não reutilizável              uma prop, qualquer call site
```

O (A) parecia mais barato — não tocava no componente partilhado nem na capability `button-hover-inversion`. Foi rejeitado porque o `span` não tem garantia de medir o botão (num container flex ou grid pode esticar), e porque o `Button` já tem um invólucro `<motion.span>` próprio para os caminhos `asChild` e `href` ([`index.tsx:292-302`](../../../src/components/Button/index.tsx#L292-L302)) — um segundo invólucro por cima daquele é onde os desalinhamentos nascem.

### `shine` é uma camada, não um modo

A prop entra ao lado de `magnetic` e `textSwap` em `ButtonOwnProps`, e não dentro do mapa `swapInvert`. Razão: `swapInvert` é uma tabela cujos quatro campos são obrigatórios de propósito, para uma variante nova não esquecer uma camada — acrescentar-lhe um quinto campo obrigaria as quatro variantes a declarar cor de anel que três delas nunca vão usar.

O `shine` precisa de duas coisas do elemento hospedeiro, e as duas são aditivas sem tocar na `cva`:

```
relative   ← já lá está se `swap`; passa a entrar também se `shine`
z-index    ← só relevante se `swap`, para o anel ficar acima do painel
```

`asChild` fica de fora pelo mesmo motivo mecânico que já exclui as camadas de inversão: o `Slot` aceita um filho único. O caminho `href` fica dentro, coerente com o requisito «o caminho de render decide se as camadas existem» que `add-calendly-popup-cta` já pagou.

### Ordenação: anel acima do painel, abaixo do conteúdo

O painel de preenchimento é `absolute inset-0` e, para `primary`, é `bg-white`. Sendo dimensionado à caixa inteira, cobre o perímetro por completo:

```
sem z-index no anel:                  com o anel acima do painel:

repouso  ▸ ░░░ anel visível           repouso  ▸ ░░░ anel visível
hover    ▸ ███ painel branco          hover    ▸ ░░░ anel visível
             cobre o anel                          sobre o painel
             → efeito desaparece                → efeito sobrevive
             exactamente ao ser olhado
```

O conteúdo já está em `relative z-10` no caminho `swap` ([`index.tsx:277`](../../../src/components/Button/index.tsx#L277)), portanto o anel encaixa entre o painel (sem índice) e o conteúdo (`z-10`) sem mexer em nenhum dos dois. O `isolate` do caminho `swap` mantém o empilhamento confinado ao botão.

### A paleta é independente das superfícies — e a primeira tentativa não era

A primeira versão derivava a cor do token de primeiro plano da variante (`--primary-foreground` para `primary`, `--primary` para `outline`, etc.), pelo argumento de que a cor de uma camada se define contra a superfície atrás dela. **Está errada, e falha nas quatro variantes.**

O painel de hover do `textSwap` é, por construção, o oposto do preenchimento de repouso. Uma cor afinada contra o repouso é portanto exactamente a cor do painel:

```
variante           anel (token)   repouso      painel hover   sob o painel
─────────────────────────────────────────────────────────────────────────────
primary            #ffffff        #212528  ✓   bg-white       invisível
outline            #212528        página   ✓   bg-primary     invisível
inverted           #212528        bg-white ✓   bg-primary     invisível
outline-inverted   #ffffff        escura   ✓   bg-white       invisível
```

A saída não é escolher melhor o token — é **não derivar do preenchimento**. Uma paleta que não é keyed a nenhuma das duas superfícies não tem este modo de falha. Ficam as três matizes `#A07CFE`, `#FE8FB5`, `#FFBE7B`, medidas contra as duas superfícies que o botão pode apresentar:

```
matiz      vs #212528 (preenchimento)   vs #ffffff (painel)
──────────────────────────────────────────────────────────────
#A07CFE          5.3:1  ✓                     3.0:1  ✓
#FE8FB5          7.1:1  ✓                     2.2:1  fraco
#FFBE7B          9.8:1  ✓                     1.6:1  ✗
```

Sobra um caso: o painel claro. É o que o ajuste de hover resolve, abaixo.

O argumento do tema escuro que motivava os tokens cai por si: uma paleta que contrasta com `#212528` **e** com `#ffffff` não se importa com a inversão do bloco `.dark`, porque cobre as duas pontas do intervalo. Os literais deixam de ser um risco e passam a ser a razão pela qual funciona.

**Efeito colateral favorável, e não é pequeno:** o `shineColor` alimenta os stops do gradiente. Uma cor produz 5 stops (`transparent, transparent, C, transparent, transparent`), três cores produzem 7. Isso muda a geometria da banda acesa — ver a decisão de legibilidade.

### O ajuste de hover é luminosidade, não matiz

Como a paleta é fixa, o anel não tem de trocar de cor com o painel — tem de **escurecer** quando o painel é claro. Isso dispensa por completo o `@property --shine-color` que a primeira análise pedia: `filter` é interpolável nativamente e é compositável.

O ajuste entra como quinto campo obrigatório no `SwapInvert`, pela razão que a tabela já documenta — campos obrigatórios para que uma variante nova falhe a compilação em vez de ficar com a cor de repouso durante o hover:

```
SwapInvert {
  text, fill, icon, rim,
  shine   ← quinto campo, obrigatório

  primary            painel bg-white   → escurece
  outline            painel bg-primary → "" (declarado, não omitido)
  inverted           painel bg-primary → ""
  outline-inverted   painel bg-white   → escurece
}
```

Duração e curva são as do painel — `500ms cubic-bezier(0.22,1,0.36,1)` —, pela mesma razão que o `iconSwap` já as partilha: um ajuste mais rápido que a subida deixaria o anel escuro sobre um botão ainda escuro a meio caminho.

**A armadilha:** o repouso tem de declarar o filtro identidade e não omiti-lo. `filter: none → brightness(.75)` não interpola, salta — e o salto lê-se como um pisco no primeiro frame do hover. O repouso declara `brightness(1) saturate(1)`.

### A legibilidade tem dois dials, e o tamanho do botão não é nenhum deles

Com os defaults do registry o anel lê-se como um vestígio. A causa não é a que parece.

**Não é por ser uma pill.** O efeito é invariante à escala *e* ao aspect ratio. Com `background-size: 300%`, para um elemento W×H o gradiente é `farthest-corner` numa caixa 3W×3H, logo os raios são `(1.5W, 1.5H)·√2 = (2.121W, 2.121H)`. Centrado, o canto do elemento fica em:

```
r_norm = (0.5/2.121)·√2 = 0.3333     ← exactamente 1/3, para QUALQUER W,H
```

Uma pill de 212×44 e um cartão de 400×300 vêem o mesmo padrão. **O elemento vê sempre o terço interior do gradiente.**

**É onde o registry põe a cor.** Com uma cor só, os 5 stops caem em 0/25/50/75/100% e a cor está a 50% — fora do terço alcançável:

```
r_norm  0 ──── 0.25 ── 0.33 ──── 0.50 ──── 0.75 ──── 1.0
        └ transp ┴ subir ┤        └ COR CHEIA
                         └ o elemento centrado PARA AQUI

alpha máximo a meio do ciclo = (0.33−0.25)/(0.50−0.25) ≈ 0.33, e só nos cantos
```

Um terço de opacidade num traço de 1px. É literalmente o «quase não se vê».

Com três cores os stops passam a 7 e a cor ocupa 16,7%→83,3%, cheia de 33,3% a 66,7%. O canto do elemento passa a cair em 0,333 → alpha 1,0. **A paleta multicolor triplica o pico sem que essa fosse a intenção** — mas o meio de cada lado ainda cai em 0,236 → alpha 0,42.

Duas grandezas independentes, e as duas precisam de calibração:

| dial | onde | o que muda |
|---|---|---|
| `borderWidth` | prop | espessura do traço, puro geométrico |
| `backgroundSize` | fork do componente | que fracção do perímetro está acesa de cada vez |

`borderWidth` fica em **2px** — acima do vestígio, e ainda na ordem de grandeza do contorno de 1,5px que a capability fixa, portanto continua a ler como contorno do botão e não como moldura.

`backgroundSize` desce de 300% para **150%**:

```
300%  →  elemento vê r ∈ [0, 0.33] centrado   →  banda acesa (0.5) fica FORA
200%  →  elemento vê r ∈ [0, 0.50]            →  banda tangente
150%  →  elemento vê r ∈ [0, 0.67] centrado
         e r ∈ [0.33, 1.0] nos extremos       →  banda SEMPRE sobre o anel
```

O custo é estético e assumido: a 150% o ponto quente viaja menos, portanto o efeito lê mais como «borda luminosa a pulsar» e menos como «reflexo a passar». A troca é deliberada — um reflexo que não se vê não é um reflexo.

Isto obriga a **forkar** `shine-border.tsx`, porque `backgroundSize` é literal no componente e não prop. É prática estabelecida no repo: `parallax.tsx` e `scroll-based-velocity.tsx` carregam patches comentados sobre o que foi mudado e porquê.

### Engordar não se faz com borda

Registado porque foi tentado e não funciona. `className="border-2"` no call site parece a via curta e não é:

```
  ┌────────────────────────────┐ ← border 2px, cor #edeef0 herdada do
  │╭──────────────────────────╮│   `* { @apply border-border }` em @layer
  ││ ░░░ anel shine (1px) ░░░ ││   base — `primary` não declara cor de borda
  ││        {rótulo}          ││
  │╰──────────────────────────╯│ ← ESTÁTICO
  └────────────────────────────┘
```

`inset-0` resolve contra a **padding box**, logo o anel fica *por dentro* da borda em vez de coincidir com ela. E como o botão não tem largura declarada, os 2px somam 4px à altura e à largura — o submit passa a medir diferente de todos os outros botões, contra o requisito de geometria. O resultado é um aro estático a mais, não um anel mais grosso.

### O `components.json` é corrigido antes de correr o CLI

`tailwind.css` aponta para `src/app/globals.css`; o ficheiro real é `src/app/(app)/globals.css`. O `.tsx` aterra bem — o alias `@/components/ui` está correcto — mas o `--animate-shine` e o `@keyframes shine` vão para um ficheiro órfão. Resultado: `animate-shine` não resolve, `--duration` fica indefinida, e o anel instala-se **estático e invisível, sem erro nem aviso**.

Corrigir o `components.json` é a primeira tarefa, não a última. O caminho errado é anterior a esta change e afecta qualquer `shadcn add` futuro.

Os dois inserts vão para onde os do `marquee` e do `accordion` já estão: `--animate-shine` no bloco `@theme inline` junto de `--animate-marquee` ([`globals.css:222`](../../../src/app/(app)/globals.css#L222)) e o `@keyframes shine` no mesmo bloco, ao lado de `@keyframes marquee`. Se o CLI não os colocar exactamente aí, colocam-se à mão — o critério é a coerência com os que já lá estão, não a fidelidade ao output do CLI.

### `will-change` fica como vem

O registry declara `will-change: background-position`. É uma promessa ao browser que custa memória de camada permanente. Fica, porque a animação é de facto permanente — que é precisamente o caso em que `will-change` se justifica. Num gatilho reactivo teria de sair.

## Risks / Trade-offs

**`overflow-hidden` + `rounded-full` corta o anel nas curvas** → No caminho `swap` o botão é `overflow-hidden`, e um anel a `inset-0` tem o seu pixel exterior no limite exacto do clip. Nos topos curvos da pill o anel pode ler-se mais fino e serrado que nos lados rectos. Mitigação: é o primeiro item a olhar na fixture, na linha `shine + textSwap`. Se acontecer, as saídas por ordem de preferência são aumentar `borderWidth` para 1,5px (alinhando com a espessura de contorno que a capability já fixa) ou recuar a camada com um `inset` de subpixel. O caminho sem `swap` — que é o do submit em produção — não tem `overflow-hidden` e não corre este risco.

**`background-position` não é acelerado pelo compositor** → Só `transform`, `opacity` e `filter` o são. Cada frame é um repaint da área do anel, para sempre, numa página cujo `SmoothScroll`, marquee, vídeo e cursor foram todos ensinados a dormir. Mitigação: a área é um anel de 1px numa pill de ~300×44, o custo absoluto é pequeno, e o browser não pinta abas ocultas — o cenário «aba oculta não paga a excepção» é grátis. O que resta é um repaint pequeno enquanto `/get-quote` está aberta, e está declarado como tal.

**A invariante de contraste passa a ter uma camada a mais para esquecer** → `button-hover-inversion` existe porque uma camada esquecida acaba da cor do que está atrás dela e desaparece. O anel é a quinta camada, e a primeira tentativa cometeu exactamente esse erro — nas quatro variantes. Mitigação em duas voltas: a paleta é única e independente das superfícies, portanto não há uma escolha por variante para errar; e o ajuste de hover é um campo **obrigatório** no `SwapInvert`, pelo que uma variante nova que o esqueça falha a compilação em vez de ficar com o anel apagado no hover. É o mesmo mecanismo que a tabela já usava para `icon` e `rim`.

**O fork afasta-se do registry** → `backgroundSize` é literal no componente, logo a calibração de 300%→150% obriga a editar o ficheiro gerado. Um `shadcn add` futuro sobre o mesmo componente sobrescreve o patch em silêncio. Mitigação: o patch leva comentário a dizer o que foi mudado e porquê, no registo de `parallax.tsx` e `scroll-based-velocity.tsx`, que já vivem nesta condição.

**`disabled:opacity-50` aplica-se ao botão, não à camada** → A `cva` põe `disabled:opacity-50` no elemento; um filho `absolute` herda a opacidade do pai, pelo que o anel esmorece com ele. Isto é o comportamento pretendido e não um risco — mas é uma suposição sobre herança de opacidade que a fixture tem de confirmar, com um botão `shine` desactivado lá dentro.

**O CLI pode trazer uma versão diferente do componente** → O registry `@magicui` não é versionado no `components.json`; `shadcn add` traz o que estiver publicado. Uma versão mais antiga usava `motion/react` em vez de CSS, o que quebraria o requisito de não assinar o loop de animação. Mitigação: inspeccionar os imports do ficheiro gerado antes de o ligar ao call site — é o cenário «nenhuma dependência nova de runtime» de `cta-shine-border`, e é uma verificação de 10 segundos.

**Sem test runner** → A verificação é visual, nas fixtures, conforme a convenção do repo. Isso torna a linha nova em `fixtures/buttons` parte da entrega e não um extra: sem ela, a ordenação de camadas do caso `shine + textSwap` fica sem forma de ser vista, porque esse caso não existe em produção.

## Migration Plan

Não há migração de dados nem de conteúdo. A prop é opt-in e o caminho de render de todos os botões existentes fica byte-a-byte igual, pelo que o rollback é remover a prop do call site em `QuoteForm` — o resto pode ficar instalado sem efeito.

A ordem importa em dois pontos: o `components.json` corrige-se **antes** do `shadcn add`, e a linha da fixture existe **antes** de se ligar o `shine` em produção, para a ordenação de camadas ser vista onde é fácil de ver.

## Open Questions

**Fechadas pela primeira passagem de implementação:**

- ~~`borderWidth` 1px ou 1,5px?~~ → **2px**. Nem uma nem outra: 1,5px não resolvia o problema, porque a espessura era só metade da causa. Ver a decisão de legibilidade.
- ~~`duration` 14s ou mais curta?~~ → **fica 14s**, mas por razão nova: a 150% de `backgroundSize` o percurso é mais curto, portanto os 14s deixam de ser um crawl. Reavaliar só se, no ecrã, o pulso parecer parado.
- ~~O token entra por `shineColor` ou por variável CSS?~~ → **nenhum dos dois**: a cor deixou de vir de tokens. Entra por `shineColor` como paleta literal de três matizes.

**Abertas:**

- **O quanto escurecer sob painel claro?** Precisa de ser o suficiente para `#FFBE7B` passar 3:1 contra `#ffffff` — `brightness(0.7)` leva-o a ~3,2:1 — sem apagar `#A07CFE`, que já é o mais escuro dos três. Um `saturate` a acompanhar mantém as matizes distinguíveis entre si depois de escurecidas. Os números exactos afinam-se na fixture, com os dois fundos lado a lado.
- **`filter` sobre uma camada mascarada.** O anel tem `mask-composite: exclude` e `will-change: background-position`; acrescentar `filter` junta uma terceira razão de compositing no mesmo elemento. Não deve ter custo perceptível num anel de 2px, mas é a primeira coisa a olhar se o hover ficar a tremer.
- **A paleta contra o fundo claro da página.** Os números medidos são contra `#212528` e `#ffffff`. Na variante `outline`, atrás do anel está a página clara em repouso — que é branca, logo o caso já está coberto —, mas o anel fica então permanentemente na condição fraca. Nenhum call site de produção usa `outline` com `shine`; se algum passar a usar, o ajuste de repouso dessa variante precisa da mesma medição.
