# Single-Threaded WASM Variant

This directory holds the single-threaded build of the USD WASM runtime
(`emHdBindings.js`, `emHdBindings.wasm`, `emHdBindings.data` — no
`emHdBindings.worker.js`, since no pthread workers are spawned).

The loader (`src/utils.ts`) falls back to this variant automatically when the
page is not cross-origin isolated (i.e. `SharedArrayBuffer` is unavailable),
so the component works on static hosts/CDNs that cannot set the COOP/COEP
response headers required by the threaded build in the parent directory.

Generate the artifacts with:

```shell
npm run build:wasm          # builds both variants (Docker)
VARIANTS=st npm run build:wasm   # builds only this variant
```

See [BUILDING.md](../../BUILDING.md) for details. Until the artifacts are
generated and committed, pages without cross-origin isolation will fail with
a descriptive load error instead of rendering.
