## 1. Porta de entrada — desbloquear o `Button`

Nada de código antes deste grupo. `fix-button-hover-inversion` (0/27) é dona de `Button/index.tsx` e a sua spec descreve um `Button` sem caminho `href`.

- [x] 1.1 Acrescentar à spec `button-hover-inversion` um cenário para `href`: o painel de preenchimento, o deslize duplo de rótulo e o `<span>` do ícone SÃO inseridos quando o elemento é âncora — ao contrário do caminho `asChild`
- [x] 1.2 Confirmar que o cenário existente *"Botão com asChild não ganha camadas"* continua verdadeiro e não precisa de `MODIFIED` (o caminho `asChild` não muda)
- [x] 1.3 Registar na `tasks.md` daquela change que o caminho `href` chega por `add-calendly-popup-cta`, para quem a implementar não o descobrir por conflito

## 2. Conteúdo — corrigir os destinos authorados

> **Inventário medido, e contradiz o `design.md`.** Lido da API local (`/api/globals/*`, `/api/hero`) nos dois locales:
>
> | Grupo | `label` | `url` / `href` |
> |---|---|---|
> | `Hero.primaryCta` | Get Quote  - For Free | `/get-quote` |
> | `Hero.secondaryCta` | Schedule a Call | `https://calendly.com/geral-paradis/30min` |
> | `services.primaryCta` | Get Quote  - For Free | `#` |
> | `projects.primaryCta` | View All | `#` |
> | `Footer.cta.primaryButton` | Get Quote  - For Free | `#` |
> | `Footer.cta.outlineButton` | Schedule a Call | `https://calendly.com/geral-paradis/30min` |
> | `Menu.buttons[0]` | Get Quote | `/get-quote` |
>
> **`projects.primaryCta.url` não é `/projects`** — é `#`. O `defaultValue: "/projects"` do schema nunca chegou à base de dados, porque `defaultValue` no Payload só se aplica na criação do documento. A decisão 7 do `design.md` e o risco de 404 que ela descreve estão factualmente errados e foram corrigidos lá.
>
> O problema real é outro e mais simples: **três CTAs apontam para `#`**. Ligá-los como âncora produziria `<a href="/pt#">`, que salta para o topo da página — pior que inerte, porque parece funcionar.
>
> **Resolvido em código, não em conteúdo.** `#` passou a contar como ausência de destino (`lib/cta-href.ts`), porque é o `defaultValue` que `collections/Hero.ts` dá aos campos `url` — ou seja, a própria schema já o usa com o significado "não authorado". Os três CTAs continuam inertes como hoje, e passam a funcionar sozinhos quando alguém authorar um destino. Isto **desbloqueou o grupo 4**: o reauthoring passou de pré-requisito a melhoria.
>
> Efeito colateral bom: o botão primário do rodapé, que hoje em produção é `<a href="/pt#">`, passou a `<button>` inerte.
>
> Nenhum `url` está de facto localizado: os valores são idênticos em `en` e `pt` apesar de `label` ser `localized: true`. Fora do âmbito desta change, registado por ser o tipo de coisa que se descobre tarde.

- [x] 2.1 ~~Decidir para onde aponta `projects.primaryCta.url`~~ → substituída por 2.1a/2.1b: o valor real é `#`, não `/projects`, e o mesmo vale para dois outros CTAs
- [ ] 2.1a Decidir o destino de `services.primaryCta` (rótulo "Get Quote  - For Free", hoje `#`) e de `Footer.cta.primaryButton` (mesmo rótulo, hoje `#`) — o rótulo aponta para `/get-quote`, que é onde o `Hero.primaryCta` com o mesmo rótulo já vai
- [ ] 2.1b Decidir o destino de `projects.primaryCta` (rótulo "View All", hoje `#`) — não existe rota de listagem de projectos; se a decisão for criá-la, é outra change
- [ ] 2.2 Reauthorar os três `url` no admin, nos dois locales
- [x] 2.3 Confirmar que `Hero.secondaryCta.url` é `https://calendly.com/geral-paradis/30min` — confirmado na API, e o mesmo valor está em `Footer.cta.outlineButton`
- [x] 2.4 Inventariar os grupos de CTA e registar o `url` corrente de cada um, por locale — tabela acima
- [x] 2.5 Acrescentar `admin.description` aos campos `url` dos grupos de CTA a dizer que um destino `calendly.com` abre popup em vez de navegar (a detecção é implícita, e este texto é a única pista para quem edita)

## 3. `Button` ganha o caminho `href`

