
declare global {
  interface Window { getUsdModule: any; }
}

/**
 * The default WASM build uses Emscripten pthreads, which need SharedArrayBuffer —
 * only available on cross-origin isolated pages (COOP/COEP headers). When
 * SharedArrayBuffer is missing, fall back to the single-threaded build in the
 * `st/` subdirectory, which runs without any server header configuration.
 */
export async function loadWasmUSD(dir: string = '') {
  const threaded = typeof SharedArrayBuffer !== 'undefined';
  const variantDir = threaded ? dir : `${dir}/st`;

  try {
    await includeScript(`${variantDir}/emHdBindings.js`);
  } catch {
    throw new Error(
      threaded
        ? `usd-viewer: failed to load ${variantDir}/emHdBindings.js`
        : `usd-viewer: this page is not cross-origin isolated and the single-threaded fallback (${variantDir}/emHdBindings.js) could not be loaded. ` +
          `Deploy the single-threaded WASM files or serve the COOP/COEP headers. ` +
          `See https://github.com/coryrylan/usd-viewer#web-assembly-dependencies`
    );
  }

  const module = await window.getUsdModule(null, variantDir);
  await module.ready;
  return module;
}

export async function fetchArrayBuffer(src: string) {
  const usdFile = await new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', src, true);
    req.responseType = 'arraybuffer';
    req.onload = () => req.response ? resolve(req.response) : reject();
    req.send(null);
  });

  return new Uint8Array(usdFile as any);
}

export function includeScript(url: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve(null);
    script.onerror = () => reject(new Error(`failed to load script: ${url}`));
    document.getElementsByTagName('head')[0].appendChild(script);
  });
}
