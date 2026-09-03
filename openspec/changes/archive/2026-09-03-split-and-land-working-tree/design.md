## Context

A árvore contém o resultado de três changes mais ruído que nenhuma reivindica, tudo não commitado, com quatro arquivos carregando hunks de mais de uma origem. O branch está 41 commits à frente de uma `main` parada desde fevereiro, e nunca teve PR.

Duas verificações feitas antes de projetar mudaram o plano, e vale registrar as duas porque cada uma derrubou uma suposição:

**A primeira inverteu o diagnóstico.** A leitura inicial de `git rev-list --left-right --count origin/main...HEAD` foi feita com os lados trocados, e concluiu que o branch estava 41 commits *atrás*. É o contrário: `origin/main` tem zero commits que o branch não tenha. As datas confirmam — `main` em 2026-02-08, branch em 2026-08-25. O branch é a linha viva; `main` é que ficou para trás.

**A segunda liberou a ordem dos commits.** A suposição era que os hunks de performance nos arquivos compartilhados se apoiavam nos hunks das outras duas changes, o que forçaria commitar as outras primeiro. Não é o caso: `.video_shape`, `.services_shape`, as duas linhas de `will-change` (HEAD:289 e HEAD:318) e os internos do `CursorFollower` — `AnimatePresence`, `data-cursor`, `width: size` — **já existem em HEAD**. As alterações de performance incidem sobre código preexistente, não sobre código introduzido pelas outras changes. A ordem histórica é livre.

O que resta é uma restrição de dependência só: `layout.tsx` importa `HydrationSignal`, que hoje é um diretório não versionado. Os dois têm de entrar no mesmo commit, ou o commit não compila.

## Goals / Non-Goals

**Goals:**

- Produzir um histórico em que cada item de performance com ganho medido em `baseline.md` seja revertível isoladamente.
- Tirar todo o trabalho da árvore e colocá-lo no histórico, incluindo o das duas changes incompletas.
- Levar a `main` seis meses de trabalho não revisado, em um PR que alguém consiga de fato revisar.
- Fazer o PR do trabalho novo declarar o que nele ainda não foi verificado com o mesmo destaque dos números que ele apresenta.

**Non-Goals:**

- Mudar qualquer linha de código de aplicação. Se o conteúdo de um arquivo em `src/` diferir do que está na árvore hoje, algo saiu errado.
- Completar as verificações pendentes de `optimize-landing-performance`. Elas seguem sendo tarefas daquela change.
- Resolver a dualidade npm/pnpm ou o experimento `turbopackServerFastRefresh` rejeitado a cada build. Ruído real, natureza diferente, change própria.
- Fazer squash ou reescrever os 41 commits existentes. Eles vão para revisão como estão.

## Decisions

### 1. Dois branches, e o novo é cortado antes de qualquer commit

O PR #1 precisa conter **apenas** os 41 commits. Se o trabalho novo for commitado no branch atual, ele entra no PR #1 e a separação se perde.

```
   76fd568  ←── chore/implementation-openspec-on-codebase  (fica parado aqui)
      │                    └──▶ PR #1 → main
      │
      └──● ● ● ● ● ● ● ● ●  perf/land-performance-work
                            └──▶ PR #2 → main  (após merge do #1)
```

A ordem das operações importa e não é a intuitiva: `git checkout -b` **preserva a árvore de trabalho**, então cortar o branch novo primeiro carrega todas as alterações para ele e deixa o branch original limpo em `76fd568`. Só então o PR #1 pode ser aberto sem risco de arrastar trabalho novo.

**Por que não um branch só.** Seria preciso abrir o PR #1, esperar o merge, e só então commitar — deixando o trabalho fora do histórico durante toda a revisão, que é justamente a janela em que ele se perde.

### 2. Separação de hunk por patch, não por `git add -p`

`git add -p` é interativo e não roda neste ambiente. A separação usa:

```
git diff -- <arquivo>  >  patch          # extrai
<edita o patch: mantém só os hunks de uma origem>
git apply --check --cached patch         # valida ANTES de tocar o índice
git apply --cached patch                 # aplica ao índice
git commit                               # commita só o índice
```

