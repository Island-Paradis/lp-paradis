## Why

Há quatro botões de CTA no site cujo destino está **authorado no Payload e nunca chega ao DOM**. O `Hero` renderiza `args.primaryCta.label` e `args.secondaryCta.label` e descarta os `url` correspondentes; o mesmo em `page.tsx` para o CTA de serviços e em `ProductsSection` para o de projectos. O resultado é um `<button>` inerte: o rato mostra `cursor-pointer`, o hover anima, e clicar não faz nada. O campo `url` existe em `collections/Hero.ts` desde sempre, com `defaultValue: "#"`, e nunca foi lido por ninguém.

O gatilho imediato é o "Schedule a Call": o link do Calendly foi posto no CMS e não havia forma de o alcançar. Mas a decisão de produto não é navegar para o Calendly — é **abrir o calendário num popup por cima da página**, sem tirar o visitante da landing page. Isso transforma o que parecia um bug de fiação em duas capabilities distintas: uma que garante que um `url` authorado chega ao DOM como link real, e outra que decide o que acontece quando esse link aponta para o Calendly.

## What Changes

**O bloqueio a remover primeiro.** O `Button` desliga metade de si próprio quando recebe `asChild`: `const swap = textSwap && !asChild` mata a animação de troca de rótulo, e o painel de preenchimento, o `<span>` do ícone e o próprio `trailingIcon` vivem todos dentro do ramo `!asChild`. Hoje isso não incomoda porque o único call site com `asChild` é o `Footer`, cujos botões não usam nenhuma dessas props. O CTA do `Hero` usa `magnetic textSwap`, e o de projectos usa `trailingIcon` + `circleIcon` — ligá-los pelo caminho do `Footer` custaria exactamente aquilo que `fix-button-hover-inversion` está a construir.

- ① `Button` passa a aceitar `href` e a escolher o elemento ele mesmo — `"a"` ao lado do `Slot.Root` / `motion.button` / `"button"` que a linha 131 já decide — mantendo todas as camadas de hover intactas. `asChild` continua a existir e a comportar-se como hoje; nenhum call site actual muda de aparência.
- ② `CalendlyTrigger`, um leaf de cliente mínimo, intercepta o clique quando o `href` aponta para `calendly.com`, carrega `widget.js` + `widget.css` **no primeiro clique** e chama `Calendly.initPopupWidget`. Qualquer outro `href` passa intacto e navega normalmente.
- ③ Os quatro CTAs authorados passam a receber o seu `url`: `Hero` (primary + secondary), o de serviços em `(pages)/page.tsx`, e o de projectos em `ProductsSection`.
- ④ Os dois botões do `cta` do `Footer` ganham o mesmo gatilho **sem o `Footer` deixar de ser server component** — a razão está documentada no próprio ficheiro, onde o `localizedHref` copiado à mão existe para evitar os 33,6 KB do runtime de cliente do next-intl. O gatilho entra como leaf, no padrão que `VideoAutoPause` já estabeleceu.
- ⑤ O scroll do fundo trava enquanto o popup está aberto. O overlay do Calendly é DOM de terceiros injectado no `body`, portanto não lhe podemos pôr `data-lenis-prevent` declarativamente — hoje o único uso desse atributo é o menu mobile, que o escreve no seu próprio JSX e acompanha com `body.style.overflow = "hidden"`.
- ⑥ Rota de fixture para o estado aberto, no padrão das quatro que já existem em `(pages)/fixtures/`.

**Duas coisas que esta change deliberadamente NÃO faz.**

- **Sem badge flutuante.** O snippet `initBadgeWidget` que motivou a investigação carregaria `widget.js` em todas as rotas e manteria uma bolha permanente no DOM. Isso é a categoria de custo que `cut-sustained-runtime-cost` existe para atacar, e invalidaria os baselines de CPU ociosa que aquela change já mediu. O popup carrega ao clique: no regime "página parada", que é o que aquele instrumento observa, o custo é zero.
- **Sem `?locale=`.** Decidido não repassar o idioma do site para o Calendly. Um visitante em `/pt` pode ver o calendário em inglês, e isso é aceite — a alternativa exigia URLs localizadas no CMS ou construção de query string no cliente, e nenhuma das duas se paga por agora.

**Descoberta a registar: um dos CTAs a ligar aponta para uma rota que não existe.** `HomePage.ts` dá a `projects.primaryCta.url` o `defaultValue: "/projects"`, e não há rota `/projects` — as públicas são `/[locale]` e `/[locale]/get-quote`. Enquanto o botão era inerte, o 404 era invisível. Ligá-lo torna-o alcançável. O `url` tem de ser reauthorado antes de a fiação entrar, ou a change troca um botão morto por um link quebrado, que é pior: o primeiro não promete nada, o segundo promete e falha.

