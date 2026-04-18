# usd-viewer

[![npm version](https://img.shields.io/npm/v/usd-viewer?color=%2334D058&label=usd-viewer)](https://www.npmjs.com/package/usd-viewer)

### [usd-viewer demo](https://usd-viewer.web.app/usd-viewer-interactive-iframe)

**Experimental** Web Component for rendering USDZ 3d format. Built on the experimental work and efforts of [github.com/autodesk-forks/USD/tree/release](https://github.com/autodesk-forks/USD/tree/release)

## Instalation

```shell
npm install usd-viewer
```

## Web Assembly Dependencies

### Cross-Origin Isolation Headers

The current WASM binary is compiled with Emscripten pthreads support, which requires
[SharedArrayBuffer](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer).
Browsers only expose `SharedArrayBuffer` on [cross-origin isolated](https://web.dev/articles/cross-origin-isolation-guide) pages,
so the following response headers must be set by your server:

```json
"Cross-Origin-Embedder-Policy": "require-corp"
"Cross-Origin-Opener-Policy": "same-origin"
```

> **Note:** Using `"Cross-Origin-Embedder-Policy": "credentialless"` instead of `"require-corp"` is less
> restrictive and still enables `SharedArrayBuffer`. It allows cross-origin resources to load without
> requiring a `Cross-Origin-Resource-Policy` header on each resource. Supported in Chrome 96+ and Firefox 119+.

#### Why Are These Headers Required?

The WASM binary (`emHdBindings.wasm`) declares shared memory (`flags=0x03`) at the WebAssembly level.
This is a hard constraint enforced by the browser engine — the binary cannot be instantiated without
`SharedArrayBuffer`-backed memory. The threading support is used for USD scene parsing and Hydra
rendering via Emscripten pthreads (Web Workers + shared memory).

**This requirement cannot be removed by modifying JavaScript alone.** The WASM binary must be
recompiled without pthreads to eliminate the header requirement entirely. See
[BUILDING.md](./BUILDING.md) for details on producing a single-threaded build.

#### Alternatives to Server-Side Headers

If you cannot configure server response headers (e.g., on static hosting without header support),
you can use [coi-serviceworker](https://github.com/nicolestandifer3/coi-serviceworker) to inject
the headers client-side via a Service Worker. Note that this requires a page reload on first visit.

### Loading WASM Files

To load the Wasm dependencies in the browser copy them from the `node_modules` into your host env.

```
cpy node_modules/usd-viewer/wasm/**/* dist/wasm
```

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

## Licensing

The Web Component of this project is MIT licensed, however refer to the following external dependencies and explicitly marked file headers. For additional license details see:
- https://github.com/autodesk-forks/USD
- https://github.com/autodesk-forks/USD/tree/gh-pages/usd_for_web_demos