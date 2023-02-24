
declare global {
  interface Window { getUsdModule: any; }
}

export async function loadWasmUSD(dir: string = '') {
  await includeScript(`${dir}/emHdBindings.js`);
  const module = await window.getUsdModule(null, dir);
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
  return new Promise(r => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => r(null);
    document.getElementsByTagName('head')[0].appendChild(script);
  });
}