- [x] 3.1 Acrescentar `href` e `openInNewTab` a `ButtonProps` como união discriminada com `asChild`, para a combinação dos dois falhar em compilação
- [x] 3.2 Acrescentar `"a"` à decisão de `Comp` (linha 131), depois de `asChild` e antes de `magnetic`
- [x] 3.3 Fazer o ramo `href` renderizar o `content` COMPLETO — painel de preenchimento, `label` com deslize duplo, `<span>` do ícone — em vez de cair no ramo `asChild`
- [x] 3.4 Aplicar `target="_blank"` e `rel="noopener noreferrer"` quando `openInNewTab`
- [x] 3.5 Confirmar que `href` + `magnetic` reusa o `<motion.span>` das linhas 238-249 em vez de um segundo mecanismo
- [x] 3.6 Comentar no ficheiro por que existem dois caminhos de âncora (`asChild` e `href`) e o que cada um garante — sem isto, o próximo a ler apaga um deles
- [x] 3.7 Acrescentar à fixture `(pages)/fixtures/buttons/` uma coluna com `href`, ao lado das existentes, cobrindo `textSwap` e `circleIcon`
- [x] 3.8 Verificar na fixture que nenhuma variante SEM `href` mudou de aparência

## 4. Ligar os CTAs que só navegam

Entregam valor sozinhos e não dependem de nada do Calendly. Ficam antes do grupo 5 de propósito: se o Calendly for abandonado, este grupo continua a valer.

- [x] 4.1 Ligar o CTA de serviços em `(pages)/page.tsx` — passar `services.primaryCta.url` por `localizedHref`
- [x] 4.2 Ligar o CTA de projectos em `ProductsSection/index.tsx`, mantendo `trailingIcon` e `circleIcon`
- [x] 4.3 Ligar `Hero.primaryCta`, mantendo `magnetic` e `textSwap`
- [x] 4.4 Fazer os três degradarem para `<button>` sem `href` quando o `url` é vazio ou só espaços — nunca `href=""`, que recarregaria a página
- [x] 4.5 Verificar em `/en` e `/pt` que destinos internos ganham prefixo de locale e que absolutas e âncoras saem intactas

## 5. Detecção e carregamento do Calendly

- [x] 5.1 Escrever o predicado de detecção: `new URL(href, location.origin).hostname` igual a `calendly.com` ou terminado em `.calendly.com`
- [x] 5.2 Envolver em `try/catch` — os `href` vêm de campo de texto livre, e um valor mal formado devolve "não é Calendly" em vez de derrubar o render
- [x] 5.3 Verificar que `calendly.com.exemplo.net` NÃO é detectado (o caso que `includes()` deixaria passar)
- [x] 5.4 Escrever o carregador com promessa em módulo, partilhada entre instâncias: injecta `widget.css` no `<head>` e `widget.js` por `document.createElement`
- [x] 5.5 Dar-lhe timeout e um caminho de rejeição — é o que alimenta o fallback de 6.4
- [x] 5.6 Confirmar que o carregador NÃO usa `next/script` e documentar por quê (o projecto não o usa em lado nenhum, e a injecção aqui é condicional a um evento de utilizador)
- [x] 5.7 Verificar com o Network do browser que uma rota em repouso não faz nenhum pedido a `assets.calendly.com`
- [ ] 5.8 Verificar que `Hero` e `Footer` na mesma rota carregam o widget no máximo uma vez

## 6. `CalendlyTrigger`

- [x] 6.1 Criar o leaf de cliente que recebe `href` já prefixado e resolvido pelo servidor
- [x] 6.2 Confirmar que não importa nada de `@/i18n` nem lê locale — é a condição de não arrastar os 33,6 KB documentados em `Footer/index.tsx`
- [x] 6.3 Interceptar o clique só quando é "simples": `e.button === 0 && !metaKey && !ctrlKey && !shiftKey && !altKey`
- [x] 6.4 Fazer a rejeição do carregador navegar para o `href` em vez de deixar o CTA sem resposta
- [ ] 6.5 Verificar ctrl-click, cmd-click e clique do meio: abrem nova aba, sem popup
- [ ] 6.6 Verificar `Tab` + `Enter`: abre popup
- [ ] 6.7 Verificar com JavaScript desligado: o CTA é uma âncora funcional para o Calendly

## 7. Travagem de scroll

O modo de falha mais grave da change está aqui: scroll travado para sempre.

- [x] 7.1 Ligar `MutationObserver` no `body` a observar a inserção e a remoção de `.calendly-overlay`
- [x] 7.2 Aplicar a travagem SÓ depois de o observador ter confirmado o overlay no DOM — nunca especulativamente ao clique
- [x] 7.3 Ao abrir: `body.style.overflow = "hidden"` e `lenis.stop()`
- [x] 7.4 Ao fechar: restaurar `overflow`, zerar `lenis.time` e depois `lenis.start()` — pela razão que `LenisFrameDriver` já documenta (o Lenis não clampa `deltaTime`)
- [x] 7.5 Destravar incondicionalmente no `cleanup` do efeito, para uma navegação de rota com o popup aberto não deixar o `body` preso
- [ ] 7.6 Verificar que o fundo não rola com o popup aberto e que o conteúdo dentro do popup rola
- [ ] 7.7 Verificar que a posição de scroll é a mesma depois de fechar
- [ ] 7.8 Verificar que o primeiro gesto após fechar não produz salto por delta acumulado
- [ ] 7.9 Verificar que um carregamento falhado nunca trava o scroll
- [x] 7.10 Registar em comentário por que o `data-lenis-prevent` do menu mobile não serve aqui (o overlay é DOM de terceiros, não está no nosso JSX)

