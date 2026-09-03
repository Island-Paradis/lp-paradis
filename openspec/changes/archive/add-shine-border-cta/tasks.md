## 1. Corrigir o caminho do CSS antes de instalar

- [x] 1.1 Em `components.json`, mudar `tailwind.css` de `src/app/globals.css` para `src/app/(app)/globals.css` — o primeiro não existe, e com ele o CLI injecta os tokens de animação num ficheiro órfão
- [x] 1.2 Confirmar que os restantes campos do `components.json` resolvem: `@/components/ui` → `src/components/ui/`, `@/lib/utils` → `src/lib/utils.ts`, e o registry `@magicui`

## 2. Instalar o componente do registry

- [x] 2.1 Correr `npx shadcn@latest add @magicui/shine-border`
- [x] 2.2 Inspeccionar os imports de `src/components/ui/shine-border.tsx`: só `react` e `@/lib/utils` — nenhum `motion`, nenhuma biblioteca de ícones, nenhum `@/i18n/navigation`. Se a versão publicada trouxer `motion/react`, parar e reavaliar: quebra o requisito de não assinar o loop de animação
- [x] 2.3 Confirmar que `className` traz `motion-safe:animate-shine`, `pointer-events-none`, `absolute inset-0` e `rounded-[inherit]` — são estas quatro que satisfazem por construção os requisitos de degradação e de camada inerte
- [x] 2.4 Verificar onde o CLI colocou `--animate-shine` e `@keyframes shine`; se não estiverem no bloco `@theme inline` de `src/app/(app)/globals.css` ao lado de `--animate-marquee` e `@keyframes marquee`, movê-los à mão para lá
- [x] 2.5 Confirmar que `package.json` não ganhou nenhuma dependência
- [x] 2.6 `npm run lint` — o CLI escreve sem ponto e vírgula e come a newline final do `globals.css`; ambos corrigidos

## 3. Prop `shine` no `Button`

- [x] 3.1 Acrescentar `shine?: boolean` a `ButtonOwnProps` em `src/components/Button/index.tsx`, ao lado de `magnetic` e `textSwap`, e desestruturá-la com default `false`. Não tocar na `cva` nem no mapa `swapInvert`
- [x] 3.2 Derivar a condição de render da camada: activa quando `shine` está ligada e o caminho **não** é `asChild` (o `Slot` aceita um filho único, pela mesma razão mecânica que já exclui as camadas de inversão). O caminho `href` fica incluído
- [x] 3.3 Garantir o contexto de posicionamento: o `relative` hoje só entra com `swap`; passa a entrar também quando a camada está activa. Sem ele o `absolute inset-0` do anel resolve contra um antepassado errado
- [x] 3.4 Inserir a camada antes do conteúdo, com índice de empilhamento acima do painel de preenchimento (que não tem índice) e abaixo do conteúdo (que é `z-10` no caminho `swap`)
- [x] 3.5 ~~Passar a cor a partir do token de primeiro plano da variante~~ — **revertida.** A cor derivada do preenchimento de repouso é, por construção, a cor do painel de hover: o anel desaparecia nas quatro variantes. Substituída por 3.8
- [x] 3.6 Confirmar por tipos e por leitura que `shine` é ortogonal: não liga `swap`, não liga `magnetic`, não insere painel nem rótulo duplicado nem `<span>` de ícone
- [x] 3.7 `npm run lint`
- [x] 3.8 Substituir o `SHINE_COLOR` por variante por uma paleta única de três matizes (`#A07CFE`, `#FE8FB5`, `#FFBE7B`), declarada num só lugar e igual em todas as variantes. Registar em comentário que os literais são a razão pela qual funciona — cobrem as duas pontas do intervalo — e não um risco de tema
- [x] 3.9 Registar em comentário os contrastes medidos por matiz contra `#212528` e contra `#ffffff`, para o único caso fraco (`#FFBE7B` a 1,6:1 sobre branco) ficar rastreável até ao ajuste que o cobre
- [x] 3.10 Acrescentar o quinto campo obrigatório ao tipo `SwapInvert` para o ajuste do anel em hover, e estender o comentário da tabela — os campos são obrigatórios para uma variante nova falhar a compilação em vez de ficar com a cor de repouso durante o hover
- [x] 3.11 Preencher o campo nas quatro variantes: escurecimento nas de painel claro (`primary`, `outline-inverted`), string vazia **declarada** nas de painel escuro (`outline`, `inverted`)
- [x] 3.12 Aplicar o ajuste na camada do anel com `group-hover:`, na mesma duração e curva do painel (`500ms cubic-bezier(0.22,1,0.36,1)`), pela razão que o `iconSwap` já documenta
- [x] 3.13 Declarar o filtro **identidade** no repouso do anel. `filter: none → brightness(.75)` não interpola, salta — e o salto lê-se como um pisco no primeiro frame do hover
- [x] 3.14 Passar `borderWidth={2}` no call site da camada — acima do vestígio e ainda na ordem de grandeza do contorno de 1,5px que a capability fixa
- [x] 3.15 `npm run lint` e `npx tsc --noEmit`

