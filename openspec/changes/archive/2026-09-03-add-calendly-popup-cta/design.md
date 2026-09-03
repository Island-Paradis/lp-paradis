## Context

O `Button` decide o seu elemento numa linha ([`Button/index.tsx:131`](../../../src/components/Button/index.tsx)):

```
asChild  → Slot.Root      (Footer: âncora, sem camadas de hover)
magnetic → motion.button  (Hero, Services, Projects: camadas, sem destino)
senão    → "button"
```

As duas colunas que interessam a esta change são mutuamente exclusivas hoje, e é por isso que os CTAs authorados ficaram inertes: quem quisesse destino perdia a animação. `const swap = textSwap && !asChild` mata o deslize de rótulo, e o painel de preenchimento, o `<span>` do ícone e o `trailingIcon` estão todos dentro do ramo `!asChild` do JSX.

Do lado do conteúdo, os seis grupos de CTA no Payload já têm `url`. Três superfícies lêem só o `label`. O `Footer` é a excepção que funciona — e funciona **porque** os seus botões não usam `textSwap` nem `trailingIcon`, não porque o caminho esteja resolvido.

Duas restrições do repositório enquadram tudo o que segue:

- **O `Footer` não pode virar client component.** O comentário longo em `Footer/index.tsx` mediu 33,6 KB de runtime do next-intl (34.259 → 67.909 bytes num chunk) e é a razão de `localizedHref` estar copiado à mão ali dentro. Um `onClick` no bloco `cta` obriga a fronteira de cliente; ela tem de ser um leaf, no padrão de `VideoAutoPause`.
- **O regime "página parada" está sob medição.** `cut-sustained-runtime-cost` (62/71) tem harness próprio e alvo de aceitação em CPU ociosa e heap ao longo de 10 minutos. Qualquer recurso do Calendly presente antes do primeiro clique entra nesse regime.

## Goals / Non-Goals

**Goals:**

- Um `url` authorado no Payload chega ao DOM como âncora, em todas as seis superfícies de CTA.
- O `Button` ganha um caminho `href` que **mantém** painel, deslize, ícone e `magnetic`.
- Um CTA que aponte para o Calendly abre popup, com o widget carregado ao primeiro clique.
- Todo caminho de falha do popup degrada para navegação até ao mesmo destino.
- O `Footer` continua a ser server component.

**Non-Goals:**

- Badge flutuante (`initBadgeWidget`). Recusado na proposal: custo permanente em todas as rotas.
- Repasse de locale para o Calendly (`?locale=pt`). Decidido não fazer.
- Campo `behavior` no Payload. A detecção é pelo hostname.
- Gestão de foco, `Escape` ou cursor dentro do overlay. É DOM de terceiros.
- Tocar em `CursorFollower`, `globals.css`, ou nos ficheiros de `optimize-landing-performance`.
- Consentimento de cookies. O Calendly põe cookies, e a questão é real para uma empresa PT/UE — mas é uma change própria, com âmbito de RGPD, não um apêndice desta.

## Decisions

### 1. `href` como prop do `Button`, e não `asChild` no call site

O `Button` acrescenta `"a"` às opções de `Comp` e renderiza o `content` completo dentro dela — mesmo JSX, mesmas camadas, só o elemento muda.

```
                      ┌── asChild ──▶ Slot.Root  ── só children (inalterado)
   Button decide ─────┤
                      ├── href ─────▶ "a"        ─┐
                      ├── magnetic ─▶ motion.button ├─ content COMPLETO:
                      └── senão ────▶ "button"   ─┘   fill + label duplo + ícone
```

**Alternativas consideradas.** (a) `asChild` passar a compor o `content` para o `Slot`: contraria o cenário já escrito em `fix-button-hover-inversion` e arrisca `<a>` aninhado com o wrapper `magnetic`. (b) `<button onClick>` sem âncora: dispensava mexer no `Button`, mas perdia ctrl-click e deixava o CTA morto se o script falhasse — e não resolvia os CTAs de serviços e projectos, que não são Calendly e precisam de navegar de verdade.