O `--check` antes de cada aplicação é obrigatório, não opcional: um patch que falha pela metade deixa o índice num estado híbrido difícil de diagnosticar.

**Fallback determinístico.** Se os hunks de duas origens ficarem entrelaçados a ponto de o patch não separar de forma confiável — o candidato é `globals.css`, onde as outras changes inserem ~50 linhas na região das linhas 285-338 do HEAD, exatamente onde vivem os `will-change` que esta change remove — o recurso é abandonar patches naquele arquivo e **escrever o conteúdo pretendido do arquivo para aquele commit**, estagiar e commitar. Mais trabalhoso, e imune a deriva de contexto.

### 3. O índice começa zerado

O índice já carrega 20 deleções de `.ttf` staged, resíduo do `git rm` da change de performance. A sequência começa com um `git reset` (mixed): desfaz o índice, preserva a árvore. Os arquivos seguem deletados no disco, o que é o estado desejado — apenas deixam de estar staged antes da hora.

### 4. Verificação de build acontece em worktree descartável

Este é o ponto onde a separação de hunk mais facilmente engana. Depois de `git apply --cached` de um subconjunto, **a árvore de trabalho continua com tudo**. Rodar `next build` ali valida a árvore completa, não o commit — e passaria mesmo com um commit quebrado.

Cada commit é verificado em uma worktree própria:

```
git worktree add /tmp/verify <sha>
cd /tmp/verify && npx next build
git worktree remove /tmp/verify
```

**Custo aceito.** São ~9 builds, e o build limpo deste projeto leva de 6 s a 1 min. É o preço de poder afirmar que cada commit compila, em vez de supor.

**Revisado durante a implementação: a verificação é `tsc --noEmit`, não `next build`.** Uma worktree precisa de `node_modules`, e symlinkar o do repositório principal faz o Turbopack abortar com `Symlink [project]/node_modules is invalid, it points out of the filesystem root`. As saídas seriam copiar `node_modules` por commit (proibitivo) ou instalar por commit (lento demais para nove commits).

`npx tsc --noEmit` funciona com o symlink, roda em segundos, e cobre exatamente o risco que a separação de hunk cria: import órfão, prop removida antes do call site, tipo que deixou de existir. O que ele não cobre — falha de Tailwind, erro específico de build do Next — é mitigado por um `next build` completo na árvore principal ao final da sequência, onde o conteúdo é idêntico ao que já foi construído com sucesso várias vezes durante a change de performance.

### 5. Ordem dos commits: ruído, depois performance, depois trabalho em andamento

```
 1. chore(deps): next 16.2.6 → 16.3.2         package.json + package-lock.json
 2. chore(types): reformata saída do gerador  payload-types.ts
 ────────────────────────────────────────────────────────────────────
 3. perf(icons): ícone como componente        Button Badge + 4 call sites
 4. perf(fonts): Gilroy em 2 pesos, woff2     gilroy.ts + fontes
 5. perf(video): gate por viewport            page.tsx  (hunk do <source>)
 6. perf(runtime): custo por frame            NavBarRoot cursor-glow
                                              CursorFollower globals.css (hunks)
 ────────────────────────────────────────────────────────────────────
 7. wip: prevent-invisible-text (58/60)       layout.tsx template.tsx Hero
                                              reveal text-reveal HydrationSignal/
 8. wip: fix-responsive-content-clipping      globals.css ServicesSection
    (34/49)                                   page.tsx  (hunks restantes)
 ────────────────────────────────────────────────────────────────────
 9. docs(openspec): artefatos + baseline      openspec/
```

Performance vem antes das changes em andamento porque seus hunks incidem sobre código já presente em HEAD, e porque é o trabalho verificado — o histórico fica com o material sólido embaixo e o parcial em cima, onde é mais fácil de continuar ou reverter.

Os commits 3 a 6 espelham exatamente os itens de `baseline.md`, um por um. É essa correspondência que dá sentido ao `git bisect` numa regressão futura.

**O commit 3 não pode ser dividido.** A troca de assinatura de `Button`/`Badge` e os quatro call sites que a consomem viajam juntos; separá-los produz um commit intermediário que não compila.

