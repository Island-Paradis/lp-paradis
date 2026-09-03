## Context

A home é composta quase inteiramente por blocos que entram animados. Três mecanismos produzem essa entrada, e os três compartilham a mesma propriedade indesejada: o estado de repouso é invisível e a visibilidade depende de algo acontecer.

```
                      ESTADO DE REPOUSO          O QUE PRECISA ACONTECER
                      (o que o servidor emite)   (para o texto aparecer)
  ┌────────────────┬──────────────────────────┬──────────────────────────────┐
  │ Reveal         │ opacity:0; translateY16  │ hidratar + IO relatar entrada│
  │ (10 usos)      │                          │                              │
  ├────────────────┼──────────────────────────┼──────────────────────────────┤
  │ TextReveal     │ translateY(110%) por     │ hidratar + IO relatar entrada│
  │ (3 usos)       │ palavra, dentro de       │                              │
  │                │ overflow-hidden          │                              │
  ├────────────────┼──────────────────────────┼──────────────────────────────┤
  │ Hero variants  │ opacity:0; translateY16  │ hidratar (sem IO — anima     │
  │ (h1, p, CTAs)  │                          │ no mount)                    │
  └────────────────┴──────────────────────────┴──────────────────────────────┘
```

Que o estado de repouso chega ao HTML do servidor não é inferência. Em `framer-motion@12.38.0`, `makeLatestValues` resolve `initial` — inclusive quando é um rótulo de variante, via `resolveVariantFromProps` — e `useInitialMotionValues` passa o resultado por `buildHTMLStyles` até o `style` do elemento criado. No servidor isso vira atributo inline no HTML entregue.

A esse conjunto somam-se dois mecanismos que não envolvem animação mas produzem o mesmo sintoma: o `<h1>` do Hero, cujo texto é `text-transparent` e só existe pelo gradiente recortado nas letras; e as células de serviço, onde um irmão flex com `h-full` disputa a altura de um container `overflow-hidden` de altura fixa.

**Restrições que moldam a solução:**

- Não há runner de testes no projeto. A verificação é manual e precisa ser um procedimento curto o bastante para ser efetivamente executado.
- O React Compiler está ligado (`next.config.ts`). Estado e efeitos novos nas primitivas precisam ser convencionais.
- A change `fix-responsive-content-clipping` está aberta e toca os mesmos arquivos. As duas precisam não se sobrepor.
- O `initial` no SSR existe por um bom motivo: evitar que o conteúdo pisque visível antes de a animação começar. Qualquer solução que simplesmente o remova troca um defeito por outro.

## Goals / Non-Goals

**Goals:**

- Que o texto da home seja legível quando o JavaScript não roda, não carrega, ou falha ao hidratar.
- Que nenhuma revelação por scroll possa ficar permanentemente presa no estado oculto.
- Que a visibilidade do texto nunca dependa exclusivamente de uma cor ou de um recorte.
- Que a animação no caminho feliz permaneça **visualmente idêntica** à de hoje, exceto onde a mudança de comportamento for uma decisão explícita e registrada.
- Que exista um teste único que capture a classe inteira de falhas.

**Non-Goals:**

- Redesenhar as animações — durações, easing, stagger, direção e distância permanecem como estão.
- Mexer na geometria do encaixe `clip-path` entre `.video_shape` e `.services_shape`.
- Introduzir runner de testes, snapshot visual ou CI.
- Medir e ajustar breakpoints das células de serviço — isso pertence a `fix-responsive-content-clipping`.
- Substituir `motion` ou reimplementar a camada de animação.

## Decisions

### D1. Escape hatch em CSS por cima do `motion`, em vez de mudar o que o `motion` emite

A tentação óbvia é fazer as primitivas renderizarem o estado visível no servidor e aplicarem o estado oculto no cliente. Isso resolve o no-JS e reintroduz o flash de conteúdo — o defeito que o `initial` no SSR previne.

Decisão: **deixar o `motion` exatamente como está** e adicionar por cima uma regra de CSS que force a visibilidade quando — e apenas quando — for constatado que o React não está vivo.

```css
html:not(.js) [data-reveal],
html.reveal-failsafe [data-reveal] {
  opacity: 1 !important;
  transform: none !important;
}
```

Uma declaração `!important` em folha de estilo vence um `style` inline sem `!important`, que é precisamente o que o `motion` produz. No caminho feliz a regra nunca casa e a animação roda byte a byte como hoje.

