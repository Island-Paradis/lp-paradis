## Why

A árvore de trabalho acumulou o resultado de três changes ao mesmo tempo, mais um punhado de alterações que nenhuma delas reivindica, e nada disso está commitado. Quatro arquivos carregam hunks de mais de uma change simultaneamente. O índice já tem 20 deleções staged de uma operação intermediária.

Ao mesmo tempo, o branch está **41 commits à frente de `origin/main`, sem nenhum PR aberto**, e `origin/main` não recebe commit desde 2026-02-08 — seis meses. Entre esses 41 está `c8f2157 "Add interactive motion effects and animations"`, o commit que criou as animações que a change de performance acabou de otimizar.

Disso decorre a restrição que organiza esta change: **não existe PR de performance isolado contra `main`.** Os arquivos otimizados só existem na forma atual por causa dos 41 commits não revisados. O trabalho novo não tem base onde aplicar até que eles cheguem lá.

Sem uma passagem deliberada, o desfecho provável é um commit único misturando três assuntos, um bump de dependência e reformatação gerada — o tipo de commit que faz um `git bisect` futuro apontar para o lugar errado numa regressão de performance que esta mesma sessão passou o dia medindo.

## What Changes

**Separação da árvore em commits escopados**

- Os hunks dos quatro arquivos entrelaçados — `page.tsx`, `globals.css`, `CursorFollower/index.tsx`, `ServicesSection/index.tsx` — são separados por change de origem. Como `git add -p` é interativo e indisponível neste ambiente, a separação usa patches montados e aplicados com `git apply --cached`.
- Cada change em aberto recebe seus próprios commits: `optimize-landing-performance` (4 commits, um por item medido), `prevent-invisible-text` e `fix-responsive-content-clipping` (um cada, marcados como trabalho em andamento — os artefatos os declaram 58/60 e 34/49).
- O ruído que nenhuma change reivindica é isolado: o bump de `next` 16.2.6 → 16.3.2 com seu lockfile, e a reformatação de `payload-types.ts`, que é só churn de gerador.
- Os artefatos de OpenSpec das três changes, hoje não versionados, entram em commit próprio junto com `baseline.md` e o script de atribuição de bundle.

**Sequência de dois PRs**

- **PR #1** leva os 41 commits existentes para `main`. É o passo que destrava tudo: são seis meses de trabalho que nunca passaram por revisão.
- **PR #2**, aberto após o merge do #1, leva o trabalho novo — as três changes.
- A descrição do PR #2 carrega os números medidos e, com o mesmo destaque, **a lista do que não foi verificado**: as 14 tarefas de conferência visual e o trace de scroll que fecham a camada 2 de `optimize-landing-performance`.

**Não muda**

Nenhuma linha de código de aplicação. Esta change reorganiza como o trabalho existente chega a `main`; ela não altera o que esse trabalho faz.

## Capabilities

### New Capabilities

- `change-landing`: a disciplina pela qual trabalho sai da árvore e chega a `main` — granularidade de commit em relação às changes de OpenSpec, isolamento de alterações geradas e de bumps de dependência, ordenação de PRs quando um depende do outro, e a obrigação de um PR declarar o que nele ainda não foi verificado.

### Modified Capabilities

Nenhuma. As capabilities existentes (`homepage-shape-interlock`) e as propostas em changes abertas (`client-bundle-budget`, `scroll-frame-budget`, `text-visibility-guarantees`, `scroll-reveal-animations`) descrevem o comportamento do produto. Esta change descreve como esse comportamento é entregue, e não toca nenhum requisito deles.

## Impact

**Git, não código.** O impacto é sobre histórico, índice e branches — nenhum arquivo de `src/` muda de conteúdo por causa desta change.

**Estado de partida, verificado**

| | |
|---|---|
| Branch | `chore/implementation-openspec-on-codebase` |
| Posição | 41 commits à frente de `origin/main`, 0 atrás |
| `origin/main` | `ae8f186`, 2026-02-08 |
| PRs abertos | nenhum |
| Índice | 20 deleções de `.ttf` já staged |
| `gh` | autenticado como `k3lm4n` |

**Arquivos por origem**

- *Só de performance (8):* `Badge`, `Button`, `NavBarRoot`, `ProductsSection`, `SectionHeading`, `ui/cursor-glow`, `fonts/gilroy.ts`, `fonts/gilroy/` (−20 `.ttf`, +2 `.woff2`).
- *Entrelaçados (4):* `[locale]/page.tsx`, `globals.css`, `CursorFollower/index.tsx`, `ServicesSection/index.tsx`.
- *De outras changes (6):* `layout.tsx`, `template.tsx`, `Hero`, `ui/reveal.tsx`, `ui/text-reveal.tsx`, `HydrationSignal/`.
- *Ruído (5):* `package.json`, `package-lock.json`, `payload-types.ts`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.

**Riscos**

- Uma separação de hunk malfeita produz um commit que não compila sozinho. Cada commit da sequência precisa ser verificável isoladamente.
- PR #2 depende do merge do #1. Se o #1 empacar em revisão, o trabalho novo fica represado — é o preço aceito por PRs de tamanho revisável.
- Commitar duas changes incompletas registra no histórico trabalho que os próprios artefatos dizem não estar pronto. Mitigado por commits explicitamente marcados como em andamento, e preferível à alternativa: trabalho não commitado é como trabalho se perde.

**Fora de escopo**

- A dualidade npm/pnpm (`node_modules` com os dois layouts, dois lockfiles, `pnpm-workspace.yaml` não versionado) e o experimento `turbopackServerFastRefresh` que o build rejeita a cada execução. São ruído real, mas de outra natureza — merecem change própria, e resolvê-los aqui atrasaria a entrega do que já está medido.
- Completar as 14 verificações pendentes de `optimize-landing-performance`. Elas continuam sendo tarefas daquela change; esta apenas garante que o PR #2 as declare em vez de escondê-las.
