
import { resolve } from 'path';

export default {
  library: {
    entryPoints: ['./src/index.ts', './src/include.ts'],
    externals: [/^usd-viewer/, /^tslib/, /^lit/, /^three/, /^lit/, /^three-usdz-loader/]
  },
  drafter: {
    dist: './dist/drafter',
    schema: './dist/lib/custom-elements.json',
    examples: './src/**/element.examples.js',
    baseUrl: './',
    commonjs: true,
    responseHeaders: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    },
    aliases: [
      { find: /^usd-viewer\/(.+)/, replacement: resolve(process.cwd(), './dist/lib/$1') }
    ],
    head: () => {
      return /* html */`
        <link rel="prefetch" href="usd/perseverance.usdz" />
        <!-- <meta name="usd-viewer:wasm" content="wasm" /> -->
        <style>
          html {
            box-sizing: border-box;
          }

          *, *:before, *:after {
            box-sizing: inherit;
          }

          html,
          body {
            height: 100%;
            margin: 0;
            background: #fcfcfc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          }
        </style>
      `;
    }
  }
};
