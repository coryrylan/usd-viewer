import { USDViewer } from './element.js';

customElements.get('usd-viewer') || customElements.define('usd-viewer', USDViewer);

declare global {
  interface HTMLElementTagNameMap {
    'usd-viewer': USDViewer;
  }
}
