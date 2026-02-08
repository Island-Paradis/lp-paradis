# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine3.21 AS base

# 1. Install dependencies in the base stage so all stages (deps, builder, runner)
# inherit them. This ensures libc6-compat and openssl are available at runtime.
RUN apk upgrade --update-cache --available && \
    apk add --no-cache libc6-compat openssl && \
    rm -rf /var/cache/apk/*

# Setup pnpm via corepack if needed (optional but recommended for pnpm users)
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

# 2. Use BuildKit Cache Mounts to speed up dependency installation
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/pnpm/store \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Only copy public if it exists
COPY --from=builder /app/public ./public 2>/dev/null || true

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# 3. Hostname binding is crucial for Next.js standalone mode
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]