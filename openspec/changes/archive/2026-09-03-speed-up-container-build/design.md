## Context

Deploys no Coolify passam de 20 minutos. A medição que existe aponta para longe do compilador:

| Evidência | Valor | Fonte |
|---|---|---|
| `next build` (cache quente) | **15,9 s** | `.next/trace-build`, `next-build` |
| `node_modules` | 1,2 GB / 95.169 arquivos / 1027 pacotes | `du`, `find`, `pnpm-lock.yaml` |
| `.next/cache/turbopack` | 878 MB, descartado a cada build | `du .next/cache/*` |
| Saída `standalone` | 79 MB | `du .next/standalone` |
| Rotas pré-renderizadas | apenas `_not-found`, `_global-error`, `favicon.ico` | `.next/prerender-manifest.json` |

O último item importa mais do que parece: `/[locale]` não tem `generateStaticParams`, logo **o build nunca abre conexão com o Postgres nem com o S3**. A hipótese "fetch pendurado em build" está descartada por evidência, não por suposição.

O que sobra é I/O. O `Dockerfile` atual tem três estágios e faz a árvore de 95k arquivos atravessar duas fronteiras:

```
  cache mount                ┌─────────────────────────────────────────────┐
  /root/.local/share/        │ STAGE 1 · dependencies                      │
  pnpm/store          ──────▶│  pnpm install --frozen-lockfile             │
  (OUTRO dispositivo)        │        │                                    │
       ╳ hardlink            │        ▼                                    │
    EXDEV → cópia      ❶     │  /app/node_modules   1,2 GB · 95.169 arqs   │
                             └────────────────┬────────────────────────────┘
                                              │ COPY --from=dependencies  ❷
                                              │ hash + rematerializa + reescreve
                                              ▼
                             ┌─────────────────────────────────────────────┐
                             │ STAGE 2 · builder                           │
                             │  node_modules 1,2 GB  +  COPY . .  (~4 MB)  │
                             │        ▼ next build                         │
                             │  .next/cache 878 MB ──▶ 🗑  descartado  ❸  │
                             │  .next/standalone 79 MB                     │
                             └────────────────┬────────────────────────────┘
                                              │ COPY --from=builder (79 MB) ✔
                                              ▼
                             ┌─────────────────────────────────────────────┐
                             │ STAGE 3 · runner   ~85 MB                   │
                             └─────────────────────────────────────────────┘
```

Restrições: o alvo é `node:24.13-alpine` (musl); `sharp` depende de `@img/sharp-linuxmusl-*`, presente no lockfile. O ambiente local roda **pnpm 11.10.0** e Node 24.18. Não há CI — o único pipeline é o build do Coolify a partir deste `Dockerfile`.

## Goals / Non-Goals

**Goals:**

- Eliminar a travessia de `node_modules` entre estágios.
- Fazer o pnpm usar hardlink de verdade, em vez de cair para cópia.
- Preservar o cache do Turbopack entre builds.
- Deixar pnpm como o único toolchain, com versão fixada e reprodutível.
- Produzir números por step, antes e depois, de forma repetível.

**Non-Goals:**

- Alterar qualquer coisa em `src/`. Nenhuma mudança de comportamento da aplicação.
- Alterar o contrato de runtime da imagem (comando, usuário, porta, variáveis).
- Reduzir o tamanho da imagem final. Ela já tem ~85 MB; não é o problema.
- Investigar emulação QEMU / incompatibilidade de arquitetura entre host e imagem. Fora de escopo por decisão explícita — mas ver *Risks*, porque interage com o critério de sucesso escolhido.
- Tornar o `next build` mais rápido por si (desligar checagem de tipos, mexer no React Compiler). 15,9 s não é onde estão os 20 minutos.

## Decisions

### D1 — Fundir `dependencies` e `builder` num único estágio

Elimina ❷ inteiro. O `COPY --from` de 1,2 GB não fica mais barato; ele simplesmente deixa de existir.

A objeção natural é "mas aí perco o cache das dependências". Não perco: o cache de camada do Docker é ordinal, não inter-estágio. Mantendo

```
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN <instala>
COPY . .
RUN <builda>
```

a camada de instalação continua sendo reaproveitada sempre que os manifestos não mudarem, exatamente como hoje. A separação em dois estágios nunca comprou cache — comprou uma cópia.

*Alternativa considerada:* manter três estágios e trocar `COPY --from` por `RUN --mount=type=bind,from=dependencies`. Funciona e evita a cópia, mas `node_modules` fica indisponível fora daquele `RUN`, e o `next build` precisa de escrita em `.next/` com resolução a partir de `node_modules` — dá para fazer, mas é mais frágil e mais difícil de ler do que simplesmente não ter dois estágios.

