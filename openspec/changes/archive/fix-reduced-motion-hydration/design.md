## Context

O `proposal.md` estabelece a causa: `useReducedMotion()` do `motion` lê `prefers-reduced-motion` dentro de um inicializador de `useState`, e o valor difere entre servidor (`null`) e cliente sob reduce (`true`). Nove arquivos ramificam nesse valor durante a renderização.

Três fatos do repositório restringem as soluções, e vale enunciá-los antes de decidir:

1. **Não existe runner de testes** (`CLAUDE.md`). Toda verificação é manual, ou é uma regra de lint. Isso muda o cálculo: uma invariante que só existe na cabeça de quem escreveu não sobrevive à próxima primitiva de animação.
2. **Vencer `style` inline do `motion` com `!important` em folha de estilo já é mecanismo estabelecido**, documentado no fim de `globals.css` para a rede de segurança de visibilidade. Não é técnica nova a introduzir; é técnica existente a reusar.
3. **O projeto tem orçamentos de runtime com spec própria** — `scroll-frame-budget` e `idle-runtime-budget`. Qualquer solução que mantenha subscrições de scroll rodando para produzir efeito visual descartado colide com eles.

O inventário dos nove consumidores, classificado pelo que a preferência decide:

```
                                     decide markup?   decide comportamento?
  ui/reveal.tsx           initial y        SIM                não
  ui/text-reveal.tsx      subtree          SIM (forma)        não
  ui/parallax.tsx         subtree          SIM (forma)        SIM (scroll sub)
  Hero/index.tsx          variant + stagger SIM / não         não
  (pages)/template.tsx    initial y        SIM                não
  ─────────────────────────────────────────────────────────────────────────
  SmoothScroll            monta Lenis      não (sem wrapper)  SIM
  ui/cursor-glow.tsx      spring vs raw    não                SIM
  CursorFollower          portão `active`  não                SIM
  lib/use-magnetic.ts     portão `active`  não                SIM
```

`Parallax` aparece nas duas colunas. É o único, e é onde está a dificuldade real do design.

## Goals / Non-Goals

**Goals:**

- Servidor e primeira renderização do cliente idênticos para qualquer estado de `prefers-reduced-motion`.
- A preferência continua atendida, com resultado visual igual ou melhor que o de hoje.
- A invariante fica mecanicamente aplicada, não confiada à memória.
- Nenhuma regressão nos orçamentos de scroll e de idle.
- O caminho de movimento completo — o que 99% dos visitantes veem — não muda em nada.

**Non-Goals:**

- Trocar o veículo do `<script>` inline do failsafe, adotar `@media (scripting: none)`, ou relaxar a exigência de execução pré-pintura. O aviso do `<script>` é sintoma; ele desaparece quando a hidratação passa a funcionar, e essa é a verificação.
- Remover as linhas defensivas de `HydrationSignal`.
- Alterar duração, easing ou distância de qualquer animação no caminho de movimento completo.
- Fazer `Reveal` ou `TextReveal` reagir a mudanças de preferência em tempo de execução com re-animação. A regra de CSS já reage; re-disparar a animação não é requisito.

## Decisions

### 1. Um hook do projeto substitui `useReducedMotion` do `motion`, com `useState` + `useEffect`

`src/lib/use-reduced-motion.ts` devolve `false` no servidor e na primeira renderização do cliente, lê `matchMedia("(prefers-reduced-motion: reduce)")` num efeito, e assina `change`.

`false` como valor inicial não é escolha de conveniência: é o valor que o servidor assume. A primeira renderização do cliente reproduz o servidor **por construção**, não por o desenvolvedor ter conferido que os dois coincidem.

A string da media query segue `scroll-based-velocity.tsx:246`, que já usa `"(prefers-reduced-motion: reduce)"`. O `motion` usa `"(prefers-reduced-motion)"` — equivalente em resultado, divergente em estilo; consistência interna ganha.

