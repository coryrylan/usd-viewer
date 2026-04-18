# Building the WASM Files

The `wasm/` directory contains pre-built WebAssembly artifacts (`emHdBindings.wasm`,
`emHdBindings.js`, `emHdBindings.data`, `emHdBindings.worker.js`) that are needed at
runtime by the `usd-viewer` web component. This document explains how to rebuild them.

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
2. Build the image `usd-viewer-wasm:local` from the fork's own `Dockerfile`
3. Extract the four `emHdBindings.*` files from the built image
4. Copy them into `wasm/`

### Local

If you already have Emscripten SDK installed (or prefer a native build):

```bash
npm run build:wasm:local
# equivalent to: ./scripts/build-wasm.sh local
```

This installs `emsdk` 4.0.8 into `.build-wasm/emsdk` (if not already present),
clones the fork, then runs:

```bash
python3 ./build_scripts/build_usd.py -v --build-target wasm --js-bindings .build-wasm/USD_emscripten
```

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
| `emHdBindings.wasm` | Compiled WebAssembly binary |
| `emHdBindings.js` | Emscripten JS glue, exposes `getUsdModule()` |
| `emHdBindings.data` | Preloaded virtual filesystem data (`plugInfo.json` etc.) |
| `emHdBindings.worker.js` | Pthread worker (generated because `-pthread` is in the flags) |

The JS API is `window.getUsdModule(null, wasmDir)` — see `src/utils.ts` for the loader.
The linker options that produce this shape are in the fork's
`pxr/usdImaging/hdEmscripten/CMakeLists.txt`:

```cmake
target_link_options(emHdBindings PRIVATE
  "SHELL:-sEXPORT_NAME=getUsdModule -sMODULARIZE=1 -lembind -sFORCE_FILESYSTEM=1")
```

## About COOP/COEP Headers

Because the upstream build uses `-pthread`, the resulting binary requires
`SharedArrayBuffer` and therefore requires these response headers:

```json
"Cross-Origin-Embedder-Policy": "require-corp"
"Cross-Origin-Opener-Policy": "same-origin"
```

The WASM binary declares shared memory at the binary level (`flags=0x03` on its memory
import), which is a hard browser constraint that cannot be bypassed in JavaScript.

To eliminate the header requirement entirely, the WASM would need to be recompiled
without pthreads — a non-trivial effort because:

1. `build_usd.py` hardcodes `-pthread` in its compile/link flags
2. oneTBB (a mandatory USD dependency) forces `-pthread` on Emscripten targets
   ([oneTBB #1280](https://github.com/uxlfoundation/oneTBB/issues/1280))
3. Removing `-pthread` requires patching both `build_usd.py` and oneTBB's CMake
4. USD's work system must be configured with `PXR_WORK_THREAD_LIMIT=1` at runtime

See the "Header Alternatives" section of [README.md](./README.md#why-are-these-headers-required)
for the `coi-serviceworker` approach, which injects the headers client-side without
requiring server configuration.

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
