## 1. Preparar o mapa de inversão

- [ ] 1.1 Em `src/components/Button/index.tsx`, alargar o tipo de `swapInvert` de `Record<string, { text: string; fill: string }>` para um tipo com os quatro campos `{ text: string; fill: string; icon: string; rim: string }`, **todos obrigatórios** — é isto que faz de uma variante incompleta um erro de TypeScript em vez de um bug visual (design.md, Risks)
- [ ] 1.2 Separar o contorno da cor do rótulo: tirar `hover:border-primary!` de dentro de `swapInvert.outline.text` e passá-lo para o novo campo `rim`; `text` fica só com `hover:text-white!`
- [ ] 1.3 Preencher `rim` nas variantes restantes: `primary` e `outline-inverted` recebem o que já tinham em `text` (`outline-inverted` tem `hover:border-white!`; `primary` não tem borda, recebe string vazia), e `inverted` recebe `hover:border-neutral-500!`
- [ ] 1.4 Preencher `icon` nas quatro variantes com `"transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-white group-hover:text-primary"` em `outline` e `inverted`, e string vazia em `primary` e `outline-inverted` — estas duas não usam `circleIcon` e design.md exclui inventar-lhes cores
- [ ] 1.5 Aplicar `invert?.rim` no `className` do `<Comp>`, a seguir a `invert?.text`

## 2. Inverter o ícone

- [ ] 2.1 No `<span>` do ícone (linhas 126-132), acrescentar `circleIcon && invert?.icon` ao `cn`, depois da string `rounded-full bg-primary p-1 text-white` — a classe `icon` já presente no `className` é o gancho, não é preciso nome novo
- [ ] 2.2 Confirmar que a seta **nua** continua sem cor própria: `IconComponent` não recebe `color` em `iconProps` em nenhum consumidor, para o glifo continuar a herdar `currentColor` como faz hoje na `ProductsSection`
- [ ] 2.3 Confirmar por leitura que nenhum `!` é necessário nas classes do disco — `bg-primary` e `group-hover:bg-white` são modificadores diferentes, o `tailwind-merge` mantém ambos e o `group-hover:` ganha por especificidade (design.md, decisão 6)

## 3. Reservar a espessura do contorno

- [ ] 3.1 Na `cva` `buttonVariants`, trocar `border` por `border-[1.5px]` na variante `outline`
- [ ] 3.2 Na `cva`, acrescentar `border-[1.5px] border-transparent` à variante `inverted`, antes de `bg-white`, para o repouso deixar ver o fundo branco do botão através da borda transparente
- [ ] 3.3 Verificar que nenhuma outra variante ganhou ou perdeu borda, e que `link` e `icon` (que não têm contorno) ficaram intactas

## 4. Rota de fixture

- [ ] 4.1 Criar `src/app/(app)/[locale]/(pages)/fixtures/buttons/page.tsx` no molde de `fixtures/footer/page.tsx`: mesma assinatura `params: Promise<{ locale: string }>`, com `notFound()` sob `NODE_ENV !== "development"` como **primeira instrução do corpo** (`CLAUDE.md`)
- [ ] 4.2 Renderizar, sobre fundo claro, cada variante com `textSwap` — `primary`, `outline`, `inverted`, `outline-inverted` — e uma linha extra de `outline` com `circleIcon`
- [ ] 4.3 Repetir o mesmo bloco dentro de um contentor `bg-primary`, que é a condição real do CTA de Produtos
- [ ] 4.4 Acrescentar um caso `magnetic` + `textSwap` + `circleIcon`, que é a combinação exacta do CTA de Serviços, para o tremor sub-pixel poder ser procurado onde ele apareceria
- [ ] 4.5 Comentar no topo do ficheiro que a página **não força** o estado de hover e porquê (forçá-lo testaria uma cópia das regras, não as regras — design.md, decisão 7)

## 5. Verificação visual

- [ ] 5.1 `npm run dev` e abrir `/en/fixtures/buttons`; confirmar que a página responde e que todas as combinações das tasks 4.2 a 4.4 estão presentes
- [ ] 5.2 Hover no `outline` com `circleIcon`: o disco passa a branco e a seta a `#212528`, e **em nenhum instante da subida** o disco fica branco sobre botão ainda claro nem `#212528` sobre painel já escuro
- [ ] 5.3 Hover no `inverted` sobre `bg-primary`: existe aro visível a delimitar o botão contra a secção; em repouso o bloco branco **não** mostra aro nenhum
- [ ] 5.4 Passar o rato para dentro e para fora várias vezes num botão `magnetic`: o rótulo e o ícone não saltam lateralmente — é o sintoma que a espessura fixa de 1,5px existe para evitar
- [ ] 5.5 Abrir `/en` e confirmar os dois botões reais: CTA de Serviços (`#services`) e CTA de Produtos (`#products`)
- [ ] 5.6 Conferir os consumidores de `outline` que a task 3.1 tocou de raspão: `Hero` (botão secundário) e `Header` (com `bg-white` por cima) — o aro de 1,5px em repouso não deve ler-se como mudança de desenho
- [ ] 5.7 Conferir que o botão `outline-inverted` do `Footer` continua exactamente como antes: sem `textSwap` não passa pelo `swapInvert`, portanto nada nele deve ter mudado
- [ ] 5.8 Verificar o estado de foco por teclado (`Tab`) num botão `outline`: o `focus-visible:ring-2` continua a desenhar-se por fora do novo contorno de 1,5px sem se confundir com ele

## 6. Fecho

- [ ] 6.1 `npm run lint` sem erros
- [ ] 6.1a Confirmar que o mapa `swapInvert` desta change funciona no caminho `href` do `Button`, e não só no caminho `<button>`

> **Caminho `href`, vindo de `add-calendly-popup-cta`.** A spec desta capability ganhou o requisito *"O caminho de render decide se as camadas existem"*, e o `Button` ganha uma prop `href` que renderiza uma âncora **com** todas as camadas de inversão. O cenário *"Botão com asChild não ganha camadas"* continua verdadeiro e não foi modificado — `asChild` é a única excepção, por o `Slot` aceitar um filho único.
>
> Consequência para quem implementar esta change: o `invert?.rim` da task 1.5 e o `invert?.icon` da task 2.1 têm de ser aplicados no elemento escolhido por `Comp`, não num `<button>` assumido. As duas changes tocam o mesmo ficheiro; a ordem de aterragem tem de ser combinada.
- [ ] 6.2 Registar em design.md, nas Open Questions, a resposta a que `#737373` chegou depois da verificação 5.3 — mantido, ajustado, ou trocado por `border-secondary`
- [ ] 6.3 Registar em design.md se a verificação 5.6 revelou que o `Hero` (`primary` + `textSwap`) se dissolve no fundo claro; se sim, é a próxima change e não esta
