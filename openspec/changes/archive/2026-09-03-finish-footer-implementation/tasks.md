## 1. Linha de base

- [ ] 1.1 Capturar o footer **antes** da mudança, em `/en` e `/pt`, desktop e estreito, como imagem de referência para o non-goal "sem redesenho". — **NÃO FEITO, e não é mais recuperável.** No momento em que a captura teria valor o código já estava alterado, e reverter a árvore com o dev server do usuário em uso não vale o incômodo. Existem capturas do **depois** nos quatro cenários (grupo 11), mas um "depois" sem "antes" não compara. O non-goal ficou verificado por diff de classes utilitárias.
- [x] 1.2 Registrar no admin quais campos do global `footer` já têm valor em cada locale. — Feito por leitura **somente-leitura** do Postgres; resultado em `baseline.md`. Cinco achados alteram premissas da change.
- [x] 1.3 Medir o first-load JS da rota e guardar o número. — O Next 16 com Turbopack não imprime a tabela de first-load JS, e não existe `app-build-manifest.json` para recortar por rota. Substituto declarado: 72 chunks / **3.589.441 bytes** em `.next/static`. Determinístico (dois builds limpos, mesmo byte).
- [x] 1.4 Confirmar que o `Footer` não tem `"use client"` e que os CTAs não usam `textSwap`/`trailingIcon` — premissa de D4. — Confirmado. A conclusão de que "`asChild` é suportado pelo `Button`" estava certa quanto à assinatura e **errada quanto ao comportamento**: o caminho quebrava com HTTP 500 e nenhuma verificação estática pegaria isso. Ver o grupo 10.

## 2. Schema do campo novo

- [x] 2.1 Acrescentar `socialLinks` ao `Footer` global: `array` com `platform` (select, required), `url` (text, required) e `label` (text, required, localizado).
- [x] 2.2 Incluir `dribbble` nas opções de `platform`. A lista do `Contact` não foi tocada.
- [x] 2.3 Escrever `admin.description` explicando que `label` é nome acessível e que a ordem de authoring é a ordem de render.
- [x] 2.4 Rodar `npx payload generate:types` e inspecionar o diff. — 35 linhas, **exclusivamente** `socialLinks` em `Footer` e `FooterSelect`. Nada de outras changes vazou.
- [x] 2.5 Verificar se `PopulatedFooter` precisa mudar. — **Não precisa**, D8 confirmado: `socialLinks` é array de escalares, passa direto pelo `Omit<Footer, "logo">`. Nada acrescentado ao `Populated*`.
- [ ] 2.6 Abrir `/admin` e confirmar que o campo aparece e é editável por locale. — **NÃO FEITO.** Exige browser. O schema é declarativo e `generate:types` aceitou; o render do admin não foi observado.

## 3. Conteúdo no admin (~~bloqueia o grupo 6~~ — não bloqueia)

**Grupo não executado por decisão explícita.** O `DATABASE_URL` aponta para um Postgres remoto (`185.255.131.183/paradis-lp`); authorar ali é escrita em conteúdo de produção. **Nenhuma escrita foi feita no banco** — só leituras. As tasks abaixo ficam para quem tem essa autoridade.

- [x] 3.1 Marcar `isExternal` em `Kitenda` e `DP Angola`. — **Já satisfeito em dado.** `Kitenda` e `Ficha Segura` (que ocupa o lugar de `DP Angola` no banco) são `true` nos dois grupos. A premissa contrária, escrita no design, estava errada.
- [x] 3.2 Confirmar `isExternal` desmarcado nos links internos. — **Confirmado**: os seis internos são `false`.
- [ ] 3.3 Authorar `cta.heading`, `cta.primaryButton` e `cta.outlineButton` em `en` e `pt`. — Pendente. `cta_heading` é `null` hoje, então o fallback do código é que aparece.
- [ ] 3.4 Authorar `copyrightText` em `en` e `pt`, sem o ano. — Pendente. Já existe em `en`; falta `pt`.
- [ ] 3.5 Authorar as três entradas de `socialLinks`. — **Parcial, e não por mim**: LinkedIn e Instagram foram authorados no admin durante a sessão e já renderizam. **Falta o Dribbble**, que o mockup mostra. Falta também o `label` em `pt` para os dois existentes.
- [ ] 3.6 Trocar os dois `href` de CTA, que hoje valem `#`, por destinos reais. — Pendente. Os CTAs já são âncoras; apontam para `#` porque é o que está authorado.

