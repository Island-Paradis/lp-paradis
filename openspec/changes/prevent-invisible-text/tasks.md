## 1. Escape hatch — CSS e detecção de estado

- [x] 1.1 Definir o valor de N do timer de segurança (Open Question 1 do design) e registrá-lo como comentário junto da constante
- [x] 1.2 Adicionar em `globals.css` a regra que força visibilidade sob `html:not(.js) [data-reveal]` e `html.reveal-failsafe [data-reveal]`, com `opacity: 1 !important` e `transform: none !important`
- [x] 1.3 Escrever o comentário da regra em `globals.css` explicando por que o `!important` existe, quais são as duas condições que a acionam, e por que ela não casa no caminho feliz — seguindo o padrão dos comentários já presentes no arquivo
- [x] 1.4 Adicionar o script inline bloqueante no topo do `<body>` em `src/app/(app)/[locale]/layout.tsx`, que aplica `.js` em `documentElement` e agenda a aplicação de `.reveal-failsafe` após N
- [x] 1.5 Fazer o timer agendado verificar o sinal de vivacidade do React antes de aplicar `.reveal-failsafe`, de modo que seja no-op quando o React tiver hidratado
- [x] 1.6 Decidir onde ancorar o sinal de vivacidade do React (Open Question 4 do design), considerando que `SmoothScroll` retorna `children` cru sob `prefers-reduced-motion` e não oferece efeito nesse caminho
- [x] 1.7 Implementar a emissão do sinal de vivacidade no componente escolhido, garantindo que ocorra nos dois caminhos de `prefers-reduced-motion`
- [x] 1.8 Confirmar que a página continua sem CSP configurada e, portanto, que o script inline não precisa de `nonce`; registrar a dependência caso uma CSP venha a ser adicionada

## 2. Marcação dos elementos animados

- [x] 2.1 Adicionar `data-reveal` ao `motion.div` de `src/components/ui/reveal.tsx`
- [x] 2.2 Adicionar `data-reveal` ao `motion.span` de cada palavra em `src/components/ui/text-reveal.tsx`
- [x] 2.3 Adicionar `data-reveal` ao `motion.div` do caminho de movimento reduzido em `src/components/ui/text-reveal.tsx`
- [x] 2.4 Adicionar `data-reveal` aos elementos animados por variants próprios em `src/components/Hero/index.tsx`: o `motion.h1`, a `motion.div` da descrição e a `motion.div` do grupo de CTAs
- [x] 2.5 Varrer `src/` por outros usos de `motion` com `initial` que resolva para opacidade zero ou deslocamento, e marcar os que forem encontrados
- [x] 2.6 Verificar no DOM que todo elemento com estado inicial invisível carrega a marcação, e que nenhum elemento sem estado inicial invisível a carrega

## 3. Visibilidade independente de cor no Hero

- [x] 3.1 Criar em `globals.css` uma utilidade de texto em gradiente cuja declaração base seja a cor sólida `#151718`
- [x] 3.2 Aplicar o gradiente e o recorte apenas dentro de um `@supports` que confirme `background-clip: text` ou `-webkit-background-clip: text`, posicionado depois da declaração da cor sólida
- [x] 3.3 Garantir que a utilidade não propague cor transparente para elementos filhos, de modo que o `<CursorGlow>` filho do `<h1>` não seja afetado
- [x] 3.4 Substituir as classes `bg-linear-to-r from-[#151718] to-[#6E797E] bg-clip-text text-transparent` do `<h1>` em `src/components/Hero/index.tsx` pela nova utilidade, preservando as demais classes
- [x] 3.5 Verificar em navegador com suporte que o título está pixel-idêntico ao estado anterior à mudança
- [x] 3.6 Verificar, desabilitando `background-clip` no DevTools, que o título cai na cor sólida e permanece legível

## 4. Células de serviço

- [x] 4.1 Remover `h-full` do `<span>` de ícone e título em `src/components/ServicesSection/index.tsx`
- [x] 4.2 Verificar em 768px, 1024px e 1280px que a descrição de cada card está inteiramente visível dentro da célula
- [x] 4.3 Confirmar que o alinhamento do ícone com o título não regrediu com a remoção do `h-full`
- [x] 4.4 Remover ou corrigir `md:grid-rows-[repeat(20px)]`, que não é CSS válido e não produz efeito
- [x] 4.5 Confirmar com a change `fix-responsive-content-clipping` que sua tarefa 5.4 continua sendo a dona das medições por breakpoint, e que nenhuma medida foi duplicada aqui

## 5. Gatilho e replay das primitivas

