## 1. Linha de base antes de mexer

- [ ] 1.1 Capturar o footer atual em `/en`, `/pt`, `/en/get-quote` e `/pt/get-quote`, em 1440px e 390px, como referência do non-goal "footer das outras rotas inalterado". Fazer isto **antes** de qualquer edição — em `finish-footer-implementation` a tarefa equivalente (1.1) ficou por fazer e deixou de ser recuperável, e o non-goal teve de ser verificado por diff de classes em vez de pixels. — **NÃO FEITO: sem automação de browser nesta sessão**, logo não há captura de pixels. Mitigado, e para o efeito deste non-goal mitigado melhor, por 1.2: o HTML do `<footer>` foi capturado nas quatro rotas **antes** de qualquer edição, e um diff literal desse HTML prova ausência de mudança estrutural e de classes com mais precisão que uma comparação visual. O que 1.2 não cobre e uma captura cobriria: regressão puramente visual causada por CSS de fora do componente. Nenhuma folha de estilo é tocada nesta mudança, então o risco residual é baixo mas não é zero
- [x] 1.2 Guardar o HTML renderizado do `<footer>` de `/en` e `/pt` num ficheiro, para diff literal no fim (grupo 8) — Feito, e alargado a seis alvos: `/en`, `/pt`, `/en/get-quote`, `/pt/get-quote` e `/en/fixtures/footer`. Um `<footer>` por rota pública, 6398 bytes, **idêntico nas quatro** — `/en` e `/pt` batem byte a byte, que é a ausência de linha `pt` em `footer_locales` registada em `finish-footer-implementation` 4.5. A fixture traz seis, batendo com a contagem documentada no seu cabeçalho
- [x] 1.3 Gravar em vídeo, ou descrever por escrito, a transição de página entre `/en` e `/en/get-quote`, para comparar com o comportamento pós-slot que a decisão do `template.tsx` altera de propósito. — Feito **por estrutura do DOM em vez de vídeo**, e o resultado corrige o design. A premissa da tarefa era que o footer estaria dentro do `template` e passaria a estar fora. É falsa: no App Router o `template.tsx` fica *entre* o layout e a página, logo `{children}` no layout já é `<Template>{page}</Template>` e o `<Footer>` a seguir é **irmão** do template. Confirmado no HTML de `/en`: o `<div data-reveal>` do template abre no byte 6513 e fecha no 85569, exatamente onde `<footer>` começa. O footer já hoje não reanima; o slot preserva isso. `design.md` e o requisito na spec `route-scoped-footer` foram corrigidos de "alteração a introduzir" para "invariante a preservar"

## 2. Slot de footer, sem faixa nenhuma

Este grupo isola a mudança arquitetural. No fim dele o site tem de estar exatamente como antes — se algo partir, partiu por causa do slot.

