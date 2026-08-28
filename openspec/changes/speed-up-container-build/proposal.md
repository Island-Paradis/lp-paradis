## Why

Deploys no Coolify passam de 20 minutos, e a evidência aponta para longe do compilador: o trace de um build real (`.next/trace-build`) registra `next-build` em **15,9 s**. O tempo mora no `Dockerfile`, que move os mesmos 1,2 GB / 95.169 arquivos de `node_modules` através de três fronteiras evitáveis e descarta 881 MB de cache do Turbopack a cada build.

Além disso o `Dockerfile` ainda ramifica em `package-lock.json` / `yarn.lock`, arquivos que não existem mais no repositório desde `788bb58`. Cada ramificação morta é uma leitura de disco e um caminho não testado.

## What Changes

**Forma do build (o custo estrutural)**

- Fundir os estágios `dependencies` e `builder` num único estágio. Isso elimina o `COPY --from=dependencies /app/node_modules` — hoje o BuildKit precisa hashear a árvore inteira, materializar cada hardlink do pnpm como arquivo único e reescrever 95k arquivos em overlayfs. O cache de camada continua funcionando porque `COPY package.json pnpm-lock.yaml …` permanece antes do `COPY . .`.
- Mover o store do pnpm para o **mesmo filesystem** que `/app`. Hoje o cache mount aponta para `/root/.local/share/pnpm/store`, outro dispositivo; hardlink não cruza dispositivo, então o pnpm cai para cópia integral dos 1,2 GB em vez de criar 95k inodes.
- Adicionar cache mount para `.next/cache`, hoje descartado a cada build. O trade-off documentado no comentário atual do `Dockerfile` (perder `fetch-cache` no runtime) não se aplica: `/[locale]` não é pré-renderizado — `prerender-manifest.json` contém apenas `_not-found`, `_global-error` e `favicon.ico` —, então não há fetch cache de build a preservar.

**Toolchain (a ramificação morta)**

- Remover os ramos `npm ci` e `yarn install` dos dois `RUN` do `Dockerfile`; pnpm passa a ser o único caminho, e a ausência do `pnpm-lock.yaml` vira erro explícito.
- Fixar `packageManager` em `package.json`. Sem ele, `corepack enable pnpm` resolve e baixa o pnpm da rede — hoje duas vezes, uma por estágio — e a versão instalada não é reprodutível.
- Restringir o `COPY` de manifestos aos arquivos que realmente existem (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- Absorve o diretório vazio `openspec/changes/consolidate-pnpm-toolchain/`, que foi criado para este trabalho e nunca recebeu artefatos.

**Contexto de build**

- Adicionar `tsconfig.tsbuildinfo`, `openspec/` e `.claude/` ao `.dockerignore`. Poucos bytes, mas hoje qualquer edição de spec invalida o `COPY . .` e força recompilação.

**Medição**

- Adicionar um script versionado que roda `docker build --no-cache --progress=plain` cronometrado por step, gravando um relatório comparável. Sem ele, "ficou mais rápido" é uma impressão; a mudança precisa provar o antes/depois.

## Capabilities

### New Capabilities

- `container-build-pipeline`: forma do `Dockerfile` de produção — estágios, caches, toolchain de instalação e conteúdo do contexto de build. Cobre as invariantes que mantêm o build rápido e reprodutível, não só a correção pontual.
- `build-time-measurement`: harness que mede o tempo de build por step de forma repetível e grava um relatório comparável entre execuções.

### Modified Capabilities

Nenhuma. A única spec existente (`homepage-shape-interlock`) descreve layout da homepage e não é tocada.

## Impact

**Arquivos**

- `Dockerfile` — reescrita dos três estágios para dois.
- `package.json` — campo `packageManager`.
- `.dockerignore` — três entradas novas.
- Script de medição novo (localização decidida no design).
- `openspec/changes/consolidate-pnpm-toolchain/` — removido, escopo absorvido aqui.

**Sistemas**

- Pipeline de deploy do Coolify. A imagem final não muda de forma (estágio `runner` intocado, mesmo `CMD`, mesmo usuário `node`, mesma porta), então o runtime não é afetado — o que muda é como ela é produzida.

**Nenhuma mudança de comportamento da aplicação.** Nada em `src/` é tocado.

**Risco conhecido, fora de escopo:** o critério de sucesso escolhido é o tempo de deploy real no Coolify, mas a investigação de plataforma (emulação QEMU por incompatibilidade de arquitetura entre host e imagem) foi deixada de fora. Se houver QEMU no caminho, ele multiplica tudo e as correções aqui podem não aparecer no número final. Se o deploy real não melhorar na proporção do build local frio, essa é a primeira hipótese a investigar — e vira uma mudança separada.