## 4. Fiação do CTA e do copyright

- [x] 4.1 Ler `cta.heading` no lugar do literal, com o literal como fallback declarado.
- [x] 4.2 Ler os dois rótulos de botão do global, com os literais como fallback.
- [x] 4.3 Ler `copyrightText`, mantendo o ano em runtime na ordem `©` + ano + texto.
- [x] 4.4 Tratar string vazia e não só `null` — `textOr()` usa `value?.trim() ? value : fallback`, porque `"" ?? x` devolve `""`.
- [ ] 4.5 Verificar em `/pt` e `/en` que os quatro campos exibem textos distintos. — **NÃO VERIFICÁVEL AINDA**, e não por falta de código: não existe linha `pt` em `footer_locales`, então com `fallback: true` o `/pt` serve inglês — confirmado no HTML renderizado, os dois locales exibem texto idêntico. Só verificável depois de 3.3/3.4. **A fiação em si está provada**: `copyrightText` foi editado no admin durante a sessão ("Paradis.Labs" → "Paradis Labs") e a mudança apareceu na página.
- [x] 4.6 Esvaziar cada campo e confirmar o fallback. — Verificado pela fixture de `verify-footer-edge-cases` (`/en/fixtures/footer`), com props fabricadas e **sem nenhuma escrita no banco**. Evidência: `openspec/changes/verify-footer-edge-cases/verify/fixture-en.png`. `copyrightText: ""` renderiza o fallback `"Paradis.Labs - All rights reserved."` (com o ponto), distinguível do valor fabricado `"Paradis Labs"` (sem ponto) — é essa diferença que prova o tratamento de string vazia. `cta.primaryButton.label: ""` renderiza `"Get Quote - For Free"`. O caminho também é exercitado de graça em produção por `cta_heading` estar `null`.
- [x] 4.7 Confirmar que não resta texto voltado ao usuário escrito no JSX. — Confirmado por leitura: todo texto sai de `textOr(...)` ou de `FALLBACK`.

## 5. CTAs viram destinos de navegação

- [x] 5.1 Trocar os dois `<Button>` por `Button asChild` envolvendo o destino, com `href` vindo do global.
- [x] 5.2 Escolher o elemento pela forma do `href`: relativo recebe prefixo de locale, o resto vira âncora nativa.
- [x] 5.3 Preservar `variant`, `className="w-full"` e `xl:min-w-74`. Nenhuma classe de aparência alterada.
- [x] 5.4 Confirmar no DOM que os CTAs são âncora com `href`, não `<button>`. — **Confirmado no HTML renderizado** de `/en` e `/pt`: `<button>` no footer = **0 ocorrências**; os dois CTAs são `<a href="#">`. Só foi possível depois de D10.
- [ ] 5.5 Testar navegação por clique. — **NÃO TESTADO** (exige browser). Os dois `href` valem `#`, então o teste só é significativo depois de 3.6.
- [x] 5.6 Testar teclado (`Tab` + `Enter`) e foco visível. — **Testado com `Tab` real** (`Input.dispatchKeyEvent`, não `.focus()`): os dois CTAs recebem foco na ordem do DOM, ambos com `:focus-visible` verdadeiro. `Enter` não foi disparado porque os `href` valem `#` e navegar para `#` não prova nada.
- [ ] 5.7 Comparar os CTAs com a captura de 1.1. — **NÃO COMPARADO.** Existem capturas do estado **depois**, mas não do antes: 1.1 não foi feita e não é mais recuperável sem reverter o código com o dev server do usuário rodando. O non-goal "sem redesenho" ficou verificado por diff de classes (nenhuma classe de variante, cor ou tipografia mudou), não por pixels.