- [x] 2.1 Criar `src/app/(app)/[locale]/@footer/default.tsx`: busca `getFooterPayload(locale)` e renderiza `<Footer {...footerData} locale />`. **Primeiro ficheiro do grupo** — sem ele, uma navegação dura para rota não coberta devolve 404
- [x] 2.2 Alterar `src/app/(app)/[locale]/layout.tsx` para aceitar `{ children, footer }` e renderizar `{footer}` na posição onde hoje está `<Footer>`, dentro do `SmoothScroll` e depois de `{children}`
- [x] 2.3 Remover do `layout.tsx` o import de `Footer` e a chamada a `getFooterPayload`; manter `getNavBarPayload` intacto
- [x] 2.4 Anotar no `layout.tsx` por que o footer é um slot e não um filho direto, com o ponteiro para o `default.tsx` como rede de 404
- [x] 2.5 `npm run lint` — Biome limpo nos ficheiros tocados. `npm run lint` sobre o repo inteiro reporta 40 erros e 13 avisos **pré-existentes**, vindos de ficheiros já modificados na árvore de trabalho antes desta mudança; nenhum é destes ficheiros
- [x] 2.6 Carregar `/en` e `/pt` com **recarga completa** e confirmar 200 e um footer — 200 e um `<footer>` em cada
- [x] 2.7 Carregar `/en/get-quote` e `/pt/get-quote` com recarga completa e confirmar 200 e um footer, ainda sem faixa — 200 e um `<footer>` em cada
- [x] 2.8 Carregar as três rotas de fixture (`fixtures/footer`, `fixtures/navbar`, `fixtures/get-quote`) com recarga completa e confirmar 200. Estas são as mais prováveis de cair, por serem as que o slot não nomeia — as três a 200, mais `/pt/fixtures/footer`. `fixtures/footer` traz seis `<footer>`, batendo com a contagem documentada no seu cabeçalho
- [ ] 2.9 Navegar por clique entre `/` e `/get-quote` e confirmar que nunca aparecem dois footers nem nenhum. — **NÃO FEITO: exige browser.** O que ficou provado é o lado do servidor: recarga dura em cada rota devolve exatamente um `<footer>`. A navegação por cliente, que é onde um slot mal resolvido se manifestaria de forma diferente do servidor, não foi observada
- [x] 2.10 Diff do HTML do `<footer>` contra o capturado em 1.2 — tem de ser idêntico — **Byte-a-byte idêntico** nas cinco capturas (`/en`, `/pt`, `/en/get-quote`, `/pt/get-quote`, `/en/fixtures/footer`), depois da correção de 2.11
- [x] 2.11 Comparar a transição de página com 1.3 e registar por escrito a diferença esperada: o footer deixa de reanimar. Confirmar que ele fica visível e legível durante toda a transição, e não invisível — **Esta tarefa apanhou um defeito real, e a premissa dela estava invertida.** O Next aplica o `template.tsx` do segmento a **todos** os slots do layout, não só a `children`. Com o `template.tsx` em `[locale]/`, o slot `@footer` ganhou a sua própria instância do wrapper e o footer passou a sair do servidor dentro de `<div data-reveal style="opacity:0;transform:translateY(12px)">` — invisível até hidratar, o defeito que `prevent-invisible-text` existe para impedir. Não é o footer a "reanimar": é o footer a não aparecer de todo sem JavaScript. Corrigido descendo `template.tsx` e as páginas para um grupo de rota `(pages)/`, que não altera URL nenhuma. Verificado depois: **zero** wrappers `data-reveal` abertos sobre o `<footer>`, e o HTML do footer de volta a byte-a-byte igual à linha de base

## 2b. Grupo de rota `(pages)`, exigido pela correção de 2.11

- [x] 2b.1 Criar `src/app/(app)/[locale]/(pages)/` e mover para lá `page.tsx`, `template.tsx`, `get-quote/` e `fixtures/`. Grupo de rota não altera URL nenhuma
- [x] 2b.2 Corrigir o import absoluto em `src/components/GetQuote/index.tsx`, que aponta para a server action por caminho de rota: `@/app/(app)/[locale]/get-quote/actions` → `@/app/(app)/[locale]/(pages)/get-quote/actions`
- [x] 2b.3 Confirmar por grep que mais nenhum ficheiro importa por caminho de rota — só este importava
- [x] 2b.4 Reverificar as oito rotas a 200 e o diff do footer contra a linha de base
- [x] 2b.5 Registar a correção em `proposal.md`, `design.md` (decisão 1) e no requisito do `template.tsx` da spec `route-scoped-footer`, que passou a ter um cenário para "o footer sai do servidor visível"

## 3. Campos de título no global Footer

- [x] 3.1 Acrescentar a `src/collections/globals/Footer.ts` um grupo `directContact` com `reachHeading` e `socialHeading`, ambos `type: "text"`, `localized: true`, `defaultValue: ""` — Feito, mas o grupo chama-se **`contactBand`** e não `directContact`. A razão apareceu no type-check: o componente recebe uma prop `directContact` com a faixa *resolvida* (títulos com piso, e-mail já buscado), e o grupo do CMS guarda os títulos *crus*. Com o mesmo nome, `PopulatedFooter & { directContact }` exigia as duas formas ao mesmo tempo e nenhum valor as satisfazia. Duas formas diferentes, dois nomes. Registado em comentário nos dois ficheiros
- [x] 3.2 Escrever `admin.description` em cada campo dizendo que a faixa só aparece na página de orçamento, e que o e-mail exibido ao lado vem da coleção `Contact` e não daqui — é a mitigação registada no design para a faixa ter duas fontes
- [x] 3.3 `npx payload generate:types` e confirmar que `payload-types.ts` ganhou o grupo — o grupo e as duas descrições aparecem no tipo gerado, como docblocks
- [ ] 3.4 Abrir `/admin` e confirmar que os dois campos aparecem, são editáveis, e alternam por locale. — **NÃO FEITO: exige browser.** O schema é declarativo e o `generate:types` aceitou-o, mas o render do admin não foi observado — é a mesma limitação registada em `finish-footer-implementation` 2.6