As primitivas passam a marcar seus elementos animados com `data-reveal` — incluindo os spans por palavra do `TextReveal` e os `motion.div` próprios do Hero, que não usam as primitivas mas têm o mesmo padrão de falha.

*Alternativas consideradas:* inverter o `initial` para o estado visível (rejeitada — reintroduz o flash); renderizar as primitivas sem animação no servidor e trocar por versão animada no cliente (rejeitada — mismatch de hidratação garantido em toda a home); usar `<noscript>` com CSS (rejeitada — cobre só a ausência de JS, não a falha de hidratação, que é o caso mais provável em produção).

### D2b. O sinal de vivacidade é reafirmado depois da hidratação

Descoberto durante a implementação, medido em build de produção.

Sob `prefers-reduced-motion`, a hidratação da aplicação inteira falha com React #418 no elemento `HTML`. A causa é anterior a esta change: `useReducedMotion()` devolve `false` no servidor e `true` no cliente, e `SmoothScroll`, `Template`, `Reveal`, `TextReveal` e `Hero` ramificam nesse valor, produzindo árvores diferentes dos dois lados. O React se recupera re-renderizando a partir da raiz, e nisso zera os atributos de `<html>` — levando junto a classe `.js` que o script inline tinha aplicado.

```
  sem a reafirmação, com prefers-reduced-motion:

    script inline  →  class="js"            (antes da primeira pintura)
    hidratação     →  React #418, re-render →  class=""
    resultado      →  html:not(.js) casa com o React VIVO
                      → animações desligadas em definitivo
```

O conteúdo continuava visível — a rede de segurança fez o que devia — mas por acidente, não por projeto, e ao custo de todas as animações.

Decisão: o componente que emite o sinal também **reafirma `.js`** no mesmo efeito. Ele roda depois da recuperação do React, então a classe volta e permanece. Medido: sob `reduce`, `class=""` passa a `class="js"` com `ready=true`.

*A falha de hidratação em si permanece.* Ela é anterior a esta change, afeta a aplicação inteira, e consertá-la exige tornar todos os ramos de `useReducedMotion()` seguros para SSR — escopo próprio, com risco próprio. Ver Open Questions.

### D2. Duas classes, escritas por script inline, para distinguir três estados

O escape hatch de D1 depende de saber em qual dos três mundos a página está. Um único sinal não distingue "JS ausente" de "JS presente mas React morto" — e essa distinção é o que separa a solução do flash.

```
  script inline, bloqueante, no topo do <body>:

     documentElement.classList.add('js')          ← roda antes da primeira pintura
     setTimeout(→ add('reveal-failsafe'), N)      ← só age se o React não sinalizar

  componente raiz do cliente, no useEffect:

     window.__revealReady = true                  ← prova de que o React hidratou
```

| Cenário | `.js` | React sinaliza | Timer age | Resultado |
|---|---|---|---|---|
| Sem JS / bundle falha / crawler | não | não | não roda | texto visível, sem animação |
| React hidrata normalmente | sim | sim | no-op | animação normal, sem flash |
| Bundle carrega, hidratação falha | sim | não | força visível | texto visível após N |

O ponto que faz isso funcionar: o timer testa a **vivacidade do React**, não o estado de revelação de cada elemento. Um timer que forçasse visibilidade por elemento revelaria conteúdo abaixo da dobra antes da hora; um que testa se o React respondeu é no-op sempre que o React respondeu, independentemente de quantos elementos já foram revelados.

O script é bloqueante e vem antes de qualquer conteúdo, então `.js` está aplicada na primeira pintura e o estado oculto vale desde o primeiro frame — sem flash.

*Resolvido na implementação, e revisado depois de medir.* N = 10000ms, e a degradação é **reversível**: se o React hidratar depois do prazo, `HydrationSignal` remove `.reveal-failsafe` e as animações voltam.

As duas escolhas mudaram juntas. A primeira versão usava N = 4000ms e degradação de mão única, para evitar o flash de re-ocultar. As medições derrubaram as duas:

```
  dev server deste projeto        load 6822ms   ·   hidratação ~5919ms
  prazo original                  4000ms        ← antes das duas
```

Ali o timer só não disparou porque a thread principal bloqueia por vários segundos em dev e atrasou o próprio timer para além da hidratação — sorte, não projeto. Com a degradação de mão única, tê-lo disparado deixaria **todas as animações mortas até o próximo reload**, que é outro caminho para o mesmo sintoma que esta change existe para eliminar.