## 3b. Calibrar a distribuição no fork do componente

- [ ] 3b.1 Em `src/components/ui/shine-border.tsx`, baixar `backgroundSize` de `300% 300%` para `150% 150%`. Com 300% o elemento amostra só o terço interior do gradiente (`r_norm = (0.5/2.121)·√2 = 1/3`, invariante à escala e ao aspect ratio) e a banda acesa fica fora desse terço
- [ ] 3b.2 Comentar o patch no ficheiro: o número que mudou, a conta que o justifica, e que a troca é deliberada — a 150% o ponto quente viaja menos, portanto lê mais como borda a pulsar e menos como reflexo a passar
- [ ] 3b.3 Registar no mesmo comentário que o ficheiro é um fork de registry, para um `shadcn add` futuro não o sobrescrever em silêncio — o registo de `parallax.tsx` e `scroll-based-velocity.tsx`
- [ ] 3b.4 Confirmar que o patch não introduziu import novo nem dependência: continua só `react` e `@/lib/utils`
- [ ] 3b.5 `npm run lint`

## 4. Linha de verificação na fixture de botões

- [ ] 4.1 Em `src/app/(app)/[locale]/(pages)/fixtures/buttons/page.tsx`, confirmar que a guarda de `NODE_ENV !== "development"` com `notFound()` é a primeira instrução do corpo do componente, e mantê-la assim
- [ ] 4.2 Acrescentar uma `Row` com `shine` sozinha, em cada variante, sobre fundo claro e sobre `bg-primary`
- [ ] 4.3 Acrescentar uma `Row` com `shine` + `textSwap`, nos mesmos dois fundos — é o caso que verifica a ordenação de camadas e não existe em produção
- [ ] 4.4 Acrescentar um botão `shine` desactivado, para o esmorecimento do anel ser comparável com o do botão (confirma que a camada herda o `disabled:opacity-50` do pai)
- [ ] 4.5 Acrescentar uma linha de controle sem `shine`, para a ausência de anel ser visível ao lado da presença
- [ ] 4.6 Comentar na fixture o que cada linha existe para apanhar, no registo do resto do ficheiro

## 5. Verificar as camadas na fixture

- [ ] 5.1 Abrir `/en/fixtures/buttons` com `npm run dev`
- [ ] 5.2 **Corte nas curvas:** comparar a espessura do anel nos topos curvos da pill com os lados rectos, na linha `shine + textSwap` (que é `overflow-hidden`). Se afinar ou serrar, recuar a camada com um `inset` de subpixel — a espessura já está em 2px e subi-la mais sai da linguagem de contorno
- [ ] 5.3 **Ordenação:** passar o cursor na linha `shine + textSwap` da variante `primary` e confirmar que o anel sobrevive à subida do painel branco — visível antes, durante e depois
- [ ] 5.4 **Contraste em repouso:** confirmar que cada uma das três matizes se distingue do preenchimento de repouso, nos dois fundos
- [ ] 5.4b **Contraste sob painel claro:** com o painel a cobrir a caixa nas variantes `primary` e `outline-inverted`, confirmar que `#FFBE7B` — o pior caso, 1,6:1 sem ajuste — continua distinguível, e afinar o escurecimento até passar. Confirmar que `#A07CFE`, o mais escuro dos três, não se apagou no processo
- [ ] 5.4c **Sem pisco:** entrar e sair do hover várias vezes e confirmar que o ajuste arranca do valor de repouso sem salto no primeiro frame — se piscar, o filtro identidade do repouso não está declarado
- [ ] 5.4d **Percurso completo:** observar um ciclo inteiro da animação e confirmar que não há nenhum trecho do perímetro indistinguível do preenchimento. É o que a descida para 150% existe para garantir
- [ ] 5.5 **Rótulo:** confirmar que o gradiente nunca é pintado sobre os glifos quando o ponto quente passa pelo lado do rótulo
- [ ] 5.6 **Geometria:** comparar a linha `shine` com a linha de controle e confirmar que as caixas medem o mesmo e o rótulo não desloca
- [ ] 5.7 **Desactivado:** confirmar que o anel esmorece com o botão e que este não parece disponível para clique
- [ ] 5.8 **Movimento reduzido:** activar `prefers-reduced-motion: reduce` no DevTools e confirmar que o anel está visível e imóvel, e que nenhuma caixa mudou de tamanho
- [ ] 5.9 **`duration`:** com `backgroundSize` em 150% o percurso é mais curto, logo os 14s deixam de ser um crawl. Confirmar no ecrã; encurtar só se o pulso parecer parado
- [ ] 5.10 **`filter` sobre camada mascarada:** o anel acumula `mask-composite`, `will-change` e agora `filter`. Confirmar que o hover não treme; se tremer, é aqui que se olha primeiro

