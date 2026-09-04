## 1. Preparação

- [x] 1.1 Confirmar que nenhum servidor `next start` e nenhum build estão rodando, para que a árvore não mude no meio da sequência
- [x] 1.2 Registrar o estado de partida: `git status --short`, `git diff --stat`, `git rev-list --left-right --count origin/main...HEAD` e o SHA de HEAD, salvos em `openspec/changes/split-and-land-working-tree/pre-state.md`
- [x] 1.3 Copiar a árvore de trabalho atual para o scratchpad como rede de segurança, antes de qualquer operação de git
- [x] 1.4 `git reset` (mixed) para zerar o índice, que hoje carrega 20 deleções de `.ttf` staged; confirmar que a árvore permanece idêntica
- [x] 1.5 Cortar `git checkout -b <branch-novo>` a partir de `76fd568` e confirmar que a árvore de trabalho foi carregada junto e que o branch original ficou parado em `76fd568`

## 2. PR #1 — os 41 commits

- [x] 2.1 Confirmar que `chore/implementation-openspec-on-codebase` aponta para `76fd568` e não contém nenhum commit novo
- [x] 2.2 Abrir o PR #1 do branch original para `main`, com descrição que explique que são seis meses de trabalho acumulado e liste os assuntos principais dos 41 commits
- [x] 2.3 Registrar o número do PR #1 para referência no PR #2

## 3. Commits de ruído

- [x] 3.1 Commitar o bump de `next` 16.2.6 → 16.3.2 com `package.json` e `package-lock.json`, sem nenhuma alteração de `src/`
- [x] 3.2 Commitar a reformatação de `payload-types.ts` isolada, identificada na mensagem como churn de gerador e não mudança de schema
- [x] 3.3 Verificar os dois commits em worktree descartável

## 4. Commits de performance

- [x] 4.1 Commitar o item ① (ícones): `Button`, `Badge` e os quatro call sites — `page.tsx`, `ProductsSection`, `SectionHeading`, `ServicesSection` — em um único commit, já que assinatura e call sites não podem se separar
- [x] 4.2 Commitar o item ② (fontes): `gilroy.ts`, as 20 deleções de `.ttf` e os 2 `.woff2` novos
- [x] 4.3 Commitar o item ⑦ (vídeo): apenas o hunk do `<source media>` em `page.tsx`
- [x] 4.4 Commitar os itens ③⑤⑥④ (custo por frame): `NavBarRoot`, `ui/cursor-glow`, os hunks de `CursorFollower` e os hunks de `will-change` em `globals.css`
- [x] 4.5 ~~Usar `git apply --check --cached` antes de cada patch~~ → **patch abandonado por completo**. O hunk do `trailingIcon` em `page.tsx` está fundido com hunks de outras changes mesmo em `-U1`; nenhum recorte de patch os separa. Usado o fallback determinístico que o design já previa, e estendido a todos os arquivos entrelaçados: sintetizar o conteúdo pretendido de cada arquivo por commit e estagiá-lo com `git hash-object -w` + `git update-index --cacheinfo`, o que **não toca a árvore de trabalho** em momento nenhum. Cada síntese carrega `assert` de ocorrência única antes de substituir
- [x] 4.6 Verificar cada um dos quatro commits em worktree descartável
- [x] 4.7 Confirmar que cada commit corresponde a um item de `baseline.md`, de modo que reverter um item não arraste os demais

## 5. Commits das changes em andamento

- [x] 5.1 Commitar `prevent-invisible-text`: `layout.tsx`, `template.tsx`, `Hero`, `ui/reveal.tsx`, `ui/text-reveal.tsx` e `HydrationSignal/` — os seis juntos, porque `layout.tsx` importa `HydrationSignal`, hoje não versionado
- [x] 5.2 Marcar na mensagem que a change está em andamento, com o progresso 58/60
- [x] 5.3 Commitar `fix-responsive-content-clipping` com os hunks restantes de `globals.css`, `ServicesSection` e `page.tsx`, marcando o progresso 34/49
- [x] 5.4 Verificar os dois commits em worktree descartável