Daí as duas correções: prazo folgado o bastante para cobrir dev e aparelho lento, e reversível para que um disparo indevido custe um flash em vez de custar a animação inteira. Um flash é pior de olhar e melhor de viver.

*Nota de infraestrutura:* se vier a existir CSP com `script-src` restritivo, esse script precisará de `nonce`. Hoje não há CSP configurada no projeto.

### D3. O `TextReveal` observa a máscara, não a palavra

D1 e D2 cobrem "o React não está vivo". Falta o caso em que ele está vivo e mesmo assim o elemento nunca é revelado.

**Correção sobre a primeira versão deste documento.** A hipótese original era que o culpado fosse `viewport={{ margin: "-80px" }}`, que encolhe a raiz do observer e criaria faixas mortas nas bordas. Isso é verdade, mas é secundário. A medição em produção mostrou uma causa mais grave e independente de margem.

O `IntersectionObserver` recorta a interseção pelo `overflow` dos ancestrais. O `TextReveal` põe cada palavra a `translateY(110%)` dentro de uma máscara `overflow-hidden` — e então observa **a própria palavra**, que a máscara esconde por completo. Medido no elemento real, parado no meio da viewport:

```
  mesma palavra, mesma posição, viewport de 900px, rect top=410 h=40

    máscara overflow: hidden   →  isIntersecting: false   intersectionRect 0×0
    máscara overflow: visible  →  isIntersecting: true    ratio 1
```

É um deadlock por construção: a palavra só seria revelada se já estivesse visível. Com `once: true`, é definitivo. Essa é a causa raiz do sintoma que originou esta change, e explica por que ele não dependia de viewport.

Decisão: **o elemento observado passa a ser a máscara**, que não recorta a si mesma. O estado viaja da máscara para a palavra por propagação de variants do `motion`. A palavra continua com o mesmo deslocamento, a mesma duração, o mesmo easing e o mesmo stagger.

Junto disso, e agora como decisão de segunda ordem, o gatilho do `TextReveal` passa a ser sem margem e com limiar zero, eliminando também as faixas mortas da hipótese original.

**A margem e o `once` são acoplados, e por isso as duas primitivas escolhem diferente.** A zona morta que uma margem negativa cria nas bordas da tela só é perigosa em conjunto com `once: true`, porque só aí ela vira permanente; sem `once`, o observer reavalia a cada scroll e a zona morta se desfaz sozinha.

```
                    once: false                once: true
              ┌────────────────────────┬────────────────────────┐
  margem      │ replay, zona morta é   │ zona morta vira        │
  -80px       │ TEMPORÁRIA — reavalia  │ PERMANENTE        ✗    │
              ├────────────────────────┼────────────────────────┤
  sem margem  │ replay, sem zona morta │ seguro, mas anima      │
              │                        │ uma vez só             │
              └────────────────────────┴────────────────────────┘
                   ↑ Reveal (D4)            ↑ TextReveal
```

`TextReveal` fica no canto superior direito e por isso abre mão da margem. `Reveal` fica no inferior esquerdo e por isso pode mantê-la — ver D4.

*Alternativas consideradas:* reduzir o deslocamento de 110% para menos de 100%, deixando uma fatia da palavra sempre dentro da máscara para o observer enxergar (rejeitada — troca um deadlock por uma sliver de texto visível no repouso, e o limiar viraria dependente da altura da linha); manter a margem e acrescentar um segundo observer sem margem como rede de segurança (rejeitada — não resolve o recorte, que é o problema real).

*Nota:* `Reveal` não tem esse deadlock — anima opacidade e 16px de deslocamento sem máscara que o recorte. Só o `TextReveal` era afetado.

### D4. `Reveal` mantém o replay — decisão revertida

**Esta decisão foi tomada, implementada, e revertida depois de ser testada no navegador. O registro dos dois lados fica aqui de propósito.**

A decisão original era adicionar `once: true` ao `Reveal`, alinhando-o ao `TextReveal`. O argumento: `Reveal` não passa `once` e seu variant `hidden` é `opacity: 0`, então todo bloco da home volta a ser invisível toda vez que sai do campo de visão — conteúdo permanentemente a um hiccup de observer de distância de sumir.