**Alternativa rejeitada: `useSyncExternalStore`.** É a API desenhada para exatamente esta forma de problema, e é a escolha errada aqui *porque funciona*. Durante a hidratação o React usa o snapshot do **cliente**, não `getServerSnapshot`, para o subtree hidratado — então ele devolveria `true` na primeira renderização sob reduce e reproduziria a divergência que a change existe para eliminar. Um `getServerSnapshot` que devolvesse `false` só faria a divergência ficar mais difícil de encontrar. A ferramenta certa é a que atrasa a verdade de propósito.

**Alternativa rejeitada: um provider de contexto com a preferência resolvida no topo.** Não resolve nada — o provider ainda precisaria ler o ambiente em algum lugar, e ler no topo faz a divergência ficar na raiz, que é o pior lugar possível.

**Alternativa rejeitada: cookie com a preferência, lido no servidor.** Tornaria o SSR correto para visitantes recorrentes, ao custo de variar o HTML por cookie — o que implica `Cache-Control: private` ou `Vary`, e o projeto tem uma change arquivada (`cut-sustained-runtime-cost`) cujo sentido é o oposto. Desproporcional.

### 2. Movimento reduzido que altera markup vira CSS, com escopo em `[data-reveal]`

Regra nova em `globals.css`, vizinha da rede de segurança:

```
@media (prefers-reduced-motion: reduce) {
  [data-reveal] { transform: none !important; }
}
```

Isso cobre `Reveal`, `TextReveal`, `Hero` e `template.tsx` com precisão, e a precisão foi verificada elemento por elemento: em todos os quatro, `data-reveal` já está exatamente no elemento que carrega o deslocamento (`reveal.tsx:46`, `text-reveal.tsx:79`, `Hero/index.tsx:59,66,70`, `template.tsx:11`). Não é um seletor aproximado que por sorte funciona.

Note-se o que a regra **não** declara: `opacity` fica de fora. A rede de segurança de visibilidade força `opacity: 1 !important`; esta regra não, porque sob movimento reduzido o fade de opacidade é desejável — é a única animação que sobra e é justamente a que a preferência não pede para remover. As duas regras alcançam o mesmo seletor e declaram propriedades diferentes de propósito.

**Consequência aceita, e é a mudança de comportamento observável desta change:** `TextReveal` anima **apenas `y`**, sem opacidade (`text-reveal.tsx:81`). Com o deslocamento neutralizado, as palavras não têm nada para animar — aparecem no estado final, sem transição. Hoje o subtree alternativo dá a elas um fade. Perde-se esse fade. Foi aceito em vez de compensado: recriar um fade em CSS exigiria disparar por viewport a partir da folha de estilo, o que CSS não faz sem `animation-timeline` (suporte insuficiente) ou sem devolver a decisão ao JavaScript. E "texto aparece imediatamente, legível, sem movimento" é uma leitura defensável — talvez a mais fiel — de *reduced motion*. É o delta em `scroll-reveal-animations`.

### 3. O `staggerChildren` do Hero deixa de ramificar e fica fixo em `0.1`

`Hero/index.tsx:29` hoje zera o stagger sob reduce. Duas razões para simplesmente removê-lo:

- Não afeta markup. `initial="hidden"` com `hidden: {}` no container não serializa `style` nenhum, então o stagger nunca foi fonte de divergência.
- Com o deslocamento neutralizado, o que resta escalonado é opacidade. Um fade escalonado por 0,1s é movimento reduzido por qualquer definição razoável.

Hero não precisa do hook. Fica inteiramente resolvido por CSS.

### 4. `Parallax` recebe tratamento duplo, e um marcador só dele

`Parallax` é o único componente em que a preferência decide markup **e** comportamento, e as duas metades precisam de mecanismos diferentes porque acontecem em momentos diferentes.