## 4. Ler o e-mail da coleção Contact

- [x] 4.1 Acrescentar `getContactPayload(locale)` a `src/service/payload-functions.ts`, com `find({ collection: "contact", limit: 1, depth: 0 })`, devolvendo o primeiro documento ou `null` quando a coleção está vazia
- [x] 4.2 Comentar por que esta função não passa pelo helper `getGlobal<T>`: é o primeiro fetcher de **coleção** do ficheiro, e os quatro existentes são todos `findGlobal`. Registar que o refactor do helper pertence à mudança que precisar do segundo, não a esta
- [x] 4.3 Justificar no comentário o `limit: 1` (a faixa quer um endereço, não uma lista) e o `depth: 0` (nada do que a faixa lê em `Contact` é relação)
- [x] 4.4 Acrescentar `PopulatedContact` a `src/service/types.ts` — **Não acrescentado, de propósito.** Os tipos `Populated*` existem para trocar relacionamentos `id | objeto` pela forma povoada, e o `Contact` gerado não tem um único campo de relação: `sectionTitle`, `sectionSubtitle`, `email`, `phone`, `address` são escalares e `socialLinks` é um array de campos simples. `PopulatedContact` seria um alias vazio a sugerir um problema que não existe. Em vez dele foi criado `FooterDirectContact`, que é o tipo de que a faixa precisa de verdade — a forma **resolvida** da prop. A ausência está justificada em comentário no `types.ts`
- [x] 4.5 Confirmar por type-check que `Contact.email` é `string` e não localizado, e que o retorno acomoda coleção vazia — `email: string` no `Contact` gerado, sem sufixo de localização; o retorno é `Promise<Contact | null>` e o `docs[0] ?? null` cobre a coleção vazia. `tsc --noEmit` limpo

## 5. A faixa no componente Footer

- [x] 5.1 Definir o tipo da prop `directContact` — e-mail mais os dois títulos já resolvidos — e adicioná-la como **opcional** à assinatura de `Footer`. Sem a prop, o componente renderiza o que renderiza hoje — Feito, com um desvio: os títulos entram **crus**, não resolvidos. O piso é aplicado dentro do componente, que já é onde vivem os pisos da tagline, do heading do CTA e dos rótulos dos botões; resolvê-los no chamador poria metade dos fallbacks do footer num sítio e metade noutro
- [x] 5.2 Acrescentar `SOCIAL_NAMES` ao lado de `SOCIAL_ICONS`, cobrindo as nove plataformas nomeáveis do enum (`dribbble`, `linkedin`, `instagram`, `github`, `twitter`, `facebook`, `youtube`, `discord`, `whatsapp`)
- [x] 5.3 Comentar por que `SOCIAL_NAMES` tem nove entradas e `SOCIAL_ICONS` três: uma string custa bytes, um ícone custa um módulo — é a mesma preocupação de tree-shaking que o comentário existente do `SOCIAL_ICONS` documenta, com resposta diferente porque o custo é diferente
- [x] 5.4 Acrescentar os pisos dos dois títulos ao objeto `FALLBACK` existente
- [x] 5.5 Escrever o subcomponente da pill: âncora com `aria-label={social.label}`, ícone `aria-hidden` quando existe, nome visível de `SOCIAL_NAMES`, `target="_blank"` e `rel="noopener noreferrer"`
- [x] 5.6 Tratar `platform: "other"` — a pill mostra o `label` como texto visível. Comentar que omitir a pill seria o "pior modo de falha possível" que o comentário do `SocialIconLink` já nomeia
- [x] 5.7 Escrever o subcomponente da faixa: grupo de contacto à esquerda (título + e-mail em `mailto:`, sublinhado), grupo de redes à direita (título + pills), `border-b border-white/20` a fechar
- [x] 5.8 Usar o mesmo contentor e as mesmas margens do resto do footer (`container px-4 xl:px-0`), para o e-mail alinhar com o logo
- [x] 5.9 Empilhar em estreito e lado a lado em largo; as pills quebram linha em vez de forçarem rolagem horizontal — `flex-col` → `sm:flex-row sm:justify-between`, e `flex-wrap` na lista de pills. Escrito; **a verificação visual em 390px não foi feita** (ver 9.3)
- [x] 5.10 Renderizar cada grupo de forma independente: sem e-mail, cai o grupo de contacto **com o seu título**; sem redes, cai o grupo de redes com o seu título; sem os dois, cai a faixa inteira **incluindo o divider**
- [x] 5.11 Renderizar a faixa como primeiro filho dentro do `<footer>`, sem tocar em nada abaixo do divider
- [x] 5.12 Confirmar que as pills e os ícones da barra inferior iteram o mesmo array na mesma ordem, sem inversão em nenhum dos dois — as duas listas mapeiam o mesmo `socialLinks`, sem `reverse` nem `sort` em nenhuma
- [x] 5.13 `npm run lint` — Biome limpo em `Footer/index.tsx`

