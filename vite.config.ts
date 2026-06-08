import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// The USD WASM runtime is compiled with pthreads, so it needs SharedArrayBuffer,
// which in turn requires cross-origin isolation headers during dev/preview.
const crossOriginIsolation = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

// Demo site build. Multi-page (basic / interactive / multiple) Vite app that
// renders the <usd-viewer> with NVIDIA Elements UI. Outputs to `dist`.
export default defineConfig({
  appType: 'mpa',
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        interactive: resolve(__dirname, 'single.html'),
        multi: resolve(__dirname, 'multi.html')
      }
    }
  },
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'wasm', dest: '.' },
        { src: 'usd', dest: '.' }
      ]
    })
  ]
});
