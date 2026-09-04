# ============================================
# Estágio 1: dependências + build
# ============================================
#
# Um estágio só, de propósito. A separação anterior em `dependencies` +
# `builder` não comprava cache nenhum — o cache de camada do Docker é ordinal,
# não inter-estágio, e a ordem `COPY manifestos → install → COPY . . → build`
# abaixo dá exatamente a mesma granularidade. O que ela comprava era um
# `COPY --from=dependencies /app/node_modules`: 1,2 GB e 95.169 arquivos que o
# BuildKit precisava hashear, rematerializar (cada hardlink do pnpm vira
# arquivo independente) e reescrever em overlayfs, a cada build.

# IMPORTANTE: manutenção da versão do Node.
# Atualize o ARG para o LTS corrente periodicamente. O bump é um ato
# deliberado: `corepack` foi removido do Node 25, então subir a major exige
# revisar o `RUN corepack enable` logo abaixo.
ARG NODE_VERSION=24.13.0-alpine

FROM node:${NODE_VERSION} AS build

WORKDIR /app

# Onde o pnpm guarda o conteúdo dos pacotes. Precisa estar no MESMO dispositivo
# que /app: o ganho central do pnpm é ligar store → node_modules por hardlink
# (95k links em vez de 1,2 GB de escrita), e hardlink não cruza dispositivo.
#
# Por isso o store NÃO é um cache mount do BuildKit. Um cache mount é sempre um
# dispositivo distinto, qualquer que seja o caminho onde é montado — montá-lo
# em /app/.pnpm-store não resolveria nada. Com o store lá, link(2) devolve
# EXDEV e o `package-import-method: auto` do pnpm cai em silêncio para cópia.
#
# A reutilização entre builds vem do cache de camada do Docker, chaveado pelo
# COPY do lockfile abaixo: mesma granularidade que o cache mount oferecia, sem
# perder o hardlink. O store fica só neste estágio; não vai para a imagem final.
ENV PNPM_STORE_DIR=/app/.pnpm-store

# Shims do corepack. Layer próprio, antes dos manifestos, porque não depende
# deles e não faz rede — sobrevive a qualquer mudança de dependência.
RUN corepack enable

# Só os manifestos, antes do código, para que editar src/ não reinstale nada.
#
# Sem glob (`pnpm-lock.yaml`, não `pnpm-lock.yaml*`) de propósito: é isto que
# faz a ausência do lockfile falhar o build, nomeando o arquivo que faltou, em
# vez de cair num ramo alternativo. pnpm é o único toolchain suportado aqui —
# `package-lock.json` saiu do repositório em 788bb58 e nunca houve `yarn.lock`.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Baixa exatamente a versão declarada em `packageManager`. Camada separada para
# que a ida à rede seja cacheada junto com o manifesto, em vez de repetida a
# cada build.
RUN corepack install

# `--package-import-method hardlink` é deliberado. O padrão `auto` cai para
# cópia sem avisar, que é precisamente a regressão que este estágio existe para
# evitar; se algum dia o store parar de compartilhar dispositivo com /app,
# é melhor o build falhar alto do que ficar cinco minutos mais lento em
# silêncio.
#
# O cache mount cobre apenas o cache de metadados de registry (~/.cache/pnpm),
# que não participa do hardlink e portanto não sofre com EXDEV.
RUN --mount=type=cache,target=/root/.cache/pnpm,sharing=locked \
  pnpm install --frozen-lockfile \
    --store-dir "$PNPM_STORE_DIR" \
    --package-import-method hardlink

# Código-fonte. Vem depois do install para não invalidá-lo.
COPY . .

# Depois do install, nunca antes: com NODE_ENV=production o pnpm pula as
# devDependencies, e o build precisa de typescript, tailwind e
# babel-plugin-react-compiler. Num estágio único a ordem passa a ser
# load-bearing de um jeito que não era quando havia dois.
ENV NODE_ENV=production

# O Next coleta telemetria anônima. Descomente para desligar durante o build.
# ENV NEXT_TELEMETRY_DISABLED=1

# O cache persistente do Turbopack vive em .next/cache (878 MB medidos neste
# projeto) e era descartado a cada build.
#
# O motivo documentado para não cacheá-lo era preservar .next/cache/fetch-cache
# na imagem final. Esse trade-off não existe aqui: nenhuma rota da aplicação é
# pré-renderizada — `prerender-manifest.json` traz apenas _not-found,
# _global-error e favicon.ico —, então nenhuma resposta de fetch é capturada em
# build. Estávamos pagando o custo sem receber a contrapartida.
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
  pnpm build

# ============================================
# Estágio 2: runtime
# ============================================

FROM node:${NODE_VERSION} AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# O Next coleta telemetria anônima. Descomente para desligar em runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/public ./public

# Permissão correta para o cache de prerender.
RUN mkdir .next
RUN chown node:node .next

# Aproveita o output tracing para reduzir o tamanho da imagem.
# https://nextjs.org/docs/advanced-features/output-file-tracing
#
# Só estes três caminhos saem do estágio de build. Em particular, nem
# node_modules nem o store do pnpm — o standalone já traz o subconjunto de
# dependências que o servidor realmente carrega.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

# Não há `COPY` de .next/cache: ele é um cache mount no estágio de build e não
# existe como diretório de camada. Ver a nota sobre fetch-cache acima.

# Usuário não-root.
USER node

EXPOSE 3000

# Servidor standalone do Next.
CMD ["node", "server.js"]
