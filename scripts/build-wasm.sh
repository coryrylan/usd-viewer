#!/usr/bin/env bash
# Rebuild the WASM files in wasm/ from the Autodesk USD fork.
#
# Builds two variants by default:
#
#   threaded (pthreads, requires COOP/COEP headers / SharedArrayBuffer):
#     wasm/emHdBindings.wasm
#     wasm/emHdBindings.js
#     wasm/emHdBindings.data
#     wasm/emHdBindings.worker.js
#
#   st (single-threaded, runs without any special headers):
#     wasm/st/emHdBindings.wasm
#     wasm/st/emHdBindings.js
#     wasm/st/emHdBindings.data
#
# The st variant is produced by patching the fork's build_usd.py to drop
# -pthread (see scripts/patch-build-usd-single-thread.py). The loader in
# src/utils.ts picks the variant at runtime based on SharedArrayBuffer
# availability.
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
#   VARIANTS           (default: "threaded st" — space-separated subset to build)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USD_REPO_URL="${USD_REPO_URL:-https://github.com/autodesk-forks/USD.git}"
USD_REPO_REF="${USD_REPO_REF:-adsk/feature/wasm}"
EMSDK_VERSION="${EMSDK_VERSION:-4.0.8}"
WORKDIR="${WORKDIR:-$(pwd)/.build-wasm}"
OUT_DIR="${OUT_DIR:-$(pwd)/wasm}"
VARIANTS="${VARIANTS:-threaded st}"
MODE="${1:-docker}"

THREADED_OUTPUTS=(
  emHdBindings.wasm
  emHdBindings.js
  emHdBindings.data
  emHdBindings.worker.js
)

# No emHdBindings.worker.js — single-threaded builds spawn no pthread workers.
ST_OUTPUTS=(
  emHdBindings.wasm
  emHdBindings.js
  emHdBindings.data
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

# The single-threaded variant builds from a patched checkout. Always restore
# the pristine tree afterwards (and on unexpected exit) so a later threaded
# build can't silently pick up the no-pthread patch.
restore_usd_tree() {
  git -C "$WORKDIR/USD" checkout -- build_scripts/build_usd.py 2>/dev/null || true
}

apply_st_patch() {
  log "Patching build_usd.py to drop -pthread (single-threaded variant)"
  python3 "$SCRIPT_DIR/patch-build-usd-single-thread.py" \
    "$WORKDIR/USD/build_scripts/build_usd.py"
}

# copy_outputs <src_bin_dir> <dest_dir> <file...>
copy_outputs() {
  local src_bin="$1" dest="$2"
  shift 2
  mkdir -p "$dest"
  for f in "$@"; do
    if [[ ! -f "$src_bin/$f" ]]; then
      die "Expected output missing: $src_bin/$f"
    fi
    cp "$src_bin/$f" "$dest/$f"
    log "Copied $f -> $dest/$f"
  done
}

# extract_from_image <image> <dest_dir> <file...>
extract_from_image() {
  local image="$1" dest="$2"
  shift 2
  local cid
  cid="$(docker create "$image")"
  local tmp_bin="$WORKDIR/docker-extract"
  rm -rf "$tmp_bin"
  mkdir -p "$tmp_bin"
  for f in "$@"; do
    docker cp "$cid:/usd/USD_emscripten/bin/$f" "$tmp_bin/$f"
  done
  docker rm -f "$cid" >/dev/null 2>&1 || true
  copy_outputs "$tmp_bin" "$dest" "$@"
}

build_docker() {
  command -v docker >/dev/null || die "docker not found on PATH"
  mkdir -p "$WORKDIR"
  clone_or_update_usd
  trap restore_usd_tree EXIT

  for variant in $VARIANTS; do
    case "$variant" in
      threaded)
        restore_usd_tree
        log "Building Docker image for threaded variant (emsdk $EMSDK_VERSION)"
        docker build \
          --build-arg "EMSCRIPTEN_VERSION=$EMSDK_VERSION" \
          -t "usd-viewer-wasm:local" \
          "$WORKDIR/USD"
        log "Extracting threaded artifacts"
        extract_from_image "usd-viewer-wasm:local" "$OUT_DIR" "${THREADED_OUTPUTS[@]}"
        ;;
      st)
        restore_usd_tree
        apply_st_patch
        log "Building Docker image for single-threaded variant (emsdk $EMSDK_VERSION)"
        docker build \
          --build-arg "EMSCRIPTEN_VERSION=$EMSDK_VERSION" \
          -t "usd-viewer-wasm:local-st" \
          "$WORKDIR/USD"
        restore_usd_tree
        log "Extracting single-threaded artifacts"
        extract_from_image "usd-viewer-wasm:local-st" "$OUT_DIR/st" "${ST_OUTPUTS[@]}"
        ;;
      *) die "Unknown variant: $variant (expected: threaded | st)" ;;
    esac
  done
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
  trap restore_usd_tree EXIT

  for variant in $VARIANTS; do
    case "$variant" in
      threaded)
        restore_usd_tree
        local install_dir="$WORKDIR/USD_emscripten"
        log "Running build_usd.py --build-target wasm --js-bindings $install_dir (threaded)"
        ( cd "$WORKDIR/USD" && python3 ./build_scripts/build_usd.py -v --build-target wasm --js-bindings "$install_dir" )
        copy_outputs "$install_dir/bin" "$OUT_DIR" "${THREADED_OUTPUTS[@]}"
        ;;
      st)
        restore_usd_tree
        apply_st_patch
        local install_dir_st="$WORKDIR/USD_emscripten_st"
        log "Running build_usd.py --build-target wasm --js-bindings $install_dir_st (single-threaded)"
        ( cd "$WORKDIR/USD" && python3 ./build_scripts/build_usd.py -v --build-target wasm --js-bindings "$install_dir_st" )
        restore_usd_tree
        copy_outputs "$install_dir_st/bin" "$OUT_DIR/st" "${ST_OUTPUTS[@]}"
        ;;
      *) die "Unknown variant: $variant (expected: threaded | st)" ;;
    esac
  done
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
