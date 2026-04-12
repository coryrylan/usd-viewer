# Building WASM Without Pthreads (Eliminating COOP/COEP Headers)

The pre-built WASM files in `wasm/` were compiled from
[Autodesk's USD fork](https://github.com/autodesk-forks/USD/tree/gh-pages/usd_for_web_demos)
with Emscripten pthreads enabled. This makes `SharedArrayBuffer` (and therefore COOP/COEP
response headers) mandatory.

To eliminate the header requirement entirely, the WASM must be recompiled without pthreads.

## Background

The binary declares shared memory at the WebAssembly level (`flags=0x03` on memory import).
Browsers enforce that shared WASM memory requires `SharedArrayBuffer`, which is only available
on cross-origin isolated pages. The JS glue code (`emHdBindings.js`) additionally validates
`SharedArrayBuffer` at runtime and throws `"bad memory"` if unavailable.

A single-threaded build would:
- Use standard `ArrayBuffer` instead of `SharedArrayBuffer`
- Not generate `emHdBindings.worker.js`
- Not use `Atomics.*` operations
- Not require COOP/COEP headers

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) | 3.x+ | WASM compiler toolchain |
| [CMake](https://cmake.org/) | 3.14+ | Build configuration |
| Python | 3.x | Build script runner |
| RAM | ~8 GB | Compilation is memory-intensive |

## Source

As of OpenUSD v26.03 (March 2026), Pixar officially supports WASM compilation:

```bash
git clone -b v26.03 https://github.com/PixarAnimationStudios/OpenUSD.git
```

Alternatively, use the Autodesk fork (the original source of the current WASM files):

```bash
git clone -b release https://github.com/autodesk-forks/USD.git
```

## Build Steps

### 1. Install Emscripten

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### 2. Modify Build Flags

In `build_scripts/build_usd.py` (or the relevant CMake configuration), locate the WASM
target flags and make these changes:

**Remove:**
- `-pthread` from both compile and link flags
- `-s USE_PTHREADS=1`
- `-s PTHREAD_POOL_SIZE=N`
- `-s SHARED_MEMORY=1`
- `-s PROXY_TO_PTHREAD`

**Keep/add:**
- `-s ALLOW_MEMORY_GROWTH=1`
- `-s MODULARIZE=1`
- `-s EXPORT_ES6=0`

### 3. Patch oneTBB for Single-Threaded WASM

USD depends on oneTBB for task-based parallelism. Newer oneTBB versions force `-pthread`,
which is the primary blocker. See [oneTBB issue #1280](https://github.com/uxlfoundation/oneTBB/issues/1280).

Options:
- **Patch oneTBB CMake**: Remove the `-pthread` requirement for Emscripten targets in
  oneTBB's `CMakeLists.txt`
- **Use an older TBB version**: Older versions allowed compilation without `-pthread`,
  falling back to a single-threaded internal scheduler
- **Set `PXR_WORK_THREAD_LIMIT=1`**: Forces USD's work system (`WorkDispatcher`,
  `WorkParallelForN`) to execute all tasks sequentially on the calling thread

### 4. Build

```bash
python3 ./build_scripts/build_usd.py --build-target wasm ../build_dir
```

### 5. Optimize

```bash
wasm-opt -Oz \
  -o ../build_dir/bin/emHdBindings.wasm \
  ../build_dir/bin/emHdBindings.wasm \
  --enable-bulk-memory
```

Note: Do **not** pass `--enable-threads` (unlike the pthreads build).

### 6. Copy Output to usd-viewer

```bash
cp ../build_dir/bin/emHdBindings.wasm  ./wasm/
cp ../build_dir/bin/emHdBindings.js    ./wasm/
cp ../build_dir/bin/emHdBindings.data  ./wasm/
rm ./wasm/emHdBindings.worker.js  # No longer generated
```

### 7. Update Configuration

Remove COOP/COEP headers from:
- `firebase.json` (lines 12-24)
- `blueprint.config.js` (lines 15-18, `responseHeaders` block)

## Verification

1. Confirm the WASM binary no longer declares shared memory:
   ```bash
   wasm-objdump -h emHdBindings.wasm | grep -i shared
   # Should show no shared flag
   ```

2. Confirm the JS glue has no `SharedArrayBuffer` references:
   ```bash
   grep -c "SharedArrayBuffer" wasm/emHdBindings.js
   # Should be 0
   ```

3. Serve without COOP/COEP headers and verify in browser:
   ```javascript
   console.log(crossOriginIsolated);  // false — and that's OK now
   ```

4. Load a sample `.usdz` file and verify rendering works.

5. Compare rendering output and load times against the pthreads build.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| oneTBB refuses to compile without pthreads | High | Patch CMake or use older version |
| USD code paths assume threads exist | Medium | `PXR_WORK_THREAD_LIMIT=1` handles most cases |
| Performance degradation | Medium | USD parsing becomes sequential; Three.js rendering is unaffected |
| Stack overflow from recursive task dispatch | Low | Unlikely for typical USD scenes |

## Known Build Issue

The build can fail due to comments in `pxr/base/arch/hints.h` (lines 1-26).
Workaround: remove all comments from those lines.

## References

- [Emscripten Pthreads Documentation](https://emscripten.org/docs/porting/pthreads.html)
- [OpenUSD Work/Multi-threaded Dispatch](https://openusd.org/dev/api/work_page_front.html)
- [OpenUSD Threading Model](https://openusd.org/dev/api/_usd__page__multi_threading.html)
- [oneTBB WASM Support](https://github.com/uxlfoundation/oneTBB/blob/master/WASM_Support.md)
- [Using WebAssembly threads from C, C++ and Rust](https://web.dev/articles/webassembly-threads)