## Capabilities

### New Capabilities

- `cms-authored-cta-links`: o contrato de que um `url` authorado no Payload chega ao DOM como elemento navegável em **todas** as superfícies de CTA, e que a aparência do botão não depende de ele ser link ou não. Cobre ①, ③ e ④, e a degradação quando o campo está vazio.
- `calendly-popup-cta`: o que acontece quando um CTA authorado aponta para o Calendly — detecção pelo hostname, carregamento do widget ao primeiro clique, comportamento de fallback quando o script não carrega, travagem do scroll de fundo, e o que o popup não pode assumir sobre foco e teclado por ser DOM de terceiros. Cobre ②, ⑤ e ⑥.

A divisa entre as duas é deliberada: **`cms-authored-cta-links` é dona de "o destino existe e é alcançável"; `calendly-popup-cta` é dona de "o que acontece ao clicar num destino Calendly".** É o que permite ligar os CTAs de serviços e projectos — que não são Calendly — sem lhes atar comportamento de popup.

### Modified Capabilities

Nenhuma. `homepage-shape-interlock` é a única capability em `openspec/specs/` e esta change não a toca.

## Impact

**Código**

- `src/components/Button/index.tsx` — item ①. É o ficheiro mais sensível da change, e o único cujo contrato público muda.
- `src/components/Hero/index.tsx` — item ③, os dois CTAs. O componente já é `"use client"`.
- `src/app/(app)/[locale]/(pages)/page.tsx` — item ③, CTA de serviços.
- `src/components/ProductsSection/index.tsx` — item ③, CTA de projectos, condicional a reauthorar o `url`.
- `src/components/Footer/index.tsx` — item ④, só os dois botões do grupo `cta`. O ficheiro continua sem `"use client"`.
- Componente novo para o item ② (e o ⑤ com ele), leaf de cliente.
- `src/app/(app)/[locale]/(pages)/fixtures/` — item ⑥, rota nova.

**Conteúdo (Payload)**

Nenhuma mudança de schema. A detecção é pelo hostname do `href`, portanto não há campo `behavior` a acrescentar — o custo dessa escolha é que o comportamento de popup fica invisível para quem edita no admin, e é o `admin.description` dos campos `url` que tem de o dizer.

O `url` de `projects.primaryCta` precisa de ser reauthorado (ver acima). O `url` do "Schedule a Call" é `https://calendly.com/geral-paradis/30min` — o tipo de evento de 30 minutos, não a página de perfil, para o popup abrir direto no calendário sem passo de escolha.

**Fronteiras com trabalho em andamento**

- `fix-button-hover-inversion` (0/27) é dona do `Button` e a sua spec tem um cenário explícito — *"Botão com asChild não ganha camadas"* — que descreve a limitação do `asChild` como intenção. O item ① **não a contradiz**: `asChild` continua a não ganhar camadas, e é um caminho novo (`href`) que as mantém. Ainda assim aquela spec precisa de um cenário a mais, para `href`, senão fica a descrever um `Button` que já não é o que existe. Está 0/27, portanto o ajuste é barato agora e caro depois de implementada. **Esta change não deve entrar em código antes de esse cenário ser acrescentado.**
- `cut-sustained-runtime-cost` (62/71) é dona do orçamento de CPU ociosa e do harness que o mede. O carregamento ao clique foi escolhido para não entrar nesse regime; se o item ② vier a carregar o widget mais cedo — em hover, em `requestIdleCallback` — a decisão volta a ser daquela change e exige medida no instrumento dela.
- `optimize-landing-performance` (31/51) é dona do first-load JS. `widget.js` e `widget.css` não entram no bundle nem no first load, por serem `<script>`/`<link>` injectados no primeiro clique.
- `finish-footer-implementation` (68/78) e `add-get-quote-footer-band` (63/79) tocam `Footer/index.tsx`. O item ④ mexe só no bloco `cta` (linhas 343-368) e não toca na faixa de contacto nem nos `linkGroups`, mas a sobreposição de ficheiro é real e a ordem de aterragem tem de ser combinada.
- `CursorFollower` congela sobre o iframe do popup, porque os eventos de rato não atravessam para o documento pai. Aceite, não tratado aqui — `optimize-landing-performance` é dona daquele componente.