O que a implementação mostrou: com `once: true`, a animação roda **uma vez por carregamento de página**, e em toda passagem seguinte nada se move. Medido:

```
  ocultos no carregamento          25
  após descer (1ª passagem)         5     ← 20 revelaram
  após voltar ao topo               5     ← nada re-ocultou
  após descer de novo (2ª)          5     ← nada reanimou
```

Para quem usa a página, isso não se lê como "conteúdo mais estável". Lê-se como o scroll-reveal ter parado de funcionar.

E o argumento que sustentava a decisão não sobrevive ao resto desta change. Quando D4 foi decidida, o risco que `once: true` cobria era largo. Depois de D1 e D2, a rede de segurança já cobre o caso grave:

```
   risco coberto por once:true, ANTES da rede de segurança
   ┌────────────────────────────────────────────────────┐
   │  React morto · hidratação falha · bundle não carrega│
   │  observer se comporta mal com o React vivo          │
   └────────────────────────────────────────────────────┘

   DEPOIS
   ┌────────────────────────────────────────────────────┐
   │  ░░░░░░ coberto por html:not(.js) / reveal-failsafe │
   │  observer se comporta mal com o React vivo          │  ← só isso
   └────────────────────────────────────────────────────┘
```

Sobrou uma faixa estreita, paga com a identidade de scroll do site inteiro.

Decisão final: **`Reveal` fica sem `once` e com a margem `-80px`** — exatamente como antes desta change. A margem volta junto porque as duas são acopladas: sem `once`, a zona morta que ela cria se reavalia a cada scroll em vez de ser permanente (ver o quadro em D3).

Verificado depois da reversão — sequência de opacidade de um cartão descendo, subindo e descendo de novo: `0 → 1 → 0 → 1 → 0 → 1 → 0`, 35 transições.

### D5. Gradiente em texto vira uma utilidade com cor sólida de base

O `<h1>` do Hero declara `text-transparent` incondicionalmente. A visibilidade depende inteiramente de o `background-clip: text` pintar.

Decisão: extrair para uma utilidade em `globals.css` cuja cor sólida é a declaração base, e onde o gradiente só assume dentro de um `@supports` que confirme o suporte a `background-clip: text`. A ordem importa — a cor sólida primeiro, o gradiente depois — para que qualquer falha de suporte ou de pintura pare na cor sólida.

Isso não cabe em classes utilitárias inline do Tailwind, porque `@supports` não é expressável ali; por isso vira uma classe nomeada em `globals.css`, junto das outras regras específicas do projeto.

Detalhe relacionado: `text-transparent` é herdado, e o `<CursorGlow>` é filho desse mesmo `<h1>`. A utilidade precisa não vazar transparência para os filhos.

### D6. Um container que recorta não pode ter irmão flex reivindicando a altura toda

Nas células de serviço, o header (`ícone + <h3>`) carrega `h-full` dentro de um flex column de altura fixa (`md:row-span-2` sobre `md:auto-rows-[60px]`) com `overflow-hidden`. O header reivindica 100% da altura; os dois irmãos encolhem proporcionalmente; a descrição é espremida contra o recorte.

Decisão: remover o `h-full`. O header deve ocupar a altura do seu conteúdo, e a descrição fica com o resto.

A regra generalizada, que vai para a spec: em um container que recorta o transbordo, nenhum filho pode declarar altura que consuma o espaço destinado a irmãos que contêm texto.

Escopo deliberadamente limitado: a pergunta "a célula tem altura suficiente em 768px?" é medição por breakpoint e pertence a `fix-responsive-content-clipping`, tarefa 5.4. Aqui trata-se só da regra estrutural.

*Achado adjacente:* `md:grid-rows-[repeat(20px)]` em `ServicesSection` não é CSS válido — `repeat()` exige contagem e trilha. É um no-op com aparência de intenção. Removê-lo ou corrigi-lo é limpeza, não correção de bug.

### D7. O teste é desligar o JavaScript

A classe inteira de falhas tem um único teste que a captura: carregar a home com JS desligado e conferir que todo o texto está legível. É curto, não exige ferramenta, não exige breakpoint, e falha hoje de forma espetacular.

Ele entra como requisito verificável na spec e como passo no `tasks.md`, e cobre D1, D2 e D5 de uma vez. D3, D4 e D6 precisam de verificação própria, com JS ligado.

## Risks / Trade-offs