## 6. Semântica de link interno versus externo

- [x] 6.1 Confirmar que 3.1 está feito antes de começar. — Confirmado na linha de base; o grupo nunca esteve bloqueado.
- [x] 6.2 Tornar `target="_blank"` e `rel="noopener noreferrer"` condicionais em `isExternal`, removendo a aplicação incondicional.
- [x] 6.3 Renderizar a seta apenas para externos, com `aria-hidden` para não entrar no nome acessível. — `ArrowUpRight` do lucide, `aria-hidden="true"`.
- [x] 6.4 Usar o prefixo de locale no caminho interno e âncora nativa no externo. — Feito, mas **não** com o `Link`/`getPathname` de `@/i18n/navigation`: os dois arrastam o runtime de cliente do next-intl (+33,6 KB). Ver o comentário em `localizedHref` e a nota no design.
- [x] 6.5 Verificar que um link interno navega para a rota prefixada em cada locale. — **Confirmado no HTML renderizado**: `/en`, `/en#products`, `/en#services` em `/en`; `/pt`, `/pt#products`, `/pt#services` em `/pt`. Os `href` que são só `#` saem intactos nos dois. (O Next normaliza `/en/#products` para `/en#products`, que é equivalente e mais limpo.)
- [x] 6.6 Verificar que os dois externos abrem em nova aba, com `rel`, e exibem a seta. — **Confirmado**: as 4 âncoras externas (Kitenda e Ficha Segura, nos dois grupos) têm `target="_blank"` e `rel="noopener noreferrer"`, e cada uma contém um `lucide-arrow-up-right` com `aria-hidden="true"`.
- [x] 6.7 Verificar que nenhum link interno tem `target="_blank"`. — **Confirmado**: as 6 âncoras internas não têm `target` nem `rel` nem SVG de seta.
- [x] 6.8 Confirmar que URL externa não recebe prefixo de locale. — **Confirmado** em `/pt`: as 4 URLs externas saem absolutas e inalteradas.
- [x] 6.9 Confirmar que o nome de `Kitenda` é `Kitenda`, sem o glifo. — **Confirmado pelo nome acessível computado pelo próprio Chrome** (`Accessibility.getPartialAXTree`): `role=link`, `name="Kitenda"`. Não é inferência a partir do HTML — é o valor que a tecnologia assistiva recebe. Nenhum dos 14 links do footer tem nome vazio ou ignorado.

## 7. Ícones sociais na barra inferior

- [x] 7.1 Criar o registro `platform → ícone` com imports nomeados de `lucide-react`. — `Dribbble`, `Linkedin`, `Instagram` nomeados; nenhum `import * as`; verificado que a assinatura de path do Dribbble **não** aparece em `.next/static`.
- [x] 7.2 Renderizar um link por entrada, à direita da barra inferior, na ordem de authoring.
- [x] 7.3 Aplicar `aria-label` a partir de `socialLinks[].label` e marcar o SVG como decorativo.
- [x] 7.4 Dar `target="_blank"` e `rel="noopener noreferrer"` a cada link social.
- [x] 7.5 Tratamento de reserva de D3: plataforma fora do mapa renderiza o `label` visível e segue navegável.
- [x] 7.6 Ajustar a barra inferior para dois filhos e decidir o comportamento estreito. — **Decidido: empilha, e verificado no browser.** Em 1440px os dois filhos ficam em linha; em 390px o `ul` cai abaixo do `span` (y=909 → y=945, ambos x=16). Resolve a questão aberta 2 do design.
- [x] 7.7 Verificar com `socialLinks` vazio que nada renderiza à direita. — Verificado pela fixture de `verify-footer-edge-cases` (`/en/fixtures/footer`), com props fabricadas e **sem nenhuma escrita no banco**. Evidência: `openspec/changes/verify-footer-edge-cases/verify/fixture-en.png`. Com `socialLinks: []`: nenhum ícone social (o único `<svg>` do footer é a seta do link externo), copyright sozinho à esquerda, nada à direita. Não foi preciso remover o conteúdo authorado.
- [x] 7.8 Verificar com plataforma não mapeada. — Verificado pela fixture de `verify-footer-edge-cases` (`/en/fixtures/footer`), com props fabricadas e **sem nenhuma escrita no banco**. Evidência: `openspec/changes/verify-footer-edge-cases/verify/fixture-en.png`. Com `platform: "youtube"`: nenhum ícone, e o rótulo `"Paradis Labs on YouTube"` aparece como texto visível dentro de uma âncora navegável. A página não quebra.
- [x] 7.9 Testar teclado nos links sociais. — **Testado com `Tab` real**: os dois links sociais authorados recebem foco, na ordem em que aparecem, com `:focus-visible` verdadeiro.
- [x] 7.10 Confirmar o anúncio de cada ícone. — **Confirmado pelo nome acessível computado pelo Chrome**: `name="Paradis Labs LK"` e `name="Paradis Labs Instagram"`, exatamente os `label` authorados. O `<svg aria-hidden="true">` não contribui nome concorrente.

## 8. Fechamento e verificação de não-regressão

- [x] 8.0 Renderizar a página e conferir o HTML. — **Não estava no plano, e foi o que achou o defeito do grupo 10.** O dev server do próprio usuário estava servindo o código na porta 3000; `GET /en` e `GET /pt` foram lidos por HTTP, sem escrever nada. Build limpo e Biome limpo não bastaram: o primeiro `GET /en` deu **HTTP 500**.
- [x] 8.1 Confirmar que o `Footer` continua sem `"use client"`. — Confirmado: zero ocorrências.
- [x] 8.2 Inspecionar os imports: ícones por import nomeado, nenhum namespace importado ou indexado em runtime. — Confirmado nos 8 imports do arquivo. A única ocorrência de `import * as` no arquivo está dentro de um comentário.
- [x] 8.3 Comparar o bundle de cliente com 1.3. — **3.589.441 bytes, idêntico ao baseline byte a byte.** Crescimento zero, melhor que o "compatível com três SVGs" que o requisito pedia. Ver a seção abaixo: chegar nesse número exigiu descartar duas implementações.
- [ ] 8.4 Comparar o footer com as capturas de 1.1. — **NÃO COMPARADO** por falta do "antes" (ver 5.7). O que **foi** verificado: capturas do depois nos quatro cenários, e que o footer não transborda em nenhum (1425px de largura em viewport de 1440; 390 em 390). Nenhuma classe de grid, cor ou tipografia mudou no diff; a única alteração de layout é a barra inferior virar `justify-between`, exigida pelo conteúdo novo.
- [x] 8.5 Renderizar com o global vazio e confirmar que não lança erro. — Verificado pela fixture de `verify-footer-edge-cases` (`/en/fixtures/footer`), com props fabricadas e **sem nenhuma escrita no banco**. Evidência: `openspec/changes/verify-footer-edge-cases/verify/fixture-en.png`. Com o global `{}`: renderiza sem lançar, sem colunas de links e sem ícones sociais, com os fallbacks de cada campo e os dois CTAs caindo em `href="#"`. O resto da página permanece íntegro. O objeto vazio exigiu cast explícito, porque o tipo gerado marca `cta` como obrigatório — divergência registrada em D5 daquela change.
- [x] 8.6 Rodar `npm run lint`. — Limpo nos três arquivos que esta change toca. **`npm run lint` no repositório inteiro falha com 43 erros e 13 avisos pré-existentes**, em arquivos que esta change não toca (`src/service/types.ts`, `biome.json` e os demais já modificados na árvore de trabalho). Não foram corrigidos: são de outra change.
- [x] 8.7 Registrar no design o que a implementação resolveu. — Feito: questão aberta 2 resolvida em 7.6; D8 confirmado em 2.5; risco central retirado e dois riscos novos registrados; plano de migração reordenado.
- [x] 8.8 Rodar `openspec validate finish-footer-implementation`.

