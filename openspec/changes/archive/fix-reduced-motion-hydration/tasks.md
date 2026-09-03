## 1. Confirmar o diagnóstico antes de mudar código

- [ ] 1.1 Com `prefers-reduced-motion: reduce` ativo no sistema, carregar `/en` no dev server e registrar o console: confirmar React #418 e o aviso `Encountered a script tag while rendering React component`
- [ ] 1.2 Com a preferência desativada, recarregar e confirmar que o console fica limpo — se o #418 aparecer também aqui, existe uma segunda causa e ela precisa de investigação própria antes de seguir (ver Open Questions do design)
- [ ] 1.3 Inspecionar o DOM de `<html>` depois de hidratar sob reduce e registrar quais classes de estado sobrevivem, para comparar ao fim da change
- [x] 1.4 Inspecionar cada uso de `Parallax` na home e decidir se alguma instância depende do transbordo não recortado que o caminho de reduce hoje concede — a resposta define se o wrapper `overflow-hidden` passa a ser constante (Open Question do design)

  **Resposta: nenhuma depende, e o wrapper passa a ser constante.** Existe uma única instância (`page.tsx:85`), e ela envolve um vídeo dimensionado `h-[112%] mt-[-6%]` — 12% de transbordo vertical deliberado, que é exatamente a folga de curso do `amount={6}`. Esse transbordo **precisa** ser recortado, e já é: o pai em `page.tsx:84` declara `overflow-hidden` por conta própria. Ou seja, o caminho de reduce de hoje nunca concedeu transbordo não recortado — o pai recorta de qualquer forma. Tornar o wrapper constante não muda geometria nenhuma: com `transform` neutralizado, o vídeo fica em `mt-[-6%]` recortado pelo wrapper em vez de pelo pai, no mesmo lugar.

## 2. Fundação: o hook e a regra de CSS

- [x] 2.1 Criar `src/lib/use-reduced-motion.ts` com `useState(false)` mais efeito que lê `matchMedia("(prefers-reduced-motion: reduce)")` e assina o evento `change`, com limpeza no retorno
- [x] 2.2 Comentar no hook por que o valor inicial é `false` (é o que o servidor assume, logo a primeira renderização do cliente reproduz o servidor por construção) e por que `useSyncExternalStore` está descartado apesar de ser a API aparentemente indicada
- [x] 2.3 Adicionar a `src/app/(app)/globals.css`, vizinha da rede de segurança de visibilidade, a regra `@media (prefers-reduced-motion: reduce) { [data-reveal] { transform: none !important } }` com `biome-ignore` para `noImportantStyles`
- [x] 2.4 Documentar no comentário dessa regra que `opacity` fica deliberadamente de fora — o fade é a animação que a preferência não pede para remover — e que o `!important` existe para vencer o `style` inline do `motion`, mesmo mecanismo já usado pela rede de segurança logo acima

## 3. Consumidores de markup: remover a ramificação, deixar o CSS agir

- [x] 3.1 `src/components/ui/reveal.tsx` — remover `useReducedMotion()` e o `initial` condicional; passar a emitir sempre o offset de direção
- [x] 3.2 `src/components/ui/text-reveal.tsx` — remover `useReducedMotion()` e o `return` alternativo completo; o caminho das palavras mascaradas passa a ser o único
- [x] 3.3 Atualizar o comentário de cabeçalho de `text-reveal.tsx`, que hoje afirma "Respects `prefers-reduced-motion` by falling back to a plain fade" — o fallback deixa de existir e o fade deixa de acontecer
- [x] 3.4 `src/components/Hero/index.tsx` — remover `useReducedMotion()`, fixar `staggerChildren` em `0.1` e usar sempre `{ opacity: 0, y: 16 }` no variant `hidden`
- [x] 3.5 `src/app/(app)/[locale]/(pages)/template.tsx` — remover `useReducedMotion()` e o `initial` condicional
- [x] 3.6 Conferir no DOM renderizado que, nos quatro arquivos, `data-reveal` continua exatamente no elemento que carrega o deslocamento — é o que faz o seletor do CSS ser preciso e não aproximado

## 4. `Parallax`: CSS no primeiro frame, hook depois da montagem

- [x] 4.1 Adicionar `data-parallax` ao `motion.div` interno de `src/components/ui/parallax.tsx`, com comentário declarando o significado do marcador e por que não é `data-reveal` (o parallax nunca é invisível, só deslocado)
- [x] 4.2 Estender a regra de `globals.css` para alcançar `[data-parallax]` junto de `[data-reveal]`, e registrar por que o marcador é específico em vez de genérico
- [x] 4.3 Trocar `useReducedMotion()` pelo hook do projeto em `parallax.tsx`, mantendo a ramificação que desliga a subscrição de scroll — agora sem custo de hidratação
- [x] 4.4 Aplicar a decisão de 1.4 sobre o wrapper `overflow-hidden`: constante em todos os caminhos, ou condicional como hoje
- [x] 4.5 Comentar em `parallax.tsx` por que o tratamento é duplo: o deslocamento inicial existe no primeiro frame (`useTransform` vale `-amount%` em progresso 0), então só CSS chega em tempo; e a subscrição de scroll não pode ficar viva produzindo valor descartado, por `scroll-frame-budget`

## 5. Consumidores de comportamento: trocar a origem do valor