**`!important` como mecanismo de segurança pode mascarar outros problemas** → O seletor é estreito por construção: só casa com `[data-reveal]`, e só sob duas classes de raiz que, no caminho feliz, nunca estão presentes juntas com conteúdo oculto. Ainda assim, é uma regra que vence tudo; o comentário no CSS precisa explicar por que ela existe e sob quais condições casa, no mesmo padrão dos comentários já presentes em `globals.css`.

**Script inline bloqueante adiciona latência antes da primeira pintura** → São duas linhas sem I/O. O custo é da ordem de microssegundos e é o preço de não ter flash. A alternativa sem script é o `<noscript>`, que não cobre falha de hidratação.

**O timer de D2 pode disparar em hidratação legitimamente lenta** → Se disparar, o resultado é conteúdo visível sem animação — degradação benigna, exatamente o comportamento desejado. O risco é estético, não funcional. O valor de N deve errar para o lado folgado.

**D3 e D4 mudam a sensação das animações** → São mudanças de comportamento assumidas, não regressões. D4 em particular remove um comportamento que o código documenta como intencional. Ambas devem ser revistas com quem responde pelo design antes de fechar a change — mesmo tratamento que `fix-responsive-content-clipping` deu às suas questões de design na tarefa 8.7.

**Sobreposição de arquivos com a change em aberto** → `ServicesSection/index.tsx` e `page.tsx` são tocados pelas duas. A separação é por natureza da mudança: aqui, regra estrutural e primitivas; lá, medidas por breakpoint e geometria de recorte. Se as duas forem implementadas em paralelo, `ServicesSection/index.tsx` é o ponto de conflito a vigiar.

**`data-reveal` em cada palavra do `TextReveal`** → Aumenta a contagem de atributos no DOM proporcionalmente ao número de palavras dos títulos. São três títulos curtos; o impacto é irrelevante, mas a alternativa — marcar só o wrapper e alcançar as palavras por seletor descendente — deixaria o seletor menos explícito. A marcação direta foi preferida por legibilidade.

## Migration Plan

Não há migração de dados nem mudança de contrato. A mudança é de camada de apresentação e reversível por `git revert`.

Ordem sugerida, do que dá mais garantia por menos risco para o que exige revisão de design:

1. **Escape hatch (D1 + D2)** — CSS, script inline e marcação `data-reveal`. Aditivo: não altera nenhum comportamento existente. Ao fim deste passo, o teste de JS desligado (D7) já passa para tudo que é `motion`.
2. **Gradiente do Hero (D5)** e **`h-full` das células (D6)** — independentes entre si e do passo 1, e sem impacto em animação.
3. **Gatilho e replay (D3 + D4)** — as duas mudanças que alteram sensação. Deixadas por último para poderem ser revertidas isoladamente se a revisão de design pedir.
4. **Limpezas** — `console.log` em `page.tsx:29`, aninhamento `<p>` em `<span>` restante, `grid-rows-[repeat(20px)]`.

Rollback: cada passo é independente e revertível sozinho. O passo 1 é o único que, se revertido, reabre a falha original.

## Open Questions

1. **Valor de N no timer de D2.** Precisa de um número. A escolha é entre disparar cedo demais em rede ruim e deixar a página inutilizável por tempo demais quando a hidratação de fato falha.
2. **A sensação da entrada sem os `-80px` (D3).** Compensar com `delay` reproduz o atraso mas não a relação com a posição do elemento na tela. Precisa do olho de quem responde pelo design.
3. **`Reveal` deixar de replicar (D4).** O comportamento atual está documentado como intencional no próprio arquivo. Confirmar que a troca por robustez é aceita.
4. ~~**Onde ancorar o sinal de vivacidade do React.**~~ Resolvido na implementação: componente próprio (`HydrationSignal`), mínimo, no layout. `SmoothScroll` foi descartado porque retorna `children` cru sob `prefers-reduced-motion` e não oferece efeito nesse caminho.

5. **A falha de hidratação sob `prefers-reduced-motion` (D2b).** React #418 em `HTML`, na aplicação inteira, anterior a esta change. Está contornada, não corrigida. Corrigi-la exige tornar seguros para SSR todos os ramos de `useReducedMotion()` — em `SmoothScroll`, `Template`, `Reveal`, `TextReveal` e `Hero` — normalmente adiando a decisão para depois do mount. É trabalho com risco próprio e merece change própria. Decidir se entra aqui ou vira proposta separada.
