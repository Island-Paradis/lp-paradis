## 1. Rota e guard

- [x] 1.1 Escolher o segmento de URL — routável, sem colidir com rota existente, sem parecer página de produto. — **`fixtures/footer`**. A árvore de `(app)/[locale]/` tinha só `get-quote/` como segmento, então não há colisão. Resolve a questão aberta 1.
- [x] 1.2 Criar a rota sob `src/app/(app)/[locale]/`, para herdar layout, fontes e CSS da aplicação (D1).
- [x] 1.3 Colocar o guard como **a primeira coisa** no corpo do Server Component: `notFound()` de `next/navigation` quando `process.env.NODE_ENV !== "development"`. Antes de qualquer render, antes de montar qualquer estado (D2).
- [x] 1.4 Confirmar em `npm run dev` que a rota responde 200 e renderiza. — HTTP 200, 6 elementos `footer`, zero erros no HTML.
- [x] 1.5 Confirmar que a rota não é linkada de nenhuma página, menu ou sitemap.

## 2. Os cinco estados

- [x] 2.1 Montar `copyrightText: ""` — cenário "Copyright sem texto authorado". Esperado: o fallback declarado aparece, com o ano.
- [x] 2.2 Montar `cta.primaryButton.label: ""` — cenário "Botão sem rótulo authorado". Esperado: o botão exibe o fallback e segue sendo destino rotulado, nunca uma pílula sem texto.
- [x] 2.3 Montar o global inteiro vazio — cenário "Global inteiro sem conteúdo". Esperado: renderiza sem lançar, com os fallbacks de cada campo, e o layout da página segue íntegro.
- [x] 2.4 Montar `socialLinks: []` — cenário "Nenhum link social authorado". Esperado: nenhum ícone, copyright à esquerda, nenhum espaço reservado vazio à direita.
- [x] 2.5 Montar uma entrada com `platform` fora do mapa de ícones — cenário "Plataforma sem ícone mapeado". Usar qualquer uma das sete opções do select sem ícone (`youtube` é legível na captura). Esperado: o link aparece com o rótulo como texto visível e segue navegável.
- [x] 2.6 **Não** incluir um estado para "CTA sem heading authorado": já está verificado em produção, porque `cta_heading` é `null` e o fallback aparece em todo render (D7). Confirmar que ele não foi adicionado por reflexo.
- [x] 2.7 Confirmar que as props dos cinco estados são literais em código e que nenhuma consulta ao CMS alimenta um estado fabricado.
- [x] 2.8 Confirmar que os cinco usam o `Footer` importado de `@/components/Footer` — o mesmo da aplicação, não uma cópia nem uma variante.

## 3. Tipos

- [x] 3.1 Escrever o cast do estado vazio de forma explícita, com comentário registrando a divergência: o tipo gerado marca `cta` como obrigatório (com `primaryButton.label`, `primaryButton.href`, `outlineButton.label`, `outlineButton.href` também obrigatórios), o banco aceita ausência, e o componente se defende com `cta?.` (D5).
- [x] 3.2 Não fabricar um objeto "quase vazio" que satisfaça o tipo no lugar do vazio real — isso esconderia o achado que o cast expõe.
- [x] 3.3 Confirmar que `npm run build` typecheca a rota sem erro. — Compilou em 12,4s, TypeScript limpo; a rota aparece no manifesto como `ƒ /[locale]/fixtures/footer`.
- [x] 3.4 Não alterar `payload-types.ts`, nem o schema, nem marcar `cta` como opcional no Payload. É decisão de modelagem, com efeito em migração e admin, fora do escopo desta change.

## 4. Rótulos e legibilidade

- [x] 4.1 Rotular cada estado com **duas** metades: o cenário que representa e o resultado esperado (D4). Um rótulo que só nomeia o estado obriga quem lê a captura a saber o spec de cor.
- [x] 4.2 Rotular o footer herdado do `layout.tsx` como o footer **real** da aplicação — o controle, não um sexto estado fabricado (D3).
- [x] 4.3 Documentar na própria página a contagem esperada: cinco footers fabricados mais um herdado do layout.
- [x] 4.4 Deixar um comentário na fixture apontando os cenários de origem em `finish-footer-implementation/specs/footer-content-authority/spec.md`, para que quem mexer no global saiba onde reconferir. É a única mitigação do risco de apodrecimento.
- [x] 4.5 Verificar a legibilidade do jeito certo: capturar a página e conferir se dá para associar cada footer ao seu cenário e julgar o resultado **sem** abrir o código.

