> **Bloqueio ativo:** o daemon do Docker não está rodando nesta máquina
> (`/var/run/docker.sock` ausente; CLI e buildx v0.35.0 presentes). Toda tarefa
> que constrói ou sobe imagem está parada por isso, não por decisão de escopo.
> Basta subir o Docker e retomar com `/opsx:apply`.

## 1. Harness de medição

Precisa vir primeiro: sem baseline não há "antes", e a hipótese EXDEV (D2) só é confirmável comparando o step de install.

- [x] 1.1 Criar `scripts/measure-build.sh` que executa `docker build --no-cache --progress=plain` e cronometra a saída por step
  - Aceita `--warm` (omite `--no-cache`, serve a 6.3) e `--platform`.
- [x] 1.2 Fazer o script gravar um relatório por execução em `.build-metrics/`, sem sobrescrever execuções anteriores
  - Nome: `<instante UTC>-<commit curto>-<modo>.md`, mais o log bruto ao lado.
- [x] 1.3 Registrar no relatório: commit medido, tempo total, duração por step, arquitetura do host e plataforma da imagem
  - Registra também se a árvore estava suja e a arquitetura do daemon.
- [x] 1.4 Propagar o código de saída do `docker build` e preservar a saída do build que falhou dentro do relatório
  - `PIPESTATUS` para não deixar o `tee` mascarar a falha; em erro, as últimas 80 linhas entram no relatório.
- [x] 1.5 Adicionar `.build-metrics/` ao `.gitignore` e ao `.dockerignore`
  - `scripts` também entrou no `.dockerignore`: medir o build não pode ser a coisa que invalida o build.
- [ ] 1.6 Rodar o script no commit atual e guardar o relatório como baseline
  - **Bloqueado:** exige daemon do Docker. O parser de steps foi validado contra um log sintético do BuildKit (12 steps, incluindo `CACHED` e `exporting to image`).
- [ ] 1.7 Confrontar o baseline com as hipóteses do design: registrar se o step de install de fato domina (D2) e qual o custo real do `COPY --from` (D1)
  - **Bloqueado:** depende de 1.6.

## 2. Toolchain pnpm

Mudanças pequenas e independentes da reescrita do `Dockerfile`; entram antes para isolar o efeito.

- [x] 2.1 Adicionar `"packageManager": "pnpm@11.10.0"` a `package.json`
- [x] 2.2 Remover o campo morto `pnpm.onlyBuiltDependencies` de `package.json` — o pnpm 11 não o lê mais e avisa a cada invocação; `allowBuilds` em `pnpm-workspace.yaml` já é superconjunto dele
- [x] 2.3 Confirmar que `pnpm install --frozen-lockfile` local segue funcionando sem o campo removido e sem emitir o aviso
  - `Already up to date / Done in 738ms using pnpm v11.10.0`, sem aviso. Versão bate com a fixada.
- [x] 2.4 Reduzir o `COPY` de manifestos do `Dockerfile` a `package.json`, `pnpm-lock.yaml` e `pnpm-workspace.yaml`
- [x] 2.5 Remover os ramos `npm ci` e `yarn install` dos dois `RUN` do `Dockerfile`, deixando pnpm como caminho único
- [x] 2.6 Fazer a ausência de `pnpm-lock.yaml` falhar o build com mensagem explícita
  - Feito tirando o glob do `COPY`: sem `*`, o BuildKit falha nomeando o arquivo que faltou. Um guard `[ -f pnpm-lock.yaml ]` no `RUN` seria inalcançável, já que o `COPY` falha antes.
- [x] 2.7 Isolar `corepack enable` num `RUN` próprio, antes do `COPY` do código-fonte, para virar camada cacheada
  - Somado a um `RUN corepack install` após os manifestos, para que o download do pnpm também vire camada cacheada em vez de rede a cada build.

## 3. Contexto de build

- [x] 3.1 Adicionar `tsconfig.tsbuildinfo`, `openspec/` e `.claude/` ao `.dockerignore`
- [ ] 3.2 Verificar que editar um arquivo sob `openspec/` não invalida a camada do `COPY` do código-fonte
  - **Bloqueado:** exige dois builds reais para comparar reaproveitamento de camada.

## 4. Forma do build

D1, D2 e D3 não são separáveis — fundir os estágios muda onde o store precisa estar. Entram numa reescrita só.

- [x] 4.1 Fundir `dependencies` e `builder` num único estágio, preservando a ordem `COPY manifestos → install → COPY . . → build`
  - Achado durante a fusão: `ENV NODE_ENV=production` precisa vir **depois** do install. Com ele antes, o pnpm pula as devDependencies e o build perde typescript, tailwind e o `babel-plugin-react-compiler`. Nos dois estágios anteriores isso era acidentalmente seguro; agora é load-bearing e está comentado no `Dockerfile`.
