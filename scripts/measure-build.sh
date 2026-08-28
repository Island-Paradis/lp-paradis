#!/usr/bin/env bash
#
# Mede o tempo do build da imagem, step a step, e grava um relatório comparável.
#
# Uso:
#   scripts/measure-build.sh              # build a frio (--no-cache), o padrão
#   scripts/measure-build.sh --warm       # build com cache, para medir reaproveitamento
#   scripts/measure-build.sh --platform linux/amd64
#
# Por que existe: sem número por step, "ficou mais rápido" é impressão. A
# hipótese desta mudança é que o custo do build está em movimentação de
# node_modules e em cache descartado, não na compilação — e isso só é
# falsificável comparando steps entre duas execuções.
#
# O relatório registra a arquitetura do host e a plataforma alvo de propósito:
# um build sob emulação QEMU custa múltiplos do nativo, e sem esse par uma
# medição lenta fica ambígua entre "o Dockerfile está ruim" e "o host está
# emulando".

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

OUT_DIR="$REPO_ROOT/.build-metrics"
IMAGE_TAG="lp-paradis:measure"

MODE="cold"
CACHE_FLAG="--no-cache"
PLATFORM=""

while [ $# -gt 0 ]; do
  case "$1" in
    --warm)
      MODE="warm"
      CACHE_FLAG=""
      shift
      ;;
    --platform)
      PLATFORM="${2:-}"
      if [ -z "$PLATFORM" ]; then
        echo "erro: --platform exige um valor (ex.: linux/amd64)" >&2
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      sed -n '3,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "erro: opção desconhecida '$1'" >&2
      exit 2
      ;;
  esac
done

if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "erro: o daemon do Docker não está acessível. Suba o Docker e tente de novo." >&2
  exit 3
fi

mkdir -p "$OUT_DIR"

# Nome do relatório: instante UTC + commit curto. Nunca colide, então execuções
# anteriores nunca são sobrescritas e duas medições ficam comparáveis lado a lado.
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo "sem-git")"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  COMMIT_STATE="$COMMIT (árvore suja)"
else
  COMMIT_STATE="$COMMIT (árvore limpa)"
fi

BASENAME="$STAMP-$COMMIT-$MODE"
REPORT="$OUT_DIR/$BASENAME.md"
RAW_LOG="$OUT_DIR/$BASENAME.log"

HOST_ARCH="$(uname -m) ($(uname -s | tr '[:upper:]' '[:lower:]'))"
DOCKER_ARCH="$(docker info --format '{{.Architecture}}/{{.OSType}}' 2>/dev/null || echo "desconhecida")"
if [ -n "$PLATFORM" ]; then
  TARGET_PLATFORM="$PLATFORM (explícita)"
  PLATFORM_ARGS=(--platform "$PLATFORM")
else
  # Sem --platform o BuildKit usa a plataforma do daemon. Registramos o que ele
  # reporta para que o relatório nunca fique sem essa informação.
  TARGET_PLATFORM="$(docker info --format '{{.OSType}}/{{.Architecture}}' 2>/dev/null || echo "desconhecida") (padrão do daemon)"
  PLATFORM_ARGS=()
fi

echo "medindo build ($MODE) — relatório: ${REPORT#"$REPO_ROOT"/}"

START="$(date +%s)"
# shellcheck disable=SC2086  # $CACHE_FLAG é intencionalmente vazio no modo warm
DOCKER_BUILDKIT=1 docker build \
  $CACHE_FLAG \
  --progress=plain \
  "${PLATFORM_ARGS[@]}" \
  --tag "$IMAGE_TAG" \
  . 2>&1 | tee "$RAW_LOG"
BUILD_EXIT="${PIPESTATUS[0]}"
END="$(date +%s)"
TOTAL=$((END - START))

# O BuildKit em --progress=plain emite, por step:
#   #12 [builder 4/9] RUN pnpm build      <- cabeçalho, dá o nome
#   #12 3.214 <saída do comando>          <- ruído
#   #12 DONE 45.2s                        <- duração
#   #12 CACHED                            <- ou reaproveitado
#   #12 ERROR: ...                        <- ou falhou
# Só o cabeçalho e a linha terminal interessam.
awk '
  /^#[0-9]+ / {
    id = substr($1, 2)
    rest = $0
    sub(/^#[0-9]+ /, "", rest)

    if (rest ~ /^DONE /)  { d = rest; sub(/^DONE /, "", d); sub(/s$/, "", d)
                            dur[id] = d + 0; state[id] = "DONE";   next }
    if (rest ~ /^CACHED/) { dur[id] = 0;     state[id] = "CACHED"; next }
    if (rest ~ /^ERROR/)  {                  state[id] = "ERROR";  next }

    # A primeira linha de um id que não seja terminal é o cabeçalho do step.
    # Vale tanto para os steps do Dockerfile (`[build 4/7] RUN …`) quanto para
    # os sintéticos do BuildKit (`exporting to image`), que não têm colchetes
    # mas custam tempo real e precisam aparecer no relatório.
    if (!(id in name)) { name[id] = rest; order[++n] = id }
    next
  }
  END {
    for (i = 1; i <= n; i++) {
      id = order[i]
      if (!(id in state)) continue
      printf "%.1f\t%s\t#%s\t%s\n", (id in dur ? dur[id] : 0), state[id], id, name[id]
    }
  }
' "$RAW_LOG" > "$OUT_DIR/.$BASENAME.steps"

{
  echo "# Medição de build — $STAMP"
  echo
  echo "| campo | valor |"
  echo "|---|---|"
  echo "| commit | \`$COMMIT_STATE\` |"
  echo "| modo | $MODE ($([ "$MODE" = cold ] && echo '--no-cache' || echo 'com cache')) |"
  echo "| arquitetura do host | $HOST_ARCH |"
  echo "| arquitetura do daemon | $DOCKER_ARCH |"
  echo "| plataforma alvo | $TARGET_PLATFORM |"
  echo "| tempo total | ${TOTAL}s |"
  echo "| código de saída | $BUILD_EXIT |"
  echo
  echo "## Steps por duração"
  echo
  echo "| dur (s) | estado | step |"
  echo "|--------:|--------|------|"
  sort -rn "$OUT_DIR/.$BASENAME.steps" | while IFS="$(printf '\t')" read -r d s id label; do
    echo "| $d | $s | \`$id\` $label |"
  done
  echo
  echo "## Steps na ordem de execução"
  echo
  echo "| dur (s) | estado | step |"
  echo "|--------:|--------|------|"
  while IFS="$(printf '\t')" read -r d s id label; do
    echo "| $d | $s | \`$id\` $label |"
  done < "$OUT_DIR/.$BASENAME.steps"
  echo
  if [ "$BUILD_EXIT" -ne 0 ]; then
    echo "## Falha"
    echo
    echo "O build terminou com código $BUILD_EXIT. Últimas 80 linhas:"
    echo
    echo '```'
    tail -n 80 "$RAW_LOG"
    echo '```'
    echo
  fi
  echo "Log completo: \`${RAW_LOG#"$REPO_ROOT"/}\`"
} > "$REPORT"

rm -f "$OUT_DIR/.$BASENAME.steps"

echo "relatório: ${REPORT#"$REPO_ROOT"/}"
echo "total: ${TOTAL}s — saída do build: $BUILD_EXIT"

exit "$BUILD_EXIT"
