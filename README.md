# usd-viewer

[![npm version](https://img.shields.io/npm/v/usd-viewer?color=%2334D058&label=usd-viewer)](https://www.npmjs.com/package/usd-viewer)

### [usd-viewer demo](https://usd-viewer.web.app/usd-viewer-interactive-iframe)

**Experimental** Web Component for rendering USDZ 3d format. Built on the experimental work and efforts of [github.com/autodesk-forks/USD/tree/release](https://github.com/autodesk-forks/USD/tree/release)

## Instalation

```shell
npm install usd-viewer
```

## Web Assembly Dependencies

Currently this depends on the [SharedArrayBuffer](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) so to enable in the browser the following response headers must be set:

```json
"Cross-Origin-Embedder-Policy": "require-corp"
"Cross-Origin-Opener-Policy": "same-origin"
```

To load the Wasm dependencies in the browser copy them from the `node_modules` into your host env.

```
cpy node_modules/usd-viewer/wasm/**/* dist/wasm
```

To change the default path (`./wasm`) of the Wasm resources add the following meta tag to the document.

```html
<meta name="usd-viewer:wasm" content="custom-path/wasm" />
```

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