## 9. O achado de bundle (não estava no plano)

Não previsto pelo design, e o item que consumiu mais tempo. Registrado porque a conclusão é reutilizável.

- [x] 9.1 Medir a primeira implementação, que usava o `Link` de `@/i18n/navigation` para links internos. — **+33.690 bytes** de JS de cliente (3.589.441 → 3.623.131).
- [x] 9.2 Atribuir o crescimento. Três hipóteses testadas, as duas primeiras erradas:
  - *`Link` do next-intl ser Client Component* — **errada**. Trocar por `getPathname` + `next/link` deu **exatamente** os mesmos 3.623.131 bytes.
  - *Ícones do lucide vazando para o cliente* — **errada**. A assinatura de path do Dribbble (`M19.13 5.09`) e do `arrow-up-right` (`M7 7h10v10`) não aparece em nenhum chunk.
  - *O campo novo do schema arrastando UI do admin* — **quase nada**: 221 bytes dos 33.690.
- [x] 9.3 Localizar o custo por diff de chunk. Os nomes são hasheados por conteúdo, então a comparação foi por conjunto: **um único chunk foi de 34.259 para 67.909 bytes**. Ele contém o Lenis (`animatedScroll`, `targetScroll`) e passou a conter também `clonePosition`, `bumpSpace`, `numeric` — o parser ICU do `@formatjs`, ou seja, o runtime de cliente do next-intl.
- [x] 9.4 Concluir a causa: **importar qualquer coisa de `@/i18n/navigation` a partir do footer** puxa esse runtime. `Link` e `getPathname` saem do mesmo módulo, o que explica os dois números idênticos.
- [x] 9.5 Corrigir montando o prefixo à mão e recebendo `locale` por prop do layout, sem nenhum import de next-intl no footer. Resultado: **3.589.441 bytes, idêntico ao baseline**. O custo da correção é o acoplamento ao `localePrefix: "always"`, documentado no código e no design.

## 10. O conserto do `asChild` do `Button` (não estava no plano)

O design decidiu explicitamente **não** tocar o `Button` ("mexer no componente compartilhado para um caso que ninguém pediu amplia o raio de impacto sem motivo"). A decisão caiu porque a premissa em que se apoiava era falsa. Ver D10.

- [x] 10.1 Renderizar e observar o defeito. — `GET /en` → **HTTP 500**: `Slot failed to slot onto its children. Expected a single React element child or Slottable.` Build limpo e lint limpo não pegaram nada disso.
- [x] 10.2 Diagnosticar. — O `Comp` do `Button` recebia dois filhos: o `span` de `invert` e os `children`. Com `asChild`, `swap` é `false`, logo `invert` é `undefined` e o `span` não renderiza nada — **mas continua contando como um segundo slot de filho**, e o Slot do radix exige exatamente um.
- [x] 10.3 Registrar por que nunca apareceu. — **Nenhum call site usava `asChild`.** O footer é o primeiro. A capacidade que D4 tratou como pronta existia na assinatura e não no comportamento; o comentário em `Button/index.tsx:166` já descrevia a regra que o código violava.
- [x] 10.4 Corrigir movendo o `span` de `invert` para dentro do ramo não-`asChild`, de modo que o ramo `asChild` entregue um único filho.
- [x] 10.5 Confirmar que os outros call sites não regridem. — O ramo não-`asChild` ganhou só um Fragment, que não altera o DOM. `/en` e `/pt` voltaram a **HTTP 200** com a página inteira renderizando.
- [x] 10.6 Medir o efeito no bundle. — **3.589.356 bytes: 85 bytes MENOS que o baseline** de 3.589.441. O conserto não custou nada.
- [x] 10.7 Registrar o que segue sem conserto. — `textSwap` continua silenciosamente ignorado quando `asChild` está setado (`swap = textSwap && !asChild`). É a limitação que o risco original descrevia, mantida de propósito: nenhum call site pede as duas coisas juntas.