- [x] 5.1 `src/components/SmoothScroll/index.tsx` — ~~trocar `useReducedMotion()` pelo hook do projeto~~ **mantido no hook do `motion`, como exceção especificada**

  A conversão foi tentada e revertida. Trocar o braço troca o TIPO do elemento naquela posição (`ReactLenis` -> `Fragment`), e o React desmonta a subárvore inteira quando o tipo muda — `Header`, página e footer, incluindo o `<video autoPlay>` do parallax. Remontagem da página por carga, só para quem tem a preferência ativa, para corrigir uma divergência que não existe: com `root`, `ReactLenis` renderiza um `LenisContext.Provider` e nenhum nó de DOM, então os dois braços emitem o mesmo markup. Ver a correção registrada em `design.md`.
- [x] 5.2 Registrar em comentário que `SmoothScroll` não era fonte de divergência (com `root`, `ReactLenis` renderiza `children` sem wrapper) e **por que a conversão seria pior**, com o detalhe de dependência que sustenta a exceção e o que a derruba
- [x] 5.3 `src/components/ui/cursor-glow.tsx` — trocar pelo hook do projeto
- [x] 5.4 `src/components/CursorFollower/index.tsx` — trocar pelo hook do projeto
- [x] 5.5 `src/lib/use-magnetic.ts` — trocar pelo hook do projeto
- [x] 5.6 Confirmar por busca que o único arquivo em `src/` que ainda importa `useReducedMotion` de `motion/react` é `SmoothScroll`, sob a exceção especificada e com `biome-ignore` justificado

## 6. Coerência da documentação existente

- [x] 6.1 Reescrever o comentário de `src/components/HydrationSignal/index.tsx:29-39`, que hoje afirma como comportamento corrente a divergência que esta change elimina; declarar que a causa conhecida foi removida e que a reaplicação de `.js` permanece por defesa em profundidade
- [x] 6.2 Revisar o comentário de `src/components/HydrationSignal/index.tsx:41-48` sobre a remoção de `.reveal-failsafe` — o código fica, a justificativa precisa deixar de citar movimento reduzido como o caso motivador
- [x] 6.3 ~~Revisar o comentário do script inline em `src/app/(app)/[locale]/layout.tsx`~~ **não aplicável**

  Uma nota diagnóstica foi escrita (o aviso `Encountered a script tag` vive no ramo de `completeWork` em que `popHydrationState` devolveu `false`, logo é detector de falha de hidratação e não reclamação sobre o script; e `next/script` com `beforeInteractive` não serve, porque para script inline ele empurra para `self.__next_s`, drenado por `app-bootstrap.js` só quando o bundle sobe). O arquivo teve TODOS os comentários removidos por edição externa durante a sessão, e por decisão do autor fica assim. Nada a revisar.
- [x] 6.4 Revisar o comentário da rede de segurança no fim de `globals.css` para que a regra nova de movimento reduzido e a regra de failsafe fiquem legíveis como duas coisas distintas que compartilham seletor

## 7. Aplicar a invariante mecanicamente

- [x] 7.1 Adicionar a `biome.json` a regra `style.noRestrictedImports` proibindo `useReducedMotion` de `motion/react`, via `importNames`, com mensagem apontando `@/lib/use-reduced-motion`
- [x] 7.2 Rodar `npm run lint` e confirmar que a regra passa — acusou apenas `SmoothScroll`, que é a exceção especificada e recebeu `biome-ignore` justificado
- [x] 7.3 Confirmar que a regra dispara de fato — vista falhar em `SmoothScroll` com a mensagem completa antes de o `biome-ignore` ser aplicado, o que dispensou o arquivo temporário

## 8. Verificação

- [ ] 8.1 Com `prefers-reduced-motion: reduce` ativo, carregar a home e confirmar console sem React #418 e sem o aviso do `<script>` — este é o sinal de aceitação da change
- [ ] 8.2 Confirmar que o `<script>` inline entregue pelo servidor permanece no DOM como `script`, e não foi substituído por outro nó
- [ ] 8.3 Comparar o HTML do servidor entre uma carga com reduce e uma sem (`curl` nas duas, ou visualizar fonte), e confirmar que são idênticos incluindo as máscaras por palavra e os `style` inline iniciais
- [ ] 8.4 Sob reduce, confirmar visualmente: nenhum deslocamento em blocos, palavras ou Hero; todo o texto legível; o fade de opacidade presente onde existia
- [ ] 8.5 Sob reduce, confirmar que as palavras de `TextReveal` aparecem sem animação e dentro das suas máscaras — comportamento novo e especificado, não regressão
- [ ] 8.6 Sob reduce, confirmar que o scroll é nativo (Lenis não ativo), que o cursor seguidor e o glow estão inativos, e que o efeito magnético não responde
- [ ] 8.7 Sob reduce, comparar as classes de `documentElement` com o registro de 1.3 e confirmar que os atributos de `<html>` não são zerados e que o Lenis não deixou resíduo depois de montar e ser destruído
- [ ] 8.8 Sem reduce, percorrer a home inteira e confirmar que todas as animações de entrada, o parallax, o scroll suave e os efeitos de ponteiro estão idênticos ao comportamento anterior à change
- [ ] 8.9 Alternar `prefers-reduced-motion` com a página aberta e confirmar que o deslocamento é neutralizado ou restaurado sem recarregar, e que os efeitos de ponteiro seguem a preferência nova
- [ ] 8.10 Carregar a home com o JavaScript desabilitado e confirmar que a rede de segurança de visibilidade continua íntegra — todo o texto legível, com e sem reduce
- [x] 8.11 Rodar `npm run lint` e `npm run build`

  `npm run build` passa. `npm run lint`: os 14 arquivos tocados por esta change estão limpos, incluindo `biome.json` e a regra nova. Os 45 erros restantes são pré-existentes, em arquivos que a change não toca.