### D2 — Store do pnpm num diretório de camada, não num cache mount

Esta é a decisão menos óbvia e a que mais se paga.

O ganho central do pnpm é ligar o store ao `node_modules` por **hardlink**: 95k operações de link em vez de 1,2 GB de escrita. Hardlink não cruza dispositivo. **Um cache mount do BuildKit é sempre um dispositivo distinto**, independentemente do caminho onde é montado — montá-lo em `/app/.pnpm-store` não resolve nada. Com o store lá, `link(2)` devolve `EXDEV`, o `package-import-method: auto` do pnpm cai silenciosamente para cópia, e o build paga a árvore inteira.

Portanto: `store-dir` aponta para um caminho normal dentro do estágio (mesmo overlayfs que `/app`), sem cache mount. A reutilização entre builds passa a vir do cache de camada do Docker, cuja chave é o `COPY` do lockfile — a mesma granularidade que o cache mount oferecia.

O que se perde: quando o lockfile *muda*, o store começa vazio e todos os tarballs são rebaixados. Mitigação parcial: manter um cache mount para o **`cache-dir`** do pnpm, que guarda metadados de registry e é independente do store — barato, sem interação com hardlink.

*Alternativa considerada:* `pnpm fetch` + `pnpm install --offline`, que popula o store numa camada dedicada, chaveada só pelo lockfile. É o padrão mais citado e resolve o mesmo problema com granularidade ligeiramente melhor. **Rejeitado por ora**: o próprio pnpm 11.10 imprime `WARNING! This is an experimental command. Breaking changes may be introduced in non-major versions of the CLI`. Não vale acoplar o único pipeline de deploy a um comando experimental para ganhar o caso "lockfile mudou", que é minoria. Fica registrado como refinamento se a medição mostrar que o download domina.

*Verificação:* esta decisão repousa numa hipótese — que o pnpm está caindo para cópia hoje. A tarefa de medição do baseline vem **antes** da reescrita justamente para confirmá-la. Se o step de install já for rápido no baseline, D2 não é onde está o tempo e o esforço vai para D1 e D3.

### D3 — Cache mount para `.next/cache`

Aqui o cache mount é a ferramenta certa: não há hardlink envolvido, só leitura e escrita de arquivos por um processo dentro do `RUN`. O Turbopack mantém 878 MB de cache persistente em `.next/cache/turbopack`, hoje jogados fora a cada build.

O comentário atual do `Dockerfile` explica por que isso não foi feito: montar `.next/cache` impede `.next/cache/fetch-cache` de entrar na imagem final, então respostas de fetch capturadas em build não ficam disponíveis em runtime. **Esse trade-off não existe neste projeto** — `prerender-manifest.json` mostra que nenhuma rota da aplicação é pré-renderizada, logo nenhum fetch é capturado em build. Estamos pagando o custo sem receber a contrapartida.

### D4 — pnpm único, versão fixada em `packageManager`

As ramificações `if package-lock.json / elif yarn.lock` descrevem um repositório que não existe mais desde `788bb58`. Um ramo que nunca roda é um ramo que nunca foi testado.

`packageManager: "pnpm@11.10.0"` em `package.json` (versão exata, casando com o ambiente local) e `corepack enable` num `RUN` próprio, antes do `COPY` do código, para que a resolução do pnpm vire uma camada cacheada em vez de duas idas à rede por build.

**Achado adicional:** `package.json` ainda carrega um campo `pnpm.onlyBuiltDependencies`, e o pnpm 11 avisa a cada invocação que **esse campo não é mais lido**. A configuração viva é `allowBuilds` em `pnpm-workspace.yaml`, que já é um superconjunto dele (`@parcel/watcher`, `@swc/core`, `esbuild`, `msw`, `sharp` contra `esbuild`, `sharp`, `msw`). O campo morto sai junto — é exatamente o tipo de divergência que a consolidação de toolchain existe para eliminar.

### D5 — Harness de medição em `scripts/`, relatórios fora do versionamento

`docker build --no-cache --progress=plain`, cronometrado por step, gravando um relatório por execução em um diretório ignorado por git e por Docker.

O relatório registra commit, tempo total, duração por step **e a arquitetura de host e alvo**. O último campo é o que impede uma medição lenta de ser ambígua entre "o `Dockerfile` está ruim" e "o host está emulando" — e é a ponte para o risco descrito abaixo.