## 8. Ligar os CTAs do Calendly

- [x] 8.1 Ligar `Hero.secondaryCta` com o trigger, mantendo `magnetic` e `textSwap`
- [x] 8.2 Ligar os dois botões do bloco `cta` do `Footer` (linhas 343-368) com o trigger dentro do `asChild` que já existe
- [x] 8.3 Confirmar que `Footer/index.tsx` continua SEM `"use client"`
- [x] 8.4 Confirmar que o trigger não entrou na faixa de contacto nem nos `linkGroups` — `finish-footer-implementation` e `add-get-quote-footer-band` são donas daquelas zonas
- [x] 8.5 Verificar o CTA do `Footer` em `/get-quote`, onde o slot de rota paralela `@footer/get-quote` serve outra folha

## 9. Fixture

- [x] 9.1 Criar a rota em `(pages)/fixtures/`, com a guarda `NODE_ENV !== "development"` → `notFound()` como PRIMEIRA instrução do corpo
- [x] 9.2 Cobrir três CTAs lado a lado: destino Calendly, destino interno, e `url` vazio
- [x] 9.3 Cobrir as variantes `textSwap` e `circleIcon`, para o caminho `href` do grupo 3 ser verificável no mesmo sítio
- [x] 9.4 Cobrir o caminho de falha do carregador — uma forma de o forçar sem editar código (query param ou host inválido authorado na própria fixture)
- [x] 9.5 Comentar no topo o que procurar em cada bloco, no padrão da fixture de botões

## 10. Fecho

- [x] 10.1 `npm run lint` — **os ficheiros desta change estão limpos**, mas o comando como um todo NÃO está: 44 erros e 16 avisos pré-existentes, quase todos de formatação em ficheiros gerados pelo Payload sob `src/app/(payload)/`. É a mesma linha de base que `cut-sustained-runtime-cost` registou (42 → 52 erros) ao excluir `openspec` do Biome. Verificado com `biome check` restrito aos ficheiros tocados: 0 erros
- [x] 10.2 `npm run build` limpo — compila em 15,3 s, TypeScript em 16,7 s, 5 páginas estáticas, e as duas rotas de fixture aparecem na tabela de rotas
- [ ] 10.3 Correr o harness de `cut-sustained-runtime-cost` numa rota com CTA de Calendly, sem clicar, e confirmar que a CPU ociosa e o heap não se movem face ao baseline daquela change
- [x] 10.4 Verificar que a biblioteca do Calendly não entra no bundle — `grep initBadgeWidget .next/static` não devolve nada, ou seja o `widget.js` **não** está empacotado; `assets.calendly.com` aparece em 3 chunks, e são as duas constantes de URL em `lib/calendly.ts`. Total dos chunks de cliente: **3.903.001 bytes** em 74 ficheiros
- [ ] 10.4a Medir o first-load JS antes/depois com build limpo nas duas pontas. **Não foi feito.** O número acima é só o depois — a árvore de trabalho tem mudanças de cinco outras changes, portanto `git stash` não produz um "antes" atribuível a esta. O que está provado é o essencial (a biblioteca não está no bundle); o delta do código próprio acrescentado são quatro ficheiros pequenos
- [x] 10.5 Registar no `design.md` o que a implementação resolveu das Open Questions — feito: o timeout ficou em 6000 ms, escolhido e não medido, e continua registado como aberto; a indicação visual entre clique e popup não foi acrescentada
- [x] 10.6 Registar a dívida de consentimento de cookies — já está nos Risks do `design.md`, com o argumento de que carregar ao clique é melhor que carregar sempre mas não é consentimento

> **Fecho desta sessão.** Tudo o que é verificável sem browser está verificado por execução, não por leitura: o predicado de detecção em 15 casos (incluindo `calendly.com.exemplo.net`), a união de tipos a recusar `href` + `asChild` em compilação, o DOM entregue pelo servidor em `/en` e `/pt` para os sete CTAs, e a ausência da biblioteca no bundle.
>
> O que falta divide-se em três: **decisões de conteúdo** (2.1a, 2.1b, 2.2), **verificação com browser** do popup real (5.8, 6.5–6.7, 7.6–7.9) e **medição** com o harness da outra change (10.3, 10.4a). Nenhuma delas é código.