## 6. Ligar a variante do /get-quote

- [x] 6.1 Criar `src/app/(app)/[locale]/@footer/get-quote/page.tsx`: busca o global `footer` e o `Contact`, monta a prop `directContact` e renderiza `<Footer>` com ela — as duas buscas correm em `Promise.all`, por serem independentes
- [x] 6.2 Envolver a busca do `Contact` em `cache` do React, pelo mesmo motivo documentado em `get-quote/page.tsx`
- [x] 6.3 Resolver os dois títulos com o helper `textOr`, para campo vazio ou só-espaços cair no piso — **feito, mas dentro do componente e não aqui.** Ver a nota em 5.1: todos os outros pisos do footer vivem no componente, e separá-los era pior
- [x] 6.4 Passar `directContact` como `undefined` — e não como objeto vazio — quando não há nem e-mail nem títulos, para o componente cair no caminho sem faixa — **resolvido de outra forma, melhor.** O slot passa sempre o objeto; quem decide se a faixa existe é o `showBand` dentro do componente, que já tem de fazer essa avaliação porque a condição depende de `socialLinks`, que o slot não inspeciona. Deixar a decisão nos dois sítios era duplicá-la, e as duas cópias podiam divergir
- [x] 6.5 `npm run lint` — Biome limpo

## 7. Fixture

- [x] 7.1 Acrescentar a `fixtures/footer` os casos da faixa: conteúdo completo, sem e-mail, sem redes, sem nenhum dos dois, e uma rede com `platform: "other"` — seis casos, não cinco: foi acrescentado também "títulos esvaziados no admin", que exercita o piso dos dois títulos com `""` e com só-espaços
- [x] 7.2 Rotular cada caso novo no ecrã, seguindo o padrão dos cinco já existentes
- [x] 7.3 Corrigir o comentário de cabeçalho que diz que o footer real é "herdado do `layout.tsx`" — passa a vir do slot `@footer`. Atualizar a contagem esperada de footers na página — corrigido no comentário de topo, no parágrafo visível e no bloco de controle, que passou de "6. CONTROLE" a "12. CONTROLE"
- [x] 7.4 Confirmar que a guarda `NODE_ENV !== "development"` continua a ser a primeira instrução do corpo do componente — inalterada, continua antes de tudo
- [x] 7.5 Carregar `/en/fixtures/footer` e confirmar que cada caso novo se comporta como a spec descreve — **verificado no HTML renderizado**, doze footers, um por linha: 1–5 sem faixa; 6 faixa completa com `mailto:geral@paradis.host`, três pills e os dois títulos; 7 sem e-mail, o grupo de contacto some **com o seu título** e as pills ficam; 8 sem redes, o grupo social some com o título `Elsewhere` e o e-mail fica; 9 sem nenhum dos dois, **faixa ausente**; 10 títulos `""` e `"   "` caem nos dois pisos; 11 a pill de `platform: "other"` renderiza com o `label` visível ao lado das três normais; 12 controle sem faixa
- [x] 7.6 Confirmar que o caso "sem e-mail e sem redes" não deixa divider sobrando — o caso 9 não tem `border-b border-white/20` em lado nenhum: a faixa cai inteira, divider incluído

## 8. Conteúdo no CMS

**Nenhuma tarefa deste grupo foi feita, e nenhuma podia ser.** Todas escrevem conteúdo no Postgres em `185.255.131.183`, que é uma base **partilhada e remota**, não um banco descartável local. Criar ou editar conteúdo lá é decisão do dono do conteúdo, não efeito colateral de uma implementação. O código está pronto para todas elas e degrada corretamente enquanto não forem feitas — o que ficou provado contra a base real, não só contra a fixture.