## 5. Verificar em desenvolvimento

- [x] 5.1 Conferir os cinco estados na tela, um por um, contra o resultado esperado do seu rótulo.
- [x] 5.2 Contar os elementos `footer` na página: deve dar cinco mais um. — **6**, conforme.
- [x] 5.3 Confirmar que o estado vazio não lança e que o resto da página segue íntegro — é o cenário mais provável de falhar.
- [x] 5.4 Capturar a página como evidência e guardar junto da change.
- [x] 5.5 Registrar qualquer defeito revelado como **achado desta change**, sem editar `src/components/Footer/index.tsx` (D6). Se um estado exigir mudar o componente para renderizar, isso é defeito do componente e é priorizado à parte.
- [x] 5.6 Confirmar que `src/components/Footer/index.tsx` não foi tocado por esta change. — **Confirmado, mas não por `git diff` como a task supunha.** `finish-footer-implementation` também está sem commit na mesma árvore, então `git diff` contra `HEAD` mostra as 202 inserções *daquela* change no arquivo, e não sabe separar as duas. A verificação real é que os únicos arquivos que esta change escreve são `src/app/(app)/[locale]/fixtures/footer/page.tsx` (novo), `CLAUDE.md` (uma linha) e os artefatos em `openspec/changes/verify-footer-edge-cases/`. Para o cenário "componente intocado" ficar verificável por `git diff`, a change anterior precisa ser commitada primeiro — registrado como limitação do instrumento, não como verificação feita.

## 6. Verificar o 404 em produção (não pode ser pulado)

- [x] 6.1 Rodar `npm run build` e `npm run start`, e requisitar a rota. Esperado: **404**, sem nenhum marcador da fixture no corpo. É o requisito com consequência fora do projeto.
- [x] 6.2 Requisitar a URL diretamente, sem vir de link nenhum, e confirmar que continua 404.
- [x] 6.3 Confirmar que nenhum conteúdo da fixture vaza no corpo da 404 — nem parcial, nem atrás de aviso.
- [x] 6.4 Verificar por medida, não por raciocínio, se o `notFound()` corre antes ou depois do `layout.tsx`, e portanto se a 404 de produção dispara as duas consultas de CMS do layout. Resolve a questão aberta 2. Se dispara: aceitar como comportamento de qualquer 404 deste grupo de rotas, e registrar — mover a fixture para fora de `(app)` custaria o controle de D3.
- [x] 6.5 Se a porta 3000 estiver ocupada pelo dev server do usuário, usar outra porta em vez de derrubá-lo.

## 7. Fechamento

- [x] 7.1 Rodar `npm run lint`. A fixture fica em `src/`, portanto **é** coberta pelo Biome — diferente dos scripts em `openspec/`, que o `biome.json` exclui via `"!openspec"`.
- [x] 7.2 Confirmar que o bundle de cliente das rotas reais não cresceu. — **3.589.356 bytes / 72 chunks: idêntico ao número da change anterior. A fixture acrescenta ZERO bytes de cliente.** A fixture não é alcançável em produção, mas confirmar em vez de presumir: a última mudança de footer ensinou que um import inocente pode arrastar 33,6 KB.
- [x] 7.3 Fechar as tasks 4.6, 7.7, 7.8 e 8.5 de `finish-footer-implementation`, apontando a evidência produzida aqui.
- [x] 7.4 Marcar como verificados, naquela change, os cinco cenários de `footer-content-authority` que esta fixture cobre.
- [x] 7.5 **Não** mexer nos outros dez pendentes de `finish-footer-implementation`. Quatro são decisões de conteúdo (`3.3`–`3.6`), dois dependem delas (`4.5`, `5.5`), três perderam a linha de base (`1.1`, `5.7`, `8.4`) e um precisa de credencial de admin (`2.6`). Nada aqui os desbloqueia.
- [x] 7.6 Decidir se o `CLAUDE.md` merece menção à fixture, já que ele hoje afirma que não há infraestrutura de teste. — **Sim.** A linha "No test runner is configured." ganhou a rota, o caminho do arquivo, o guard, e a orientação de acrescentar fixtures ali em vez de puxar um framework de teste. Resolve a questão aberta 4.
- [x] 7.7 Registrar no design as questões abertas que a implementação resolveu: o segmento escolhido (1.1) e a ordem entre guard e layout (6.4).
- [x] 7.8 Rodar `openspec validate verify-footer-edge-cases`.
