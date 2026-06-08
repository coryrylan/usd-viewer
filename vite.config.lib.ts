import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Dependencies that consumers are expected to provide. Keeping them external
// keeps the published bundle small and avoids duplicate copies of lit/three.
const external = [/^lit($|\/)/, /^three($|\/)/, /^tslib($|\/)/, /^three-usdz-loader($|\/)/];

// Library build for the publishable `usd-viewer` web component. Outputs ESM to
// `dist/lib` alongside type declarations and the runtime WASM artifacts.
export default defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist/lib',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        include: resolve(__dirname, 'src/include.ts')
      },
      formats: ['es']
    },
    rollupOptions: { external }
  },
  plugins: [
    dts({ include: ['src'], outDir: 'dist/lib' }),
    viteStaticCopy({ targets: [{ src: 'wasm', dest: '.' }] })
  ]
});
