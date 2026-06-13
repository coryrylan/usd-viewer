# Building the WASM Files

The `wasm/` directory contains pre-built WebAssembly artifacts that are needed at
runtime by the `usd-viewer` web component, in two variants:

- **Threaded** (`wasm/emHdBindings.{wasm,js,data,worker.js}`) — Emscripten pthreads
  build; fastest, but requires COOP/COEP headers (cross-origin isolation).
- **Single-threaded** (`wasm/st/emHdBindings.{wasm,js,data}`) — no pthreads, no
  `SharedArrayBuffer`, runs without any special headers on static hosts/CDNs.

The loader in `src/utils.ts` picks the variant at runtime based on
`SharedArrayBuffer` availability. This document explains how to rebuild both.

## Which Source Should I Use?

There are two separate WASM-capable forks of USD, and they are **not interchangeable**:

| Source | Ships `hdEmscripten` (Hydra JS bindings) | Notes |
|--------|-------------------------------------------|-------|
| [PixarAnimationStudios/OpenUSD](https://github.com/PixarAnimationStudios/OpenUSD) (official) | **No** | Official WASM target is data-layer only; `-DPXR_BUILD_IMAGING=OFF` is mandatory. No `emHdBindings.js` / `HdWebSyncDriver` / `getUsdModule()`. |
| [autodesk-forks/USD @ `adsk/feature/wasm`](https://github.com/autodesk-forks/USD/tree/adsk/feature/wasm) | **Yes** | Contains `pxr/usdImaging/hdEmscripten` which produces the `emHdBindings.*` files usd-viewer depends on. |

**usd-viewer's rendering pipeline (`src/element.ts` → `new RenderDelegateInterface(...).driver.Draw()`)
depends on the Autodesk fork's Hydra JS bindings.** There is currently no upstream replacement —
Pixar has not accepted an `hdEmscripten` equivalent into the official repo.

Until that changes, **rebuild from the Autodesk fork**. The script below follows the
build commands and versions documented in the fork's own `Dockerfile` and
`pxr/usdImaging/hdEmscripten/README.md`, which are in turn modeled on the official
OpenUSD `build_usd.py --build-target wasm` convention.

## Quick Start

### Docker (recommended)

Reproducible build that mirrors the upstream Dockerfile (Ubuntu 23.04, emsdk 4.0.8,
CMake 3.27.9):

```bash
npm run build:wasm
# equivalent to: ./scripts/build-wasm.sh docker
```

The script will:
1. Clone `autodesk-forks/USD` at the `adsk/feature/wasm` branch into `.build-wasm/USD`
2. Build the image `usd-viewer-wasm:local` from the fork's own `Dockerfile` and
   extract the four threaded `emHdBindings.*` files into `wasm/`
3. Patch the fork's `build_usd.py` to drop `-pthread`
   (see `scripts/patch-build-usd-single-thread.py`), build a second image
   `usd-viewer-wasm:local-st`, and extract the three single-threaded files into
   `wasm/st/` (the patch is reverted afterwards)

To build only one variant, set `VARIANTS`:

```bash
VARIANTS=st npm run build:wasm        # only the single-threaded build
VARIANTS=threaded npm run build:wasm  # only the threaded build
```

### Local

If you already have Emscripten SDK installed (or prefer a native build):

```bash
npm run build:wasm:local
# equivalent to: ./scripts/build-wasm.sh local
```

This installs `emsdk` 4.0.8 into `.build-wasm/emsdk` (if not already present),
clones the fork, then runs (per variant, with the single-threaded variant
building from the patched tree into `.build-wasm/USD_emscripten_st`):

```bash
python3 ./build_scripts/build_usd.py -v --build-target wasm --js-bindings .build-wasm/USD_emscripten
```

The `VARIANTS` environment variable works the same as in Docker mode.

### Clean

Remove the working directory:

```bash
./scripts/build-wasm.sh clean
```

## Pinning for Reproducibility

By default the script follows the moving `adsk/feature/wasm` branch. For reproducible
builds, pin to a specific commit SHA via the environment variable:

```bash
USD_REPO_REF=abc1234 npm run build:wasm
```

After a successful build, record the commit hash printed by the script
(`USD HEAD: ...`) in your release notes so the artifact can be reproduced later.

## Prerequisites

### Docker mode
- Docker 20+
- ~8 GB free disk space for the image
- ~8 GB RAM during the build

### Local mode
- Python 3.9+
- CMake 3.27+ (pinned to 3.27.9 in upstream Dockerfile)
- Git
- ~8 GB free disk space
- ~8 GB RAM during the build
- The script installs `emsdk` 4.0.8 automatically

## What the Build Produces

After a successful run, `wasm/` will contain:

| File | Purpose |
|------|---------|
| `emHdBindings.wasm` | Compiled WebAssembly binary (threaded) |
| `emHdBindings.js` | Emscripten JS glue, exposes `getUsdModule()` |
| `emHdBindings.data` | Preloaded virtual filesystem data (`plugInfo.json` etc.) |
| `emHdBindings.worker.js` | Pthread worker (generated because `-pthread` is in the flags) |
| `st/emHdBindings.wasm` | Single-threaded WebAssembly binary (non-shared memory) |
| `st/emHdBindings.js` | JS glue for the single-threaded build |
| `st/emHdBindings.data` | Virtual filesystem data for the single-threaded build |

The single-threaded build produces no `worker.js` because no pthread workers
are ever spawned.

The JS API is `window.getUsdModule(null, wasmDir)` — see `src/utils.ts` for the loader.
The linker options that produce this shape are in the fork's
`pxr/usdImaging/hdEmscripten/CMakeLists.txt`:

```cmake
target_link_options(emHdBindings PRIVATE
  "SHELL:-sEXPORT_NAME=getUsdModule -sMODULARIZE=1 -lembind -sFORCE_FILESYSTEM=1")
```

## About COOP/COEP Headers and the Single-Threaded Variant

Because the upstream build uses `-pthread`, the threaded binary requires
`SharedArrayBuffer` and therefore requires these response headers:

```json
"Cross-Origin-Embedder-Policy": "require-corp"
"Cross-Origin-Opener-Policy": "same-origin"
```

The threaded WASM binary declares shared memory at the binary level (`flags=0x03` on
its memory import), which is a hard browser constraint that cannot be bypassed in
JavaScript.

The single-threaded variant in `wasm/st/` eliminates this requirement by recompiling
without pthreads. `scripts/patch-build-usd-single-thread.py` applies the necessary
changes to the fork's `build_usd.py` before that variant is built:

1. Drops `-pthread` from the hardcoded compile/link flag constants and from
   `GetWasmCompilerFlags()` (covers USD itself, MaterialX, Dawn, etc.)
2. Passes `-DEMSCRIPTEN_WITHOUT_PTHREAD=ON` to oneTBB — supported since
   oneTBB v2021.12.0, the exact version `build_usd.py` pins, so oneTBB no
   longer re-injects `-pthread` on Emscripten targets
   (resolves [oneTBB #1280](https://github.com/uxlfoundation/oneTBB/issues/1280))
3. Stops the Dawn/webgpu Emscripten port patch from re-adding `-pthread`

Each substitution is verified to match exactly once, so the patch script fails
loudly if the upstream branch changes rather than silently producing a
still-threaded binary. Without `-pthread`, Emscripten provides a stub pthread
API and the oneTBB scheduler runs everything inline on the main thread, so no
runtime thread-limit configuration is needed.

See [README.md](./README.md#alternative-injecting-headers-client-side)
for the `coi-serviceworker` approach, which instead injects the headers
client-side to get *threaded* performance without server configuration.

## Troubleshooting

**`OneTBB is required for WebAssembly builds`**
This is expected. The script runs with `--build-target wasm`, which auto-enables
`--build-onetbb` and downloads oneTBB. If you see this error outside of the script,
add `--build-onetbb` or let the flag be set implicitly by `--build-target wasm`.

**Out of memory during compilation**
Lower parallelism by editing `scripts/build-wasm.sh` to pass `-j 2` to `emmake`, or
increase available RAM.

**Docker build fails on M-series Macs**
The upstream Dockerfile uses `FROM ubuntu:23.04`. On Apple Silicon, prefix with
`DOCKER_DEFAULT_PLATFORM=linux/amd64` before running the script. Emulation will be
slower but functional.

**Artifact mismatch between Docker and local builds**
emsdk 4.0.8 is pinned in both paths, but local builds inherit the host's CMake
and compiler versions. Prefer the Docker path for release artifacts.

## References

- Autodesk fork, `adsk/feature/wasm` branch: https://github.com/autodesk-forks/USD/tree/adsk/feature/wasm
- `hdEmscripten` README: https://github.com/autodesk-forks/USD/blob/adsk/feature/wasm/pxr/usdImaging/hdEmscripten/README.md
- `hdEmscripten` CMakeLists: https://github.com/autodesk-forks/USD/blob/adsk/feature/wasm/pxr/usdImaging/hdEmscripten/CMakeLists.txt
- Upstream Dockerfile: https://github.com/autodesk-forks/USD/blob/adsk/feature/wasm/Dockerfile
- Official OpenUSD WebAssembly build docs (data-layer only): https://github.com/PixarAnimationStudios/OpenUSD#webassembly
- Emscripten toolchain: https://emscripten.org/docs/getting_started/downloads.html