**O commit 7 não pode ser dividido.** `layout.tsx` importa `HydrationSignal`, hoje não versionado.

### 6. O PR #2 declara a lacuna de verificação no corpo, não em nota de rodapé

A descrição do PR #2 traz a tabela de ganhos medidos — LCP 22,3 s → 4,5 s, TBT 2.030 → 230 ms, peso 11.988 → 497 KiB — e, na mesma altura visual, a lista do que não foi verificado: as conferências visuais do topo da nav, do encaixe dos shapes nos três breakpoints, da nitidez da borda do cursor e do alinhamento do halo, mais o trace de scroll do qual dependem quatro tarefas.

O motivo é que a camada 2 desta entrega está **implementada e não verificada**, e o Lighthouse — que produziu todos os números bonitos — mede carregamento, não scroll sustentado. Apresentar os ganhos sem essa ressalva pede uma aprovação que o trabalho ainda não sustenta.

O PR também informa que duas das três changes estão incompletas, com o progresso de cada uma.

## Risks / Trade-offs

**Patch de `globals.css` não separa limpo** → É o arquivo de maior risco: as outras changes inserem ~50 linhas exatamente na região dos `will-change` que esta remove. Mitigação prevista na decisão 2 — reescrever o conteúdo do arquivo para aquele commit, em vez de insistir no patch.

**Commit intermediário que não compila** → Mitigado pela worktree descartável da decisão 4, que verifica o commit e não a árvore. Os dois casos conhecidos de indivisibilidade (commit 3 e commit 7) estão registrados na decisão 5.

**PR #1 empaca em revisão** → São 41 commits de seis meses; a revisão não será rápida. O trabalho novo fica represado enquanto isso, mas commitado e em branch próprio, portanto seguro. É o preço aceito por PRs de tamanho revisável.

**Commitar trabalho declaradamente incompleto** → As changes 58/60 e 34/49 entram marcadas como em andamento. A alternativa — deixá-las na árvore — é como trabalho se perde, e esta sessão já viu um `git stash pop` falhar por causa de `payload-types.ts` regenerado pelo build.

**A árvore muda de conteúdo durante a operação** → Qualquer build rodado no meio da sequência regenera `payload-types.ts` e suja a árvore. Nenhum build deve rodar na worktree principal enquanto a sequência não terminar; é para isso que serve a worktree descartável.

**`git stash` é armadilha neste repo** → Já falhou uma vez nesta sessão, exatamente por `payload-types.ts` regenerado. A sequência não usa stash em nenhum ponto.

## Migration Plan

```
 0. git reset                        índice zerado, árvore intacta
 1. git checkout -b perf/land-performance-work
                                     árvore carregada para o branch novo;
                                     branch original fica parado em 76fd568
 2. gh pr create  (original → main)  PR #1, só os 41 commits
 3. commits 1 a 9 no branch novo     cada um verificado em worktree
 4. git push                         branch novo
 5. aguardar merge do PR #1
 6. gh pr create  (novo → main)      PR #2, com ganhos E lacunas
```

Rollback: até o passo 4 nada saiu da máquina, e a sequência inteira é desfeita com `git reset --soft 76fd568`, que devolve a árvore ao estado atual. Depois do push, reverte-se por commit — que é justamente o que a granularidade desta change existe para permitir.

## Open Questions

- **O PR #1 deve ser revisado por alguém ou é auto-merge?** São 41 commits de trabalho já feito, num repositório onde `main` está seis meses parada. Se a revisão for pro forma, a sequência ganha muito em latência; se for real, vale avisar quem vai revisar sobre o tamanho antes de abrir.
- **`perf/land-performance-work` é o nome certo para o branch novo?** Ele carrega três changes, não só a de performance. Um nome mais honesto seria `chore/land-working-tree`. Fica para o momento de criar, e é trivial de mudar antes do push.
- **Os artefatos de OpenSpec deveriam ir no PR #1?** Eles descrevem trabalho que está no PR #2, mas `openspec/specs/` e o histórico de `archive/` são contexto que ajuda a revisar ambos. O plano os coloca no #2; mover para o #1 é defensável.