`href` + `asChild` no mesmo `Button` é conflito, e é impedido em tipos (união discriminada nas props) para não chegar a runtime.

### 2. O `magnetic` já tem wrapper próprio, e é isso que torna (1) barato

`magnetic` com `asChild` já funciona hoje, através do `<motion.span>` das linhas 238-249. O caminho `href` reusa esse wrapper: âncora dentro do span animado. Não há um segundo mecanismo de animação a construir.

### 3. Detecção por hostname, com comparação estruturada

```
  ✗ href.includes("calendly.com")
      → "https://calendly.com.exemplo.net/phish" passa

  ✅ const h = new URL(href, location.origin).hostname
     h === "calendly.com" || h.endsWith(".calendly.com")
```

O `try/catch` em volta do `new URL` não é defensivo por hábito: os `href` vêm de campo de texto livre no admin, e um valor mal formado tem de devolver "não é Calendly" em vez de derrubar o render.

O custo desta decisão é de autoria, não de código: quem edita no admin não vê porque é que aquele link se comporta diferente. Mitigação é o `admin.description` dos campos `url` dizê-lo — não é grande mitigação, e a alternativa (campo `behavior`) fica registada como reversível se incomodar.

### 4. Carregamento ao primeiro clique, com uma só promessa partilhada

```
  clique ──▶ já carregado? ──sim──▶ initPopupWidget()
                  │
                  não
                  ▼
            promessa em módulo (singleton)
                  │
        ┌─────────┴─────────┐
     resolve              rejeita / timeout
        │                     │
   initPopupWidget()    window.location = href   ← o fallback da spec
```

A promessa vive no módulo, não no componente: o CTA do `Hero` e o do `Footer` são instâncias diferentes e não podem pedir o script duas vezes. Injecta-se `widget.css` no `<head>` e `widget.js` com `document.createElement`, em vez de `next/script` — o projecto não usa `next/script` em lado nenhum, e aqui a injecção é condicional a um evento de utilizador, que é fora do que aquele componente modela bem.

O `window.onload` do snippet original é descartado: em App Router o componente monta depois da hidratação, e nessa altura o evento `load` já disparou — o handler nunca correria.

`e.preventDefault()` só acontece quando o clique é "simples": `e.button === 0 && !metaKey && !ctrlKey && !shiftKey && !altKey`. Sem essa guarda, ctrl-click deixava de abrir nova aba.

### 5. `CalendlyTrigger` é um leaf de cliente que envolve só o rótulo

```
  Footer (server, sem "use client")
   └── <Button asChild variant="outline-inverted">      ← continua asChild
        └── <CalendlyTrigger href={…}>  ("use client")  ← a fronteira
             └── {label}
```

No `Footer` mantém-se o `asChild` que já existe — aqueles botões não usam `textSwap` nem ícone, portanto o caminho novo não lhes traz nada. Já o `Hero`, `page.tsx` (serviços) e `ProductsSection` usam o caminho `href` da decisão (1), e o `Hero` é o único dos três que precisa do trigger, por ser o único a apontar para o Calendly.

O leaf recebe `href` já prefixado e resolvido pelo servidor. Não lê locale, não importa nada de `@/i18n`, e por isso não arrasta os 33,6 KB.

### 6. A travagem de scroll é aplicada ao documento, não ao overlay

O menu mobile escreve `data-lenis-prevent` no seu próprio JSX e acompanha com `body.style.overflow = "hidden"`. O overlay do Calendly é injectado no `body` por código de terceiros, portanto só a segunda metade desse padrão está disponível.

Ao abrir: `body.style.overflow = "hidden"` e `lenis.stop()`. Ao fechar: restaurar ambos, e zerar `lenis.time` antes de `lenis.start()` — pela mesma razão que `LenisFrameDriver` já documenta em `SmoothScroll/index.tsx`, porque o Lenis não clampa `deltaTime` e um `time` obsoleto produz um `advance()` com delta enorme no primeiro frame.

