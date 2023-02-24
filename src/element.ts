import { Scene, Group, Vector3, Box3, PerspectiveCamera, WebGLRenderer, CineonToneMapping, VSMShadowMap, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LitElement, html, PropertyValues } from 'lit';
import { state } from 'lit/decorators/state.js';
import { property } from 'lit/decorators/property.js';
import { RenderDelegateInterface } from './render-delegate.js';
import { loadWasmUSD, fetchArrayBuffer } from './utils.js';
import styles from './element.css' assert { type: 'css' };

const USD = await loadWasmUSD(document.querySelector<HTMLMetaElement>('meta[name="usd-viewer:wasm"]')?.content ?? 'wasm');

/**
 * @element usd-viewer
 */
export class USDViewer extends LitElement {
  @property({ type: String }) src = '';

  @property({ type: String }) alt = '';

  @property({ type: Boolean }) controls = true;

  @property({ type: Boolean, attribute: 'file-name' }) fileName: boolean;

  @property({ type: Boolean, attribute: 'auto-rotate' }) autoRotate: boolean;

  @property({ type: Number, attribute: 'auto-rotate-speed' }) autoRotateSpeed = 2;

  @property({ type: Number, attribute: 'min-distance' }) minDistance = 1;

  @property({ type: Number, attribute: 'max-distance' }) maxDistance = 2;

  @property({ type: Number }) zoom = 1;

  @state() private error: string | null = null;

  #DOMRect!: DOMRect;
  #scene!: Scene;
  #camera!: PerspectiveCamera;
  #renderer!: WebGLRenderer;
  #controls!: OrbitControls;
  #group: Group;
  #loadedFile: string;
  #loading = false;
  #internals = this.attachInternals();
  
  static styles = [styles];

  render() {
    return html`
      ${this.error ? html`error loading file` : ''}
      ${this.fileName ? html`<div role="presentation" part="filename">${this.src.split('/')[this.src.split('/').length - 1]}</div>` : ''}
    `
  }

  async firstUpdated(props: PropertyValues<this>) {
    super.firstUpdated(props);
    await this.updateComplete;
    (this.#internals as any).role = 'img';
    this.#initializeDOMRect();
    this.#intializeCamera();
    this.#intitializeRender();
    this.#intializeScene();
    this.#intializeControls();
    await this.#loadFile();
    this.#updateControls();
    this.#updateCamera();
    this.#animate();
    this.#initializeResizer();
    (this.shadowRoot as ShadowRoot).appendChild(this.#renderer.domElement);
  }

  async updated(props: PropertyValues<this>) {
    super.updated(props);
    await this.updateComplete;
    this.#internals.ariaLabel = this.alt;

    if (props.has('src') && this.src !== props.get('src')) {
      await this.#loadFile();
    }
    this.#updateControls();
    this.#updateCamera();
  }

  #initializeDOMRect() {
    this.#DOMRect = this.getBoundingClientRect();
  }

  #intializeScene() {
    this.#scene = new Scene();
    this.#scene.environment = new PMREMGenerator(this.#renderer).fromScene(new RoomEnvironment()).texture;
  }

  #intializeCamera() {
    this.#camera = new PerspectiveCamera(27, this.#DOMRect.width / this.#DOMRect.height, 1, 3500);
  }

  #updateCamera() {  
    const box = new Box3().setFromObject(this.#group);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());

    this.#group.position.x = (this.#group.position.x - center.x);
    this.#group.position.y = (this.#group.position.y - center.y);
    this.#group.position.z = (this.#group.position.z - center.z);

    this.#camera.near = size / 100;
    this.#camera.far = size * 100;
    this.#camera.position.copy(center);
    this.#camera.position.z = 4;
    this.#camera.position.y = 3;
    this.#camera.position.x = 5;
    this.#camera.zoom = this.zoom;
    this.#camera.aspect = this.#DOMRect.width / this.#DOMRect.height;
    this.#camera.lookAt(center);
    this.#renderer.setSize(this.#DOMRect.width, this.#DOMRect.height);
    this.#camera.updateProjectionMatrix();
  }

  #intitializeRender() {
    this.#renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.#renderer.setPixelRatio(this.#DOMRect.width / this.#DOMRect.height);
    this.#renderer.setSize(this.#DOMRect.width, this.#DOMRect.height);
    this.#renderer.toneMapping = CineonToneMapping;
    this.#renderer.toneMappingExposure = 2;
    this.#renderer.shadowMap.enabled = false;
    this.#renderer.shadowMap.type = VSMShadowMap;
  }

  #intializeControls() {
    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.update();
  }

  #updateControls() {
    const box = new Box3().setFromObject(this.#group);
    const size = box.getSize(new Vector3()).length();
    this.#controls.reset();
    this.#controls.autoRotate = this.autoRotate;
    this.#controls.autoRotateSpeed = this.autoRotateSpeed;
    this.#controls.maxDistance = size * this.maxDistance;
    this.#controls.minDistance = size * this.minDistance;
    this.#controls.update();
  }

  async #animate() {
    this.#renderer.render(this.#scene, this.#camera);
    if (this.controls) {
      this.#controls.update();
    }
    requestAnimationFrame(() => this.#animate());
  }

  async #loadFile() {
    if (this.#loading) {
      return;
    }

    this.#loading = true;
    this.error = null;
    this.#scene.remove(this.#group);
    this.#group = new Group();
    this.#scene.add(this.#group);

    try {
      USD.FS.createDataFile('/', this.src, await fetchArrayBuffer(this.src), true, true, true);

      if (this.#loadedFile) {
        USD.FS.unlink(this.#loadedFile, true);
      }

      this.#loadedFile = this.src;
      new RenderDelegateInterface(this.#loadedFile, USD, this.#group).driver.Draw();
    } catch (e) {
      this.error = e;
      this.#loading = false;
      console.error(`error loading model: ${e}`);
      return;
    }

    this.#loading = false;
  }

  #initializeResizer() {
    new ResizeObserver(() => this.#resize()).observe(this);
  }

  #resize() {
    this.#DOMRect = this.getBoundingClientRect();
    this.#camera.aspect = this.#DOMRect.width / this.#DOMRect.height;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(this.#DOMRect.width, this.#DOMRect.height);
  }
}