O problema de tempo: `useTransform(scrollYProgress, [0,1], ["-8%", "8%"])` vale `-8%` quando o progresso é 0. O deslocamento inicial existe no **primeiro frame**. Uma solução só com o hook renderizaria a árvore completa deslocada, pintaria, e só então trocaria pela `<div>` nua — um salto visível, na cara de quem pediu menos movimento. Então a primeira metade tem de ser CSS, que age antes da primeira pintura.

A segunda metade não pode ser CSS. Neutralizar `transform` deixaria `useScroll` e `useTransform` subscritos e produzindo valores a cada frame de rolagem, para efeito visual descartado — colisão direta com `scroll-frame-budget`.

Então: **CSS zera o deslocamento no frame 1; o hook desliga a subscrição depois da montagem.** Duas mecânicas, cada uma no que sabe fazer.

> **Corrigido na implementação — a estrutura ficou incondicional e o hook mudou de função.**
>
> Duas coisas apareceram ao escrever o código. Primeira: a alegação de "colisão direta com `scroll-frame-budget`" estava exagerada. Aquela capability proíbe leitura de geometria em handler de scroll **do codebase** — o cenário diz "todos os `addEventListener("scroll", ...)` do codebase são inspecionados" —, não subscrição de biblioteca. E sob a preferência o Lenis não monta, então o scroll é nativo e coalescido pelo browser, não emitido a cada frame por `requestAnimationFrame`, que é exatamente o caso que aquela spec descreve como o perigoso. O custo de manter a subscrição viva é pequeno e não viola requisito nenhum.
>
> Segunda, e decisiva: trocar a árvore **desmonta os children**, e o único uso de `Parallax` envolve um `<video autoPlay>`. Hoje não há remontagem, porque o valor é conhecido na primeira renderização. Adiar a verdade criaria uma que não existe.
>
> A decisão: a estrutura passa a ser incondicional — wrapper e `motion.div` sempre — e o CSS faz todo o trabalho visual. O hook permanece com uma função só, e legítima: suprimir `willChange` sob a preferência. Promover a camada de um elemento deste tamanho para um `transform` que nunca muda é reserva de memória de GPU sem retorno, e `will-change` com escopo temporal é requisito explícito de `scroll-frame-budget`. Suprimir um valor de `style` não remonta nada, então aqui adiar a verdade não custa.

**O marcador é `data-parallax`, não `data-reveal`.** `data-reveal` tem significado declarado em `scroll-reveal-animations` — "elemento cujo estado inicial de animação é invisível" — e o parallax nunca é invisível, só deslocado. Marcá-lo mentiria sobre o atributo e o sujeitaria à rede de segurança de visibilidade sem necessidade.

**Alternativa rejeitada: um marcador genérico do tipo `data-motion-offset` ou `data-decorative-transform`.** É a abstração que parece certa e é a que apodrece: um nome genérico é um convite para tudo com `transform` cair nele, incluindo `transform` que serve a layout, e aí a regra com `!important` passa a quebrar posicionamento. `data-parallax` recusa isso por construção — não há como generalizá-lo sem renomeá-lo, e renomear é uma decisão visível. Se um segundo caso legítimo aparecer, ele ganha o seu próprio marcador, e só ao terceiro se discute abstrair.

**Ponto a verificar na implementação, não decidido no papel:** hoje, sob reduce, `Parallax` descarta o wrapper `overflow-hidden`. Depois da mudança o wrapper permanece, com o deslocamento zerado — até o hook desligar a subscrição, e o desligamento remonta a forma nua de novo. Conteúdo que hoje transborda sem ser recortado pode ser recortado nesse intervalo. As instâncias de `Parallax` precisam ser inspecionadas uma a uma; se alguma depender do transbordo, a saída é manter o wrapper em todos os caminhos em vez de removê-lo, tornando o recorte constante em vez de condicional.

### 5. Os quatro componentes de comportamento passam ao hook, sem CSS