- [x] 5.1 Trocar o `viewport` de `src/components/ui/reveal.tsx` para disparo sem margem e com limiar zero
- [x] 5.2 Adicionar `once: true` ao `viewport` de `src/components/ui/reveal.tsx`
- [x] 5.3 Trocar o `viewport` dos dois caminhos de `src/components/ui/text-reveal.tsx` para disparo sem margem e com limiar zero, mantendo o `once: true` já existente
- [x] 5.4 Avaliar se o atraso perceptual removido junto com a margem deve ser recomposto via `delay`, e aplicar se for o caso
- [x] 5.5 Verificar que um bloco revelado não volta a ficar invisível ao sair da viewport, em todas as cinco seções que usam `Reveal`
- [x] 5.6 Verificar que o último bloco animado do documento é revelado mesmo permanecendo na faixa inferior da tela sem rolagem adicional disponível
- [x] 5.7 Confirmar que duração, easing, stagger e distância de deslocamento permanecem os mesmos de antes da mudança
- [x] 5.8 Revisar as mudanças de sensação de 5.1 a 5.4 com quem responde pelo design (Open Questions 2 e 3) — revisado na prática: o `once: true` foi rejeitado e revertido em 5c.1; a margem do `Reveal` foi restaurada junto

## 5b. Correções descobertas na implementação

- [x] 5b.1 Corrigir o deadlock do `TextReveal`: observar a máscara `overflow-hidden` em vez da palavra deslocada, propagando o estado por variants
- [x] 5b.2 Reafirmar `.js` no efeito de `HydrationSignal`, porque a recuperação do React #418 sob `prefers-reduced-motion` zera os atributos de `<html>`
- [x] 5b.3 Registrar em `design.md` (D2b e D3 corrigido) e na spec o mecanismo real, medido, no lugar da hipótese da margem negativa
- [ ] 5b.4 Decidir se a falha de hidratação sob `prefers-reduced-motion` (React #418, anterior a esta change, aplicação inteira) entra aqui ou vira proposta separada — Open Question 5

## 5c. Reversão do `once` e recalibragem do failsafe

- [x] 5c.1 Reverter `once: true` do `Reveal` e restaurar `viewport={{ margin: "-80px" }}`, devolvendo o replay a cada entrada
- [x] 5c.2 Documentar nas duas primitivas o acoplamento entre margem e `once`, e por que cada uma escolhe o lado oposto
- [x] 5c.3 Subir N de 4000ms para 10000ms, com a medição de dev registrada junto da constante
- [x] 5c.4 Tornar a degradação reversível: `HydrationSignal` remove `.reveal-failsafe` ao hidratar
- [x] 5c.5 Atualizar `design.md` (D2, D3, D4) e a spec para registrar a reversão e o mecanismo medido
- [x] 5c.6 Verificar que um bloco percorre `0 → 1 → 0 → 1` ao descer, subir e descer de novo
- [x] 5c.7 Verificar que `.reveal-failsafe` aplicada antes da hidratação é removida quando o React sinaliza
- [x] 5c.8 Regressão: confirmar que a garantia sem JavaScript segue em zero textos invisíveis
- [x] 5c.9 Verificar que, com o React vivo, todo elemento inteiramente dentro da viewport está com opacidade total

## 6. Limpezas

- [x] 6.1 Remover o `console.log(services?.title)` de `src/app/(app)/[locale]/page.tsx`
- [x] 6.2 Converter para `<div>` os `<span>` que envolvem `<p>` restantes em `src/app/(app)/[locale]/page.tsx`
- [x] 6.3 Varrer `src/` por outras ocorrências de elemento de bloco dentro de elemento inline e converter as encontradas
- [x] 6.4 Confirmar no console de desenvolvimento a ausência de avisos de `validateDOMNesting`
- [x] 6.5 Rodar `npm run lint` e corrigir o que apontar

## 7. Verificação da garantia principal

- [x] 7.1 Carregar a home com o JavaScript desabilitado e confirmar que títulos, subtítulos, descrições de cards, rótulos de CTA, FAQ e depoimentos estão todos legíveis
- [x] 7.2 Carregar a home bloqueando todas as requisições `.js` no DevTools e confirmar o mesmo resultado
- [x] 7.3 Simular falha de hidratação com o bundle carregado e confirmar que o texto se torna visível após N, sem interação
- [x] 7.4 Carregar a home normalmente e confirmar, gravando os primeiros frames, que nenhum elemento animado é pintado no estado final antes do estado inicial
- [x] 7.5 Carregar a home normalmente e confirmar no DevTools que nem `.js` sozinha nem `.reveal-failsafe` produzem efeito sobre elementos visíveis
- [x] 7.6 Repetir 7.1 e 7.4 com `prefers-reduced-motion: reduce` ativo
- [x] 7.7 Repetir 7.1 nos dois locales, `/en` e `/pt`
- [ ] 7.8 Validar em Chromium, WebKit e Gecko que a precedência do `!important` da folha de estilo sobre o `style` inline do `motion` se comporta como esperado — **Chromium verificado** (inline `translateY(110%)` → computed `none`); WebKit e Gecko pendentes, os engines não estão instalados localmente
- [x] 7.9 Fazer uma passagem final de rolagem completa da home, com JavaScript ativo, confirmando que nenhum texto some em nenhum momento