- [ ] 8.1 Authorar `directContact.reachHeading` e `directContact.socialHeading` em `en` **e** em `pt`. — Pendente. Sem isto os dois títulos caem no piso em código, que está em inglês nas duas rotas. É a causa direta de 9.2 falhar hoje
- [ ] 8.2 Confirmar que existe um documento em `Contact` com `email` preenchido, e que é o endereço correto. — **A coleção `Contact` tem ZERO documentos**, confirmado em `/api/contact` (`totalDocs: 0`). Por isso o e-mail não aparece hoje em `/get-quote`: o grupo de contacto da faixa cai inteiro, com o seu título, exatamente como o cenário "Coleção Contact vazia" da spec exige. O cenário ficou verificado contra a base real sem que ninguém tivesse de apagar nada
- [ ] 8.3 Authorar a terceira rede social, **Dribbble** — `finish-footer-implementation` 3.5 regista que falta, e o mockup mostra-a nos dois sítios do footer. — Pendente, e confirmado: `/get-quote` renderiza **duas** pills, LinkedIn e Instagram. O mockup mostra três
- [ ] 8.4 Authorar o `label` em `pt` das redes que só o têm em `en`, também pendente de 3.5. — Pendente. Os `aria-label` renderizados em `/pt` são os ingleses (`Paradis Labs LK`, `Paradis Labs Instagram`) — e `Paradis Labs LK` parece ser um valor de teste por acabar, não um rótulo final
- [ ] 8.5 Confirmar que existe linha `pt` em `footer_locales`. Sem ela o `fallback: true` serve inglês em `/pt`, que é a causa-raiz registada em `finish-footer-implementation` 4.5. — Pendente, e reconfirmado por medição: o `<footer>` de `/pt` é **byte a byte igual** ao de `/en`, 6398 bytes, e o de `/pt/get-quote` igual ao de `/en/get-quote`, 8276 bytes

## 9. Verificação

- [ ] 9.1 Carregar `/en/get-quote` a 1440px e comparar com o mockup: alinhamento do e-mail com o logo, pills à direita, divider, e nada abaixo do divider alterado. — **NÃO FEITO: exige browser.** O que foi verificado no HTML: a faixa usa o mesmo `container px-4 xl:px-0` do bloco do logo, o que é a condição do alinhamento pedido, e o divider existe. A conferência de pixels contra o mockup continua por fazer, e é a maior lacuna desta implementação
- [ ] 9.2 Carregar `/pt/get-quote` e confirmar que **nenhuma** string em inglês aparece na faixa, exceto os nomes de marca. É a tarefa 10.3 de `add-get-quote-page` aplicada a este território. — **FEITO, E FALHA HOJE.** `/pt/get-quote` mostra `Elsewhere` em inglês. Não é defeito do código: é o piso a funcionar como desenhado sobre conteúdo que não existe. Duas causas, ambas do grupo 8 — os campos não estão authorados (8.1) e não há linha `pt` em `footer_locales` (8.5). Reverificar depois de 8.1 e 8.5; até lá o requisito de localização da spec **não está satisfeito em produção**, ainda que a fiação esteja correta
- [ ] 9.3 Carregar `/en/get-quote` e `/pt/get-quote` a 390px e confirmar que nada transborda e que as pills quebram linha. — **NÃO FEITO: exige browser.** As classes estão lá (`flex-col` → `sm:flex-row`, `flex-wrap` nas pills), mas classe escrita não é layout observado
- [x] 9.4 Diff final do HTML do `<footer>` de `/en` e `/pt` contra 1.2 — tem de continuar idêntico depois de tudo — **byte a byte idêntico**, 6398 bytes em ambos, contra a captura feita antes da primeira edição
- [ ] 9.5 Comparar as capturas de `/en` e `/pt` com 1.1, a 1440px e 390px. — **NÃO FEITO**, por 1.1 não existir. Substituído pelo diff literal de HTML em 9.4, que é mais preciso para estrutura e classes e cego para pixels
- [ ] 9.6 Clicar o e-mail e confirmar que abre o cliente de correio com o endereço certo. — **NÃO FEITO**, e hoje não é possível: sem documento em `Contact` não há e-mail para clicar. O `href="mailto:…"` foi verificado no caso 6 da fixture
- [ ] 9.7 Clicar cada pill e confirmar destino correto em nova aba. — **NÃO FEITO: exige browser.** O markup foi verificado: `href` da rede, `target="_blank"`, `rel="noopener noreferrer"`
- [x] 9.8 Inspecionar as pills com leitor de ecrã, ou pela árvore de acessibilidade, e confirmar que o nome anunciado é o `label` e não o nome visível, e que o ícone não é anunciado — Feito **pelo markup**, que é o que determina a árvore: `aria-label="Paradis Labs on Instagram"` na âncora, texto visível `Instagram`, e `aria-hidden="true"` no `<svg>`. Nenhum leitor de ecrã foi executado
- [x] 9.9 Recarga completa em `/en`, `/pt`, `/en/get-quote`, `/pt/get-quote` e nas três fixtures — todas 200. Repetir a verificação de 2.8, porque o slot ganhou uma folha desde então — oito rotas, todas 200, em servidor reiniciado do zero
- [x] 9.10 Contar as queries de um request a `/en` e confirmar que `contact` não é buscado — Verificado **estruturalmente**, não por contador: `getContactPayload` tem exatamente um importador em todo o `src/`, que é `@footer/get-quote/page.tsx`. `/en` cai em `@footer/default.tsx`, que não o conhece. Nenhum contador de queries foi instrumentado
- [x] 9.11 Contar as queries de um request a `/en/get-quote` e confirmar `footer` uma vez e `contact` no máximo uma vez — Mesma verificação estrutural: um só chamador de cada, e o `cache` do React cobre a hipótese de o request voltar a pedir o `Contact`
- [x] 9.12 `npm run build` e confirmar que passa — passa, TypeScript incluído. **As cinco rotas saem com as URLs de sempre** (`/[locale]`, `/[locale]/get-quote`, `/[locale]/fixtures/*`), o que confirma que o grupo `(pages)` não mexeu no encaminhamento
- [x] 9.13 Inspecionar o chunk de cliente de `/get-quote` e confirmar que nenhum módulo novo do runtime ICU do `@formatjs` entrou por causa do footer — nenhum chunk em `.next/static/chunks/` contém `clonePosition` nem `bumpSpace`, os marcadores que o comentário de `localizedHref` nomeia
- [x] 9.14 Confirmar por grep que nem `Footer/index.tsx` nem os dois ficheiros do slot contêm `"use client"` — zero ocorrências nos três