## 6. Ligar no botão de submissão

- [ ] 6.1 Em `src/components/GetQuote/QuoteForm.tsx`, acrescentar `shine` ao `<Button type="submit" variant="primary" size="lg" disabled={isPending}>`. Não mexer no `disabled={isPending}` — é o que impede o duplo clique de criar dois documentos
- [ ] 6.1b **Remover o `className="border-2"`** do call site. `inset-0` resolve contra a padding box, logo o anel fica por dentro da borda em vez de coincidir com ela; e num botão sem largura declarada os 2px somam 4px à altura e à largura, contra o requisito de geometria. O que se via era um aro estático `#edeef0` herdado do `* { @apply border-border }`, não um anel mais grosso
- [ ] 6.2 Confirmar que o cabeçalho de restrições de bundle do ficheiro continua verdadeiro após a mudança; se a camada nova introduzir alguma consideração nova, registá-la lá no mesmo registo
- [ ] 6.3 `npm run lint`

## 7. Verificar o call site real

- [ ] 7.1 Abrir `/en/get-quote` e `/pt/get-quote` e confirmar o anel a percorrer a borda do botão de submissão
- [ ] 7.2 Abrir `/en/fixtures/get-quote` e confirmar o anel nos estados degradados de conteúdo que a fixture exercita
- [ ] 7.3 Submeter o formulário com campos válidos: confirmar que o botão desactiva durante o pedido, que o anel esmorece com ele, e que a mensagem de sucesso substitui o formulário — levando o anel com ela
- [ ] 7.4 Clicar duas vezes em sucessão rápida e confirmar que só um documento é criado no admin
- [ ] 7.5 Submeter com campos inválidos e confirmar que o anel não interfere com a apresentação dos erros de campo
- [ ] 7.6 Percorrer a home, o rodapé, a `NavBar` e o CTA da `ProductsSection` e confirmar que nenhum outro botão ganhou anel

## 8. Verificar os limites da excepção de custo ocioso

- [ ] 8.1 Com `/get-quote` aberta e o ponteiro parado, inspeccionar o frameloop e confirmar que nenhuma assinatura tem origem no anel
- [ ] 8.2 Confirmar no Performance Monitor que o CPU em `/get-quote` parada é o de um repaint pequeno e não de um loop de aplicação, e registar o valor
- [ ] 8.3 Repetir o cenário de CPU em regime parado na home e confirmar que continua indistinguível de zero — a excepção não saiu da sua rota
- [ ] 8.4 Trocar de aba com `/get-quote` aberta e confirmar que nenhum repaint do anel é produzido com a aba oculta
- [ ] 8.5 Comparar o chunk de cliente de `/get-quote` com o de antes da change e confirmar que o acréscimo corresponde apenas ao módulo do anel e à sua folha de estilo

## 9. Fechar

- [ ] 9.1 `npm run lint` e `npm run build` limpos
- [ ] 9.2 Revisitar as três questões abertas do `design.md` e registar as decisões tomadas (`borderWidth`, `duration`, token por prop ou por variável CSS)
- [ ] 9.3 Confirmar que os três specs desta change descrevem o que ficou implementado, e corrigir a spec — não o código — onde a verificação tenha revelado um requisito mal formulado
- [ ] 9.4 `openspec validate add-shine-border-cta`