*Localização:* `scripts/` na raiz, não dentro do diretório da mudança. Há precedente para scripts dentro da mudança (`openspec/changes/optimize-landing-performance/scripts/bundle-attribution.py`), mas aquele é um diagnóstico de uso único para uma investigação encerrada. Este precisa sobreviver à mudança: toda edição futura do `Dockerfile` deve poder ser medida com o mesmo comando.

*Alternativa considerada:* parsear o `buildkit` via `docker buildx --metadata-file` em vez de cronometrar a saída de `--progress=plain`. Mais estruturado, mas exige buildx e amarra o harness a uma versão de API; a saída `plain` já traz duração por step e é estável há anos.

### D6 — `.dockerignore` ganha `tsconfig.tsbuildinfo`, `openspec/`, `.claude/`

Três megabytes, irrelevantes. O efeito não é: `*.tsbuildinfo` já está no `.gitignore`, mas **não** no `.dockerignore` — então o arquivo entra no contexto, e qualquer edição de spec ou de configuração de ferramenta altera o contexto, invalida o `COPY . .` e força recompilação sem que nenhuma entrada real da build tenha mudado.

## Risks / Trade-offs

**O critério de sucesso é o deploy real no Coolify, mas a investigação de plataforma ficou fora de escopo.** → Se houver emulação QEMU entre host e imagem, ela multiplica todos os steps e pode engolir o ganho no número final, fazendo uma mudança correta parecer fracassada. Mitigação: o harness (D5) grava arquitetura de host e alvo, e a medição local frio dá o delta esperado. Se o Coolify não melhorar na proporção do local, a comparação de arquitetura no relatório é a primeira coisa a olhar — e vira mudança separada.

**A hipótese EXDEV pode estar errada.** → D2 é a decisão mais teórica das cinco. Mitigação: medir o baseline antes de reescrever, e comparar o step de install isoladamente. Se ele já for rápido, D2 é neutro (não piora nada) mas o ganho vem só de D1 e D3.

**Store em camada infla o disco do build host.** → O store some da imagem final (o estágio de build não é o final), mas ocupa espaço nas camadas intermediárias no servidor. Num host apertado, `docker builder prune` passa a ser mais frequente — o que por sua vez zera o cache e traz de volta builds frios. Mitigação: registrar o tamanho da camada de dependências no relatório e verificar folga de disco no host antes de fechar a mudança.

**Fundir estágios acopla a invalidação da instalação à do build.** → Não hoje: os manifestos são copiados antes do código, então editar `src/` não reinstala. Mas a ordem passa a ser load-bearing de um jeito que não era. Mitigação: as invariantes viram requisitos em `container-build-pipeline`, não comentário no `Dockerfile`.

**`corepack` está a caminho de sair do Node.** → Foi removido do Node 25; `node:24-alpine` ainda o traz (corepack 0.35 no ambiente local, Node 24.18). Um bump futuro de imagem base quebra o `RUN corepack enable`. Mitigação: nenhuma agora — é uma dívida datada, e o `ARG NODE_VERSION` já sinaliza que o bump é um ato deliberado com revisão.

## Migration Plan

1. Medir o baseline com o harness, no commit atual, antes de tocar no `Dockerfile`. Sem isso não há "antes".
2. Aplicar D4/D6 (toolchain e contexto) — mudanças pequenas e independentes.
3. Aplicar D1/D2/D3 (forma do build) numa reescrita só. Não são separáveis: fundir estágios muda onde o store precisa estar.
4. Medir de novo, mesmo harness, mesma máquina. Comparar step a step.
5. Validar o runtime: subir a imagem construída e conferir `/en` e `/admin`.
6. Deploy no Coolify e comparar com o tempo observado antes.

**Rollback:** a mudança é confinada a `Dockerfile`, `package.json`, `.dockerignore`, `.gitignore` e um script novo. Reverter o commit restaura o pipeline anterior integralmente; não há estado migrado, nem nada persistido que dependa da nova forma.

## Open Questions

- **O Coolify preserva cache de camada entre deploys, ou faz prune?** Decide se o ganho de D1/D2 aparece em todo deploy ou só quando o lockfile muda. Não bloqueia a implementação — as correções valem nos dois mundos —, mas muda a expectativa de resultado.
- **Quantos vCPUs tem o host?** Um build frio de Payload + lexical + React Compiler em 2 vCPU é um regime diferente de 8. Contextualiza o número final; não altera nenhuma decisão acima.
- **Qual alvo de tempo conta como sucesso?** Ainda não há número. A intenção é derivá-lo da medição do passo 1 em vez de inventá-lo agora.
