## Why

O botão de submissão de `/get-quote` é o CTA terminal do site e, hoje, o mais nu de todos: enquanto os CTAs do `Hero` e da `ProductsSection` levam `magnetic` e `textSwap`, o submit é um `<Button variant="primary" size="lg">` sem nenhuma camada de movimento. O botão que converte tem menos presença visual do que os que só prometem.

A intenção é dar-lhe um anel animado permanente — o efeito `shine-border` do registry `@magicui` — que percorre a borda da pill e chama o olho para a acção final do formulário.

## What Changes

- **Novo componente** `src/components/ui/shine-border.tsx`, instalado a partir de `@magicui` (`npx shadcn@latest add @magicui/shine-border`). É um único `<div>` `"use client"` sem dependências de runtime: todo o movimento vem de um `@keyframes` CSS que arrasta `background-position` sobre um gradiente mascarado por `mask-composite: exclude`.
- **Correcção de `components.json`**: `tailwind.css` aponta para `src/app/globals.css`, que não existe — o ficheiro real é `src/app/(app)/globals.css`. Sem esta correcção o CLI não injecta `--animate-shine` nem `@keyframes shine` no sítio certo, e o efeito instala-se silenciosamente morto (anel estático, sem erro nem aviso).
- **Prop nova `shine` no `Button`** (`src/components/Button/index.tsx`), desligada por defeito. Quando ligada, insere o anel como camada dentro do próprio elemento renderizado, acima do painel de preenchimento do `textSwap`, com o raio da silhueta do botão.
- **Ordenação de camadas resolvida uma vez**: o painel de preenchimento do `textSwap` é `absolute inset-0` e, para a variante `primary`, é `bg-white` — cobriria o anel por completo em hover. A camada do anel passa a ter índice de empilhamento acima dele.
- **Paleta própria do anel**, independente das superfícies do botão: três matizes (`#A07CFE`, `#FE8FB5`, `#FFBE7B`) em vez de uma cor derivada da variante. A independência é o argumento — uma cor afinada contra o preenchimento de repouso desaparece sob o painel de hover, que é por construção o seu oposto; uma paleta que não é keyed a nenhuma das duas superfícies contrasta com ambas.
- **Ajuste de hover no anel**, quinto campo obrigatório no `SwapInvert`: sob painel claro a paleta escurece, com a mesma duração e curva do painel. É o que fecha o único caso em que a paleta ainda perdia contraste (`#FFBE7B` sobre `#ffffff` mede 1,6:1).
- **Calibração de legibilidade**, num fork do componente do registry: `borderWidth` 2px e `backgroundSize` 150%. Com os 300% do registry o elemento vê apenas o terço interior do gradiente, onde a banda acesa não chega — metade do perímetro fica abaixo de 42% de opacidade num traço de 1px.
- **Call site**: `QuoteForm` liga `shine` no `<Button type="submit">`. Nenhum outro CTA do site é alterado.
- **Fixture**: a rota `fixtures/buttons` ganha uma linha com o anel, sobre fundo claro e sobre `bg-primary`, e em combinação com `textSwap`, para a ordenação de camadas ser verificável sem navegar até ao formulário.
- **Excepção de custo ocioso declarada**: o anel é uma animação permanente. Fica explicitamente registado como excepção limitada — CSS declarativo, fora do loop de `requestAnimationFrame` da aplicação, num único elemento, numa única rota — em vez de ficar como um repaint permanente sem explicação para quem auditar o custo ocioso a seguir.

Nenhuma mudança é breaking: a prop é opt-in e o caminho de render de todos os botões existentes fica idêntico.

## Capabilities

### New Capabilities

- `cta-shine-border`: o anel animado como camada opt-in do `Button` — em que caminhos de render existe, como se alinha com a silhueta, como se ordena face às camadas de `textSwap`, que contraste tem de manter, o que faz sob `prefers-reduced-motion`, e o limite do seu custo contínuo.

### Modified Capabilities

- `button-hover-inversion`: o `Button` passa a ter uma camada que a invariante «nenhuma camada iguala o que está atrás dela» ainda não cobre, e que se sobrepõe ao painel de preenchimento. O requisito de camadas e o de botões sem `textSwap` precisam de dizer onde o anel entra — em particular que `shine` é ortogonal a `textSwap` e não arrasta o painel nem a inversão de ícone consigo.
- `idle-runtime-budget`: a capability afirma que ficar ocioso é o estado de repouso. Uma animação CSS infinita não usa `requestAnimationFrame` e portanto não viola nenhum requisito à letra, mas deixa um repaint contínuo que contradiz o princípio se não for declarado. Passa a existir um requisito que nomeia a excepção e fixa os seus limites.

## Impact

**Código**
- `components.json` — caminho de `tailwind.css` corrigido.
- `src/app/(app)/globals.css` — `--animate-shine` no bloco `@theme inline` (junto de `--animate-marquee`) e `@keyframes shine`.
- `src/components/ui/shine-border.tsx` — novo, gerado pelo CLI e depois calibrado (`backgroundSize`). O repo já forka componentes de registry: o `parallax.tsx` e o `scroll-based-velocity.tsx` carregam patches comentados.
- `src/components/Button/index.tsx` — prop `shine`, paleta, camada, ordenação e o quinto campo do `SwapInvert`.
- `src/components/GetQuote/QuoteForm.tsx` — `shine` no botão de submissão.
- `src/app/(app)/[locale]/(pages)/fixtures/buttons/page.tsx` — linha de verificação.

**Dependências** — nenhuma nova entrada em `package.json`. O componente do registry não importa `motion`, nem biblioteca de ícones, nem `@/i18n/navigation`, pelo que as restrições de bundle que `QuoteForm` documenta no seu cabeçalho continuam cumpridas.

**Superfície de verificação** — `fixtures/buttons` (camadas e contraste) e `fixtures/get-quote` (o call site real). Não há test runner no projecto; a verificação é visual nas fixtures, conforme a convenção do repo.

**Risco principal** — a interacção entre `overflow-hidden`, `rounded-full` e um anel a `inset-0`: o pixel exterior pode ser cortado nas curvas da pill e o anel ler-se mais fino nos topos. É o item a olhar primeiro na fixture.
