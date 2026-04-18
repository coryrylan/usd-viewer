#!/usr/bin/env bash
# Rebuild the WASM files in wasm/ from the Autodesk USD fork.
#
# Produces:
#   wasm/emHdBindings.wasm
#   wasm/emHdBindings.js
#   wasm/emHdBindings.data
#   wasm/emHdBindings.worker.js
#
# Usage:
#   scripts/build-wasm.sh           # Docker build (default, most reproducible)
#   scripts/build-wasm.sh local     # Local emsdk build
#   scripts/build-wasm.sh clean     # Remove the .build-wasm working directory
#
# Environment variables:
#   USD_REPO_URL       (default: https://github.com/autodesk-forks/USD.git)
#   USD_REPO_REF       (default: adsk/feature/wasm — branch containing hdEmscripten)
#                      For reproducible builds, pin to a specific commit SHA.
#   EMSDK_VERSION      (default: 4.0.8 — pinned by upstream Dockerfile)
#   WORKDIR            (default: ./.build-wasm)
#   OUT_DIR            (default: ./wasm)

set -euo pipefail

USD_REPO_URL="${USD_REPO_URL:-https://github.com/autodesk-forks/USD.git}"
USD_REPO_REF="${USD_REPO_REF:-adsk/feature/wasm}"
EMSDK_VERSION="${EMSDK_VERSION:-4.0.8}"
WORKDIR="${WORKDIR:-$(pwd)/.build-wasm}"
OUT_DIR="${OUT_DIR:-$(pwd)/wasm}"
MODE="${1:-docker}"

OUTPUTS=(
  emHdBindings.wasm
  emHdBindings.js
  emHdBindings.data
  emHdBindings.worker.js
)

log() { printf '\033[1;34m[build-wasm]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[build-wasm]\033[0m %s\n' "$*" >&2; exit 1; }

clone_or_update_usd() {
  if [[ ! -d "$WORKDIR/USD" ]]; then
    log "Cloning $USD_REPO_URL @ $USD_REPO_REF into $WORKDIR/USD"
    git clone --recursive "$USD_REPO_URL" "$WORKDIR/USD"
    git -C "$WORKDIR/USD" checkout "$USD_REPO_REF"
    git -C "$WORKDIR/USD" submodule update --init --recursive
  else
    log "Updating existing USD checkout at $WORKDIR/USD"
    git -C "$WORKDIR/USD" fetch origin
    git -C "$WORKDIR/USD" checkout "$USD_REPO_REF"
    git -C "$WORKDIR/USD" submodule update --init --recursive
  fi
  log "USD HEAD: $(git -C "$WORKDIR/USD" rev-parse HEAD)"
}

copy_outputs() {
  local src_bin="$1"
  mkdir -p "$OUT_DIR"
  for f in "${OUTPUTS[@]}"; do
    if [[ ! -f "$src_bin/$f" ]]; then
      die "Expected output missing: $src_bin/$f"
    fi
    cp "$src_bin/$f" "$OUT_DIR/$f"
    log "Copied $f -> $OUT_DIR/$f"
  done
}

build_docker() {
  command -v docker >/dev/null || die "docker not found on PATH"
  mkdir -p "$WORKDIR"
  clone_or_update_usd

  log "Building Docker image (emsdk $EMSDK_VERSION)"
  docker build \
    --build-arg "EMSCRIPTEN_VERSION=$EMSDK_VERSION" \
    -t "usd-viewer-wasm:local" \
    "$WORKDIR/USD"

  log "Extracting artifacts from container"
  local cid
  cid="$(docker create usd-viewer-wasm:local)"
  trap 'docker rm -f "$cid" >/dev/null 2>&1 || true' EXIT
  local tmp_bin="$WORKDIR/docker-extract"
  rm -rf "$tmp_bin"
  mkdir -p "$tmp_bin"
  for f in "${OUTPUTS[@]}"; do
    docker cp "$cid:/usd/USD_emscripten/bin/$f" "$tmp_bin/$f"
  done
  copy_outputs "$tmp_bin"
}

build_local() {
  command -v python3 >/dev/null || die "python3 not found on PATH"
  command -v cmake >/dev/null   || die "cmake not found on PATH (>= 3.27 recommended)"
  mkdir -p "$WORKDIR"

  if [[ ! -d "$WORKDIR/emsdk" ]]; then
    log "Installing emsdk $EMSDK_VERSION into $WORKDIR/emsdk"
    git clone --recursive https://github.com/emscripten-core/emsdk "$WORKDIR/emsdk"
  fi
  ( cd "$WORKDIR/emsdk" && ./emsdk install "$EMSDK_VERSION" && ./emsdk activate "$EMSDK_VERSION" )
  # shellcheck source=/dev/null
  source "$WORKDIR/emsdk/emsdk_env.sh"

  clone_or_update_usd

  local install_dir="$WORKDIR/USD_emscripten"
  log "Running build_usd.py --build-target wasm --js-bindings $install_dir"
  ( cd "$WORKDIR/USD" && python3 ./build_scripts/build_usd.py -v --build-target wasm --js-bindings "$install_dir" )

  copy_outputs "$install_dir/bin"
}

clean() {
  if [[ -d "$WORKDIR" ]]; then
    log "Removing $WORKDIR"
    rm -rf "$WORKDIR"
  else
    log "Nothing to clean ($WORKDIR does not exist)"
  fi
}

case "$MODE" in
  docker) build_docker ;;
  local)  build_local ;;
  clean)  clean ;;
  *)      die "Unknown mode: $MODE (expected: docker | local | clean)" ;;
esac

log "Done. WASM files are in $OUT_DIR"