## 11. Verificação no browser (não estava no plano)

A verificação desta change foi decidida como "código + build". Isso se mostrou insuficiente no grupo 10 — build, TypeScript e Biome passaram todos enquanto a página devolvia HTTP 500. Este grupo fecha as tasks que pediam um browser, com o harness em `scripts/verify-footer.mjs` (CDP puro, mesma abordagem de `cut-sustained-runtime-cost/scripts/`). Só faz GET e lê o DOM; **não escreve no banco**.

- [x] 11.1 Escrever o harness: 2 viewports (1440×900, 390×844) × 2 locales, com recorte do footer, nome acessível por link, ordem de foco com `Tab` real, e geometria da barra inferior.
- [x] 11.2 Capturas dos quatro cenários em `verify/footer-{locale}-{viewport}.png`, com o relatório em `verify/report.json`.
- [x] 11.3 Nomes acessíveis computados pelo Chrome para os 14 links. Nenhum vazio, nenhum ignorado. Os CTAs aparecem como `role=link` — não `button` — com os rótulos do CMS.
- [x] 11.4 Ordem de foco com `Tab` real: todos os links do footer recebem foco na ordem do DOM, com `:focus-visible` verdadeiro. (O relatório lista 12 entradas para 14 âncoras porque a chave de deduplicação é `tag|href|label`, e `Kitenda`/`Ficha Segura` aparecem em dois grupos com href e rótulo idênticos.)
- [x] 11.5 Geometria da barra inferior: em linha em 1440px, empilhada em 390px. Fecha 7.6.
- [x] 11.6 Sem transbordo horizontal: footer com 1425px em viewport de 1440, e 390px em 390.

### 11.7 Um erro meu, e a correção

- [x] 11.7 Na primeira versão o harness rolava até o footer e fotografava no mesmo tick. As imagens do footer são `next/image`, portanto `loading="lazy"`, e ainda não tinham buscado — o logo saiu ausente da captura. **Concluí daí que o SVG do logo estava quebrado, e isso estava errado.** O teste isolado que usei para "confirmar" reforçou o erro: carregava a imagem a partir de uma página `data:`, cuja origem opaca bloqueia a requisição, devolvendo o mesmo `naturalWidth: 0` de uma falha real. O que desfez o engano foi medir na página de verdade, mesma origem: ali `currentSrc` estava **vazio** — "ainda não buscou", não "falhou" —, o logo do header carregava normalmente (134×25), e as 15 imagens ditas quebradas eram simplesmente as que estavam abaixo da dobra. Corrigido esperando `complete && naturalWidth > 0` antes de medir e fotografar. O logo aparece nas capturas. **Nenhum defeito de logo existia; o defeito era do harness.**

### 11.8 Achados fora do escopo desta change

- [x] 11.8 Registrados, não consertados:
  - **Hydration mismatch em `<html className="js">`.** O `REVEAL_FAILSAFE_SCRIPT` de `layout.tsx` adiciona a classe antes da hidratação, e o React reclama do atributo divergente. É da change `prevent-invisible-text`, que ainda está em progresso — não desta.
  - **Aviso de LCP no logo do header** (`/cdn/logo-1.svg` pede `loading="eager"`). Pré-existente, pertence a `optimize-landing-performance`.
  - **A linha principal do footer não empilha em 390px.** O `flex flex-row gap-10` que envolve as colunas de links e o bloco de CTA é anterior a esta change e foi preservado intacto — em telas estreitas os dois ficam lado a lado e apertados. É exatamente o assunto de `fix-responsive-content-clipping`. Esta change só mudou a barra **inferior**, que é o que o conteúdo novo exigia.