**Detectar o fecho é o ponto frágio.** O `initPopupWidget` não devolve handle nem aceita callback de fecho. As opções são: `MutationObserver` no `body` a observar a remoção de `.calendly-overlay`, ou o evento `message` que o Calendly emite (`event.data.event === "calendly.event_scheduled"` cobre o agendamento, não o fecho por `X`). O `MutationObserver` é o caminho, e é a razão de a spec ter um cenário para "popup fechado sem nunca ter aberto": se a travagem entra sem o observador ter chegado a ligar, o scroll fica travado para sempre — o pior modo de falha desta change.

### 7. Três CTAs apontam para `#`, e é isso que bloqueia a fiação

> **Corrigido durante a implementação.** Esta decisão dizia que `projects.primaryCta.url` era `/projects` e que ligá-lo exporia um 404, por leitura do `defaultValue: "/projects"` em `HomePage.ts`. **Estava errado.** O `defaultValue` do Payload só se aplica na criação do documento, e o valor em base de dados é `#`. Não há 404 nenhum a expor.

O inventário medido na API local (tabela em `tasks.md`, grupo 2) mostra o problema real: `services.primaryCta`, `projects.primaryCta` e `Footer.cta.primaryButton` têm todos `url`/`href` igual a `#`.

```
  hoje                    depois da fiação, sem reauthorar
  ─────────────────       ────────────────────────────────
  <button> inerte    ──▶  <a href="/pt#">
  não promete nada        promete, salta para o topo, e o
                          visitante conclui que está quebrado
```

Ligar um CTA cujo destino é `#` é uma regressão de percepção, não um progresso: um botão morto não promete nada, um link que salta para o topo promete e falha.

**A saída não é bloquear a fiação no reauthoring — é `#` contar como ausência de destino.** O próprio projecto já usa `#` com esse significado: `collections/Hero.ts` dá `defaultValue: "#"` aos campos `url`, ou seja "ainda não authorado". Tratá-lo como destino real seria ler literalmente um valor que a schema criou para significar "vazio".

```
  url authorado    elemento             porquê
  ─────────────    ──────────────────   ────────────────────────────
  ""  /  "   "     <button> inerte      Payload grava "" ao limpar
  "#"              <button> inerte      é o defaultValue de "vazio"
  "#faqs"          <a href="/pt#faqs">  fragmento com nome é destino
  "/get-quote"     <a href="/pt/…">     destino interno
  "https://…"      <a href="https://…"> destino externo
```

A distinção entre `#` e `#faqs` é o que mantém as âncoras do menu a funcionar. Não é a mesma coisa que "URL não resolve": `/projects` inexistente continua a produzir âncora, porque distinguir rota existente de inexistente em tempo de render exigiria duplicar a tabela de rotas — esse conserto é de conteúdo, e só desse.

Com isto o grupo 4 deixa de depender do reauthoring: a fiação entra, os três CTAs a `#` continuam inertes como estão hoje, e passam a funcionar sozinhos no momento em que alguém authorar um destino. O reauthoring continua a valer — dois dos três têm destino óbvio, porque o rótulo é "Get Quote  - For Free" e o `Hero.primaryCta` com o mesmo rótulo já aponta para `/get-quote` — mas passou de bloqueio a melhoria.

## Risks / Trade-offs

**[Scroll travado para sempre se o observador de fecho falhar]** → É o modo de falha mais grave. Mitigação em duas camadas: a travagem só é aplicada depois de o `MutationObserver` estar ligado e ter confirmado o overlay no DOM; e um destravamento incondicional no `cleanup` do efeito, para uma navegação de rota com o popup aberto não deixar o `body` preso. Verificável na fixture.

**[Contrato do `Button` cresce, e ele é o componente mais reusado do site]** → `href` é opcional e nenhum call site actual o passa, portanto o risco é de regressão visual nos que já existem, não de quebra. A fixture `(pages)/fixtures/buttons/` já cobre as variantes com `textSwap` e `circleIcon`; ganha uma coluna com `href` e a comparação é lado a lado.

**[`fix-button-hover-inversion` está 0/27 e é dona deste ficheiro]** → Bloqueio real, não risco. A spec daquela change tem *"Botão com asChild não ganha camadas"* e passa a estar incompleta: descreve um `Button` sem caminho `href`. O cenário novo tem de lá ser acrescentado **antes** de esta change entrar em código. Está 0/27, portanto é barato agora.