## 10. Fecho

- [x] 10.1 `npm run lint` limpo — **limpo em todos os ficheiros desta mudança.** Sobre o repo inteiro não fica: já havia 40 erros e 13 avisos antes desta mudança, em ficheiros modificados na árvore de trabalho por trabalho anterior. Apareceu ainda um erro de formatação em `src/components/GetQuote/index.tsx` — linhas em branco dentro da assinatura da função — introduzido por edição concorrente do ficheiro **durante** esta sessão, não por esta mudança; deixado por tocar, para não colidir com quem o está a editar. A única linha que esta mudança alterou nesse ficheiro é o import da server action
- [x] 10.2 Rever os comentários novos: cada um explica uma decisão ou um custo medido, nenhum descreve o que a linha abaixo já diz
- [x] 10.3 Responder, ou registar como não respondidas, as Open Questions do design — ordem das pills, socials duplicados, `mailto:`, comportamento em estreito — ver o grupo 11 abaixo
- [x] 10.4 Anotar neste ficheiro qualquer tarefa que ficou por fazer, com o motivo, em vez de a marcar feita — feito em toda a lista

## 11. Open questions no fim da implementação

- [ ] 11.1 **Ordem das pills vs. ícones.** Implementado como o design decidiu: os dois sítios seguem a ordem do array do CMS, e a inversão do mockup foi tratada como ruído de Figma. Verificado no HTML — pills e barra inferior saem ambas `instagram, linkedin, dribbble`. **Continua por confirmar com quem desenhou.** Se for intencional, é uma linha
- [ ] 11.2 **Socials duplicados no mesmo footer.** A faixa e a barra inferior mostram as mesmas redes. Implementado como o mockup mostra. Por confirmar que não é sobra de iteração do Figma
- [x] 11.3 **Destino do e-mail.** Assumido `mailto:` e implementado assim; o sublinhado do mockup suporta a leitura e nada a contradiz
- [x] 11.4 **Comportamento em ecrã estreito.** Assumido o mesmo tratamento da barra inferior — empilhar, com as pills a quebrar linha — e implementado assim. A decisão está tomada; a **observação** em 390px é que falta (9.3)