## 6. Artefatos

- [x] 6.1 Commitar `openspec/` — as quatro changes, o `archive/`, `openspec/specs/`, mais `baseline.md`, `pre-state.md` e `scripts/bundle-attribution.py`
- [x] 6.2 Decidir sobre `pnpm-lock.yaml` e `pnpm-workspace.yaml` — ~~ficam fora~~ → **entram** (commit `14a9ee8`). A decisão original era não versioná-los, para não consagrar no histórico a dualidade npm/pnpm que o `proposal.md` declarou fora de escopo. Revertida por um argumento que a própria change produziu: `baseline.md` registra que **os caminhos resolvidos no build são os do pnpm**, ou seja, todas as medidas de `optimize-landing-performance` foram tiradas nesse ambiente. Sem o lockfile versionado, o ambiente de medição não é reproduzível fora desta máquina — e a change inteira se apoia em números medidos. Verificado que não há efeito colateral no deploy: as duas etapas do `Dockerfile` (linhas 22 e 60) testam `package-lock.json` primeiro, então a imagem continua instalando por npm. O commit registra o estado; **não** escolhe gerenciador, que segue sendo decisão da change de higiene

## 7. Fecho da árvore

- [x] 7.1 Confirmar que `git status` não reporta nenhuma modificação pendente em `src/` e que o índice está vazio
- [x] 7.2 Comparar a árvore final com a cópia de segurança de 1.3, arquivo a arquivo, e confirmar que **nenhum conteúdo de `src/` mudou** durante a operação
- [x] 7.3 Rodar `npm run lint` e confirmar que a contagem de erros é a mesma da linha de base pré-existente (42 erros / 13 avisos), sem regressão introduzida pela sequência

## 8. PR #2 — o trabalho novo

- [x] 8.1 Fazer push do branch novo
- [x] 8.2 Aguardar o merge do PR #1 — **PR #9, mergeado em 2026-08-28**. Desvio do plano registrado: o #9 foi para `develop`, não para `main`. Como `main` segue em `ae8f186` (2026-02-08), mirar o #2 em `main` recarregaria os 41 commits do #9 e re-litigaria aquela revisão dentro de um diff muito maior. **Base do #2 mudada para `develop`**, que é onde a base real do trabalho passou a existir. Levar `develop` a `main` vira decisão de release à parte, fora desta change
- [x] 8.3 Abrir o PR #2 com a tabela de ganhos medidos: LCP 22,3 s → 4,5 s, TBT 2.030 → 230 ms, peso 11.988 → 497 KiB, first-load JS −93,8% — **PR #10**, tabela completa de 10 métricas mais a atribuição por pacote (93,2% ícones × 1,2% animação)
- [x] 8.4 Incluir, na mesma altura visual da tabela, a lista do que **não** foi verificado: conferência visual do topo da nav, encaixe dos shapes em `md`/`lg`/`xl`, nitidez da borda do cursor em retina, alinhamento do halo, e o trace de scroll do qual dependem 4.4, 6.4 e 7.6 — seção própria com 13 itens, separados entre os que dependem de DevTools e os que dependem de conferência visual, incluindo os pendentes de `fix-responsive` (8.1, 8.5) e de `prevent-invisible-text` (7.8)
- [x] 8.5 Declarar no corpo que a camada 2 está implementada e não verificada, e que o Lighthouse mede carregamento e não scroll sustentado — seção "Ressalva de atribuição", que também registra a leitura contraintuitiva do vídeo: −69,4% de peso sem mover o LCP
- [x] 8.6 Informar o progresso das duas changes incompletas e o que falta para fechá-las — tabela com as três (31/51, 58/60, 34/49) e o que falta em cada uma