- [x] 4.2 Remover o `COPY --from=dependencies /app/node_modules` (D1)
- [x] 4.3 Apontar o `store-dir` do pnpm para um caminho no mesmo overlayfs que `/app`, **sem** cache mount (D2)
  - `--store-dir /app/.pnpm-store`. Verificado que `npm_config_store_dir` é ignorado pelo pnpm 11, então a flag de CLI é o único caminho confiável.
  - Somado a `--package-import-method hardlink`: o padrão `auto` cai para cópia em silêncio, que é exatamente a regressão a evitar. Melhor falhar alto.
- [x] 4.4 Manter cache mount apenas para o `cache-dir` do pnpm (metadados de registry), que não interage com hardlink
  - pnpm 11 não expõe `--cache-dir` no `install`; o cache de metadados vive em `~/.cache/pnpm`, então o mount aponta direto para lá.
- [x] 4.5 Adicionar `--mount=type=cache` com destino `.next/cache` ao `RUN` que executa `pnpm build` (D3)
  - `sharing=locked` para não corromper o cache do Turbopack em builds concorrentes.
- [x] 4.6 Substituir o comentário sobre o trade-off do `fetch-cache` por uma nota explicando que ele não se aplica: nenhuma rota da aplicação é pré-renderizada
- [x] 4.7 Verificar que o store do pnpm não está presente na imagem final
  - Verificado por inspeção do estágio final, que é o que o cenário da spec pede. Confirmação empírica na imagem construída fica com 5.1.
- [x] 4.8 Verificar que o estágio final copia somente `public`, `.next/standalone` e `.next/static`
  - Três `COPY --from=build`, nenhum outro.

## 5. Verificação de runtime

O contrato da imagem não pode mudar. Divergência aqui é regressão.

- [ ] 5.1 Construir a imagem e conferir que o `CMD` é `node server.js`, o usuário é `node`, a porta é 3000 e `NODE_ENV`/`HOSTNAME` estão como antes
  - **Bloqueado na construção.** As diretivas já foram conferidas por inspeção e estão idênticas às de antes: `CMD ["node", "server.js"]`, `USER node`, `EXPOSE 3000`, `ENV NODE_ENV/PORT/HOSTNAME`.
- [ ] 5.2 Subir o container com as variáveis de produção e verificar que `/en` responde sem erro de servidor
  - **Bloqueado:** exige daemon do Docker.
- [ ] 5.3 Verificar que `/admin` responde sem erro de servidor
  - **Bloqueado:** exige daemon do Docker.
- [ ] 5.4 Conferir que `.next` é gravável pelo usuário de runtime
  - **Bloqueado:** exige daemon do Docker.

## 6. Medição comparativa

- [ ] 6.1 Rodar `scripts/measure-build.sh` na mesma máquina do baseline, no commit com as mudanças aplicadas
  - **Bloqueado:** exige daemon do Docker.
- [ ] 6.2 Comparar step a step contra o baseline e registrar o delta por step
  - **Bloqueado:** depende de 1.6 e 6.1.
- [ ] 6.3 Rodar dois builds consecutivos sem `--no-cache`, com uma alteração em `src/`, e confirmar que o segundo compila mais rápido (cache do Turbopack ativo)
  - **Bloqueado** no Docker, mas há evidência local a favor de D3: apagando `.next/cache/turbopack`, o `next build` desta máquina foi de **15,9 s (quente) para 61 s (frio)**. É o custo que o build do container pagava a cada deploy.
- [ ] 6.4 Registrar o tamanho da camada de dependências e conferir folga de disco no host de build
  - **Bloqueado:** exige daemon do Docker.
- [ ] 6.5 Derivar o alvo de tempo a partir das duas medições e anotá-lo — o design deixou essa questão em aberto de propósito
  - **Bloqueado:** depende de 6.1 e 6.2.

## 7. Fechamento

- [ ] 7.1 Fazer o deploy no Coolify e registrar o tempo observado
  - **Bloqueado:** ação externa, depende do usuário.
- [ ] 7.2 Comparar com o delta do build local frio; se a proporção não bater, registrar a comparação de arquitetura host/alvo do relatório como ponto de partida para uma mudança separada sobre emulação
  - **Bloqueado:** depende de 7.1.
  - Dado já coletado: o host local é `x86_64`/darwin, então o build local é amd64 nativo. Se o host do Coolify for arm64, a comparação entre os dois números não é direta.
- [x] 7.3 Remover o diretório vazio `openspec/changes/consolidate-pnpm-toolchain/`, cujo escopo foi absorvido aqui
- [x] 7.4 Rodar `npm run lint` e confirmar que a árvore está limpa
  - `package.json` passa limpo e nenhuma alteração desta mudança gera diagnóstico. **A árvore não está limpa**, porém: há 42 erros e 13 avisos pré-existentes em `next.config.ts`, `payload-types.ts` e 16 arquivos de `src/`, todos intocados aqui. Fora do escopo desta mudança; vale uma limpeza própria.
