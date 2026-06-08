// Base theme + layout utilities.
import '@nvidia-elements/themes/fonts/inter.css';
import '@nvidia-elements/themes/index.css';
import '@nvidia-elements/themes/dark.css';
import '@nvidia-elements/styles/typography.css';
import '@nvidia-elements/styles/layout.css';
import './demo.css';

// Elements components used by the control panel + page shell.
import '@nvidia-elements/core/page/define.js';
import '@nvidia-elements/core/page-header/define.js';
import '@nvidia-elements/core/button/define.js';
import '@nvidia-elements/core/icon-button/define.js';
import '@nvidia-elements/core/select/define.js';
import '@nvidia-elements/core/range/define.js';
import '@nvidia-elements/core/switch/define.js';
import '@nvidia-elements/core/input/define.js';

// Register the <usd-viewer> custom element from source.
import '../src/include.ts';

const viewer = document.querySelector('usd-viewer') as any;
const form = document.querySelector<HTMLFormElement>('#controls')!;

const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

form.addEventListener('input', () => {
  const values = Object.fromEntries(new FormData(form));

  viewer.src = String(values.src);
  viewer.zoom = Number(values.zoom);
  viewer.autoRotateSpeed = Number(values.autoRotateSpeed);
  viewer.minDistance = Number(values.minDistance);
  viewer.maxDistance = Number(values.maxDistance);
  viewer.autoRotate = field('autoRotate').checked;
  viewer.fileName = field('fileName').checked;

  document.documentElement.setAttribute('nve-theme', field('darkTheme').checked ? 'root dark' : 'root');
});
