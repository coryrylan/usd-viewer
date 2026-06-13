# usd-viewer

[![npm version](https://img.shields.io/npm/v/usd-viewer?color=%2334D058&label=usd-viewer)](https://www.npmjs.com/package/usd-viewer)

### [usd-viewer demo](https://usd-viewer.web.app/interactive)

**Experimental** Web Component for rendering USDZ 3d format. Built on the experimental work and efforts of [github.com/autodesk-forks/USD/tree/release](https://github.com/autodesk-forks/USD/tree/release)

## Instalation

```shell
npm install usd-viewer
```

## Web Assembly Dependencies

### WASM Variants: Threaded and Single-Threaded

The package ships two builds of the USD WASM runtime, and the component picks
between them automatically at runtime:

| Variant | Location | Requirements | Performance |
|---------|----------|--------------|-------------|
| Threaded (default) | `wasm/` | COOP/COEP headers (cross-origin isolation) | Multi-threaded USD parsing and Hydra rendering |
| Single-threaded fallback | `wasm/st/` | **None** — works on any static host/CDN | Slower first render on large scenes |

If the page is [cross-origin isolated](https://web.dev/articles/cross-origin-isolation-guide)
(`SharedArrayBuffer` available), the threaded build is loaded. Otherwise the
single-threaded build is loaded — no server configuration required. Just make
sure both variants are copied to your host (see [Loading WASM Files](#loading-wasm-files)).

### Cross-Origin Isolation Headers (optional, for best performance)

The threaded build is compiled with Emscripten pthreads, which requires
[SharedArrayBuffer](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).
Browsers only expose `SharedArrayBuffer` on cross-origin isolated pages, so to
get the threaded build your server must set these response headers:

```json
"Cross-Origin-Embedder-Policy": "require-corp"
"Cross-Origin-Opener-Policy": "same-origin"
```

> **Note:** Using `"Cross-Origin-Embedder-Policy": "credentialless"` instead of `"require-corp"` is less
> restrictive and still enables `SharedArrayBuffer`. It allows cross-origin resources to load without
> requiring a `Cross-Origin-Resource-Policy` header on each resource. Supported in Chrome 96+ and Firefox 119+.

Many static hosts support custom headers (Netlify and Cloudflare Pages via a
`_headers` file, Vercel via `vercel.json`, Firebase via `firebase.json`).
GitHub Pages and plain CDN buckets do not — those deployments use the
single-threaded fallback automatically.

#### Why Does the Threaded Build Need These Headers?

Its WASM binary (`wasm/emHdBindings.wasm`) declares shared memory (`flags=0x03`) at the WebAssembly level.
This is a hard constraint enforced by the browser engine — the binary cannot be instantiated without
`SharedArrayBuffer`-backed memory. The threading support is used for USD scene parsing and Hydra
rendering via Emscripten pthreads (Web Workers + shared memory). The single-threaded
build in `wasm/st/` is compiled without pthreads, so it has no such constraint.
See [BUILDING.md](./BUILDING.md) for how both variants are produced.

#### Alternative: Injecting Headers Client-Side

If you want threaded performance on a host without header support,
[coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) can inject
the headers client-side via a Service Worker. Note that this requires a page
reload on first visit and does not work in cross-origin iframes.

### Loading WASM Files

To load the Wasm dependencies in the browser copy them from the `node_modules` into your host env.

```
cpy node_modules/usd-viewer/wasm/**/* dist/wasm
```

The copy must preserve the directory structure so the single-threaded fallback
remains available at `dist/wasm/st/`.

To change the default path (`./wasm`) of the Wasm resources add the following meta tag to the document.

```html
<meta name="usd-viewer:wasm" content="custom-path/wasm" />
```

### Rebuilding WASM Files

The WASM files in `wasm/` are built from the Autodesk USD fork. To rebuild them
(for example when picking up upstream fixes):

```shell
npm run build:wasm        # Docker-based reproducible build (recommended)
npm run build:wasm:local  # Local build using emsdk
```

See [BUILDING.md](./BUILDING.md) for details, version pinning, and troubleshooting.

## Usage

```html
<script type="module">
  import 'usd-viewer/include.js';
</script>

<usd-viewer src="./usd/perseverance.usdz" alt="Perseverance Mars Rover"></usd-viewer>
```

## API

| Property          | Attribute           | Type    | Description                                    |
| ----------------- | ------------------- | ------  | ---------------------------------------------- |
| `src`             | `src`               | string  | source path for usd/usdz file                   |
| `alt`             | `alt`               | string  | alt descriptive text                           |
| `controls`        | `conrols`           | boolean | enable or disable model touch/mouse controls   |
| `fileName`         | `file-name`          | boolean | enable or disable display of file name          |
| `autoRotate`      | `auto-rotate`       | boolean | enable or disable auto rotation of model       |
| `autoRotateSpeed` | `auto-rotate-speed` | number  | adjust speed of rotations of model             |
| `minDistance`     | `min-distance`      | number  | minimum zoom distance of model                 |
| `maxDistance`     | `max-distance`      | number  | maximum zoom distance of model                 |
| `zoom`            | `zoom`              | number  | default zoom level of camera relative to model |

## Development

This project uses [pnpm](https://pnpm.io) and [Vite](https://vite.dev). The demo
site is built with [NVIDIA Elements](https://nvidia.github.io/elements/) web
components for its UI.

```shell
pnpm install        # install dependencies
pnpm dev            # start the Vite dev server (basic / interactive / multiple examples)
pnpm build          # build the demo site (dist) and the publishable library (dist/lib)
pnpm preview        # preview the production build
pnpm deploy         # deploy the demo site to Firebase hosting
```

The demo pages live at the project root (`index.html`, `single.html`,
`multi.html`) with their entry points under `demo/`. The `interactive` example
uses `nve-page`, `nve-page-panel`, and Elements form controls for its control
panel.

## Licensing

The Web Component of this project is MIT licensed, however refer to the following external dependencies and explicitly marked file headers. For additional license details see:
- https://github.com/autodesk-forks/USD
- https://github.com/autodesk-forks/USD/tree/gh-pages/usd_for_web_demos