**[Três changes abertas tocam `Footer/index.tsx`]** → `finish-footer-implementation` (68/78) e `add-get-quote-footer-band` (63/79). Esta mexe só nas linhas 343-368 (bloco `cta`) e em nada da faixa de contacto ou dos `linkGroups`. A ordem de aterragem tem de ser combinada; o conflito de merge é previsível e pequeno.

**[Terceiro sem consentimento, numa empresa PT/UE]** → O Calendly põe cookies. Carregar ao clique é materialmente melhor que carregar em todas as páginas — há acção deliberada do visitante antes de qualquer pedido — mas não é consentimento. Fica registado como dívida, com âmbito próprio.

**[Acessibilidade do overlay não é nossa]** → Sem `focus trap`, sem devolução de foco garantida ao fechar. A spec registou-o em vez de o simular; um wrapper por cima do iframe daria falsa garantia e podia piorar o que o Calendly já faz.

**[Detecção implícita envelhece mal]** → Se um dia houver um segundo serviço de agendamento, ou um link do Calendly que deva navegar em vez de abrir popup, a regra por hostname não tem como o expressar. O campo `behavior` é a saída, e a migração é aditiva: campo novo com omissão que preserva o comportamento actual.

## Migration Plan

1. Acrescentar o cenário `href` à spec de `fix-button-hover-inversion` (`/opsx:update`). **Porta de entrada** — nada de código antes disto.
2. Reauthorar os três `url` que estão a `#` no admin: `services.primaryCta`, `projects.primaryCta` e `Footer.cta.primaryButton`.
3. `Button` ganha `href`. Verificar as variantes existentes na fixture de botões antes de ligar qualquer call site.
4. Ligar os CTAs que só navegam: serviços e projectos. Entregam valor sozinhos e não dependem de nada do Calendly.
5. `CalendlyTrigger` + carregamento ao clique + travagem de scroll, com a fixture nova.
6. Ligar o CTA do `Hero` e os dois do `Footer`.

Rollback: os passos 4 e 6 são independentes entre si e do 5. Reverter o 5 devolve CTAs que navegam para o Calendly em vez de abrir popup — degradação, não quebra, porque é exactamente o fallback que a spec exige.

## Open Questions

- **Timeout do carregamento antes de cair para navegação. AINDA ABERTA.** A implementação pôs **6000 ms** em `lib/calendly.ts`, e o número foi **escolhido, não medido** — está comentado como tal no ficheiro. O raciocínio que o escolheu: dos dois lados errados, "navegar cedo demais" é mais benigno que "botão aparentemente morto", porque o segundo faz o visitante desistir em vez de esperar; daí errar para o lado curto. Continua a precisar de medida em rede lenta real.
- **Indicação visual entre clique e popup. AINDA ABERTA, e não implementada.** Numa rede lenta há uma janela sem resposta visível. O `textSwap` já ocupa o rótulo com duas cópias a deslizar, portanto não há onde pôr um "a carregar…" sem redesenhar o botão. Fica como está: até 6 s de silêncio no pior caso.
- **A promessa falhada é descartada, e isso permite martelar o botão.** `loadCalendlyWidget` põe `widgetPromise = null` ao rejeitar, para um segundo clique poder tentar de novo em vez de a sessão ficar condenada ao fallback. O efeito colateral é que N cliques durante uma falha de rede produzem N tentativas de injecção de script. Não foi tratado — em falha de rede o primeiro clique já navegou para fora da página, portanto a janela para o segundo é estreita.
- **`projects.primaryCta` ("View All"): reauthorar para onde?** Não existe rota de listagem de projectos, e o rótulo pede uma. Decisão de conteúdo; se for criar a rota, é outra change.
- **Nenhum `url` está de facto localizado.** Os valores são idênticos em `en` e `pt` em todos os grupos, apesar de `label` ser `localized: true` — e os `url` nem sequer são `localized`. Não é problema desta change, mas é a razão pela qual "URL localizada por locale" não seria hoje uma opção real se a decisão sobre `?locale=` fosse revista.