`SmoothScroll`, `CursorGlow`, `CursorFollower` e `useMagnetic` decidem sobre interação pós-montagem. Um frame de atraso não é observável: ninguém move o ponteiro nem rola a página antes da hidratação terminar.

Três deles (`cursor-glow.tsx:65`, `CursorFollower:35`, `use-magnetic.ts:49`) já combinam `useReducedMotion()` com um `enabled` vindo de efeito — passam a ter as duas metades pelo mesmo padrão, o que é mais coerente do que hoje.

`SmoothScroll` merece uma nota: **não é hoje fonte de divergência.** Com `root`, `ReactLenis` renderiza `children` sem wrapper (`lenis-react.mjs:116`), então o DOM não difere entre os dois braços. Entra na change pela invariante — deixar a última leitura de ambiente em tempo de renderização de pé é deixar uma armadilha que depende de um detalhe interno de dependência continuar verdadeiro. O custo é que, sob reduce, o Lenis monta e é destruído no primeiro efeito. Lenis root escreve classes em `documentElement`; a implementação precisa confirmar que a destruição as remove e que `<html>` fica limpo.

> **Corrigido na implementação — `SmoothScroll` fica como está, e a exceção virou requisito.**
>
> O raciocínio acima estava errado sobre o custo, e o erro era de reconciliação, não de Lenis. Trocar o braço não troca só o que o Lenis faz: troca o **tipo do elemento** naquela posição, de `ReactLenis` para `Fragment`. O React desmonta a subárvore inteira quando o tipo muda — e a subárvore aqui é `Header`, a página e o footer, incluindo o `<video autoPlay>` do parallax. Adiar a verdade para depois da montagem, que é o remédio geral desta change, criaria uma remontagem da página inteira por carga, só para quem tem a preferência ativa. Remédio pior que a doença — e a doença aqui nem existe, porque os dois braços emitem o mesmo DOM.
>
> A decisão: `SmoothScroll` mantém `useReducedMotion()` do `motion`, com comentário que registra a prova (o ramo `root && root !== "asChild" ? children : <div>` em `lenis-react.mjs`), o que a sustenta, e o que a derruba. A regra de lint entra assim mesmo, com `biome-ignore` localizado — é o que faz a exceção ser visível e datada em vez de silenciosa.
>
> `hydration-integrity` foi corrigida junto: a exceção está escrita como requisito, com as três exigências que a acompanham (prova de DOM idêntico, registro do detalhe de dependência, supressão justificada) e com um cenário que impede que ela se estenda por semelhança. A versão anterior do requisito dizia que o padrão valia "inclusive quando o valor não altere markup, para que a invariante não depender de julgamento caso a caso" — a implementação mostrou que o julgamento é inevitável, e que a saída honesta é especificá-lo, não fingir que não existe.

### 6. A invariante é aplicada por lint, não por convenção

`biome.json` ganha `style.noRestrictedImports` proibindo `useReducedMotion` de `motion/react` — verificado como suportado no Biome 2.2.0, que aceita `importNames` por caminho.

Sem runner de testes, esta é a única forma de a invariante sobreviver à próxima primitiva de animação. A mensagem do erro aponta o substituto, para que quem cair nela não precise reconstruir o raciocínio.

Fica de fora uma regra genérica contra `matchMedia` em corpo de renderização: Biome não expressa isso, e escrever um plugin para um caso já coberto pelos três exemplos existentes seria desproporcional. O requisito de spec cobre o caso geral; o lint cobre a reincidência provável.

### 7. `HydrationSignal` mantém o código e reescreve os comentários

As duas linhas defensivas — reaplicar `.js`, remover `.reveal-failsafe` — ficam. Falhas de hidratação por outras causas continuam possíveis, e a proteção é barata.

Os comentários mudam porque hoje afirmam como fato corrente algo que deixa de ser verdade: "sob `prefers-reduced-motion` a hidratação falha (React #418...)". Deixar isso escrito faria o próximo leitor tratar a divergência como comportamento normal do sistema — que é precisamente o estado que esta change está desfazendo. A redação nova declara que a causa conhecida foi eliminada e que a defesa permanece por profundidade.

## Risks / Trade-offs

**`[data-reveal]` com `!important` alcança `transform` que sirva a layout** → Auditado antes de decidir: nos quatro componentes cobertos, o atributo está no elemento que carrega o deslocamento de animação, e em nenhum outro. O risco é de futuro, não de agora, e é o que a decisão 4 recusa endereçar com um marcador genérico.

**`TextReveal` perde o fade sob movimento reduzido** → Aceito e especificado, não mitigado. É a única regressão visual da change, atinge só usuários com reduce ativo, e o resultado — texto legível imediatamente, sem movimento — é defensável como leitura da preferência.

**O intervalo entre primeira pintura e primeiro efeito, sob reduce** → Existe em `Parallax` (wrapper presente e depois removido) e em `SmoothScroll` (Lenis montado e destruído). Não é observável como movimento, porque o CSS já zerou o deslocamento antes da pintura e ninguém rola antes de hidratar. É observável como trabalho desperdiçado, uma vez por carga, só em dispositivos com reduce.

**O hook re-renderiza a árvore sob reduce, logo após hidratar** → É intencional e é o preço da correção: a divergência sai da hidratação e vira uma atualização normal do React, que o React sabe fazer. Custa uma re-renderização dos quatro componentes de comportamento; hoje custa a página inteira descartada e reconstruída.

**Verificação inteiramente manual** → Mitigado em parte pelo lint e em parte pelo sinal de aceitação ser negativo e barato: alternar a preferência do sistema e conferir que o console fica limpo. Sem cobertura automatizada, uma regressão futura reaparece como ruído de console, não como teste vermelho — o que é pior, e é o que `hydration-integrity` existe para nomear.

**A preferência muda em tempo de execução e as primitivas não re-animam** → A regra de CSS reage imediatamente, então o resultado visual fica correto. O que não acontece é re-disparar a animação de entrada de elementos já revelados. Não é requisito, e ninguém alterna essa preferência esperando um replay.

## Migration Plan

Sem migração de dados, sem mudança de contrato, sem coordenação de deploy. A change é inteiramente de camada de apresentação e reverte por `git revert`.

Uma ordem de implementação é preferível a outra, porém: **o hook e a regra de CSS entram antes de qualquer consumidor perder sua ramificação.** Trocar um consumidor primeiro o deixaria sem nenhum tratamento de movimento reduzido no intervalo — regressão real de acessibilidade numa branch, que é o tipo de estado intermediário que sobrevive a um `git bisect` mal-humorado.

O lint entra por último. Adicioná-lo antes de os nove consumidores terem sido convertidos faz `npm run lint` falhar durante todo o trabalho e treina quem implementa a ignorá-lo.

## Open Questions

- **Alguma instância de `Parallax` depende do transbordo não recortado que o caminho de reduce hoje concede?** Decide se o wrapper `overflow-hidden` passa a ser constante ou continua condicional (decisão 4). Resolve-se inspecionando os usos, não discutindo.
- **A destruição do Lenis root deixa `documentElement` limpo?** Se deixar resíduo de classe, `SmoothScroll` precisa de limpeza explícita em vez de confiar no `destroy` da dependência.
- **A divergência observada era mesmo sob reduce ativo?** A leitura do código-fonte do `motion` fecha o caso em teoria: com reduce desativado, servidor devolve `null` e cliente devolve `false`, ambos falsy, e todas as ramificações produzem markup idêntico — não há divergência possível por esta causa. Se o React #418 aparecer com a preferência desativada, existe uma segunda causa que esta change não endereça, e ela precisa de investigação própria. A primeira tarefa de implementação é justamente confirmar isso, antes de mudar qualquer linha.
