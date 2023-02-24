export const metadata = {
  name: 'usd-viewer',
  elements: ['usd-viewer']
};

export function example() {
  return /* html */`
    <script type="module">
      import 'usd-viewer/include.js';
    </script>

    <usd-viewer src="./usd/perseverance.usdz" alt="Perseverance Mars Rover"></usd-viewer>
  `;
}

export function interactive() {
  return /* html */`

    <style>
      :root {
        color-scheme: dark;
        accent-color: FieldText;
      }

      body {
        background: canvas;
      }

      section {
        display: grid;
        grid-template-columns: 400px 1fr;
        height: 100vh;
      }

      form {
        border-right: 1px solid ButtonBorder;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 36px;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      label:has(input[type=checkbox]) {
        align-items: center;
        flex-direction: row;
      }
    
      input[type=range] {
        width: 100%;
      }

      input[type=checkbox] {
        width: 16px;
        height: 16px;
      }

      input, select {
        padding: 6px;
      }

      h1 {
        margin: 0 0 12px 0;
        font-weight: 400;
      }

      a {
        color: CanvasText;
      }
    </style>

    <section>
      <form>
        <div>
          <h1>usd-viewer</h1>
          <a href="https://github.com/coryrylan/usd-viewer">Github</a>
          <a href="https://www.npmjs.com/package/usd-viewer">NPM</a>
        </div>

        <label>
          model
          <select name="src">
            <option value="./usd/perseverance.usdz">Perseverance Mars Rover</option>
            <option value="./usd/ingenuity.usdz">Ingenuity Mars Helicopter</option>
            <option value="./usd/cassini.usdz">Cassini Saturn Obiter</option>
            <option value="./usd/bell-x1.usdz">Bell X1</option>
          </select>
        </label>

        <label>
          zoom <input type="range" min="0.5" max="1.5" value="1" step="0.01" name="zoom" />
        </label>

        <label>
          auto-rotate-speed <input type="range" min="1" max="5" value="2" name="autoRotateSpeed" />
        </label>

        <label>
          <input type="checkbox" name="autoRotate" checked /> auto rotate
        </label>

        <label>
          <input type="checkbox" name="fileName" checked /> file name
        </label>

        <label>
          <input type="checkbox" name="dark-theme" checked /> dark theme
        </label>

        <label>
          min distance (zoom) <input type="number" name="minDistance" value="1" />
        </label>

        <label>
          max distance (zoom) <input type="number" name="maxDistance" value="1" />
        </label>
      </form>
      <usd-viewer src="./usd/perseverance.usdz" alt="Perseverance Mars Rover" file-name auto-rotate auto-rotate-speed="1"></usd-viewer>
    </section>

    <script type="module">
      import 'usd-viewer/include.js';
      const viewer = document.querySelector('usd-viewer');
      const form = document.querySelector('form');

      form.addEventListener('input', (e) => {
        const values = Object.fromEntries(new FormData(form));
        viewer[e.target.name] = values[e.target.name];
        document.documentElement.style.setProperty('color-scheme', values['dark-theme'] ? 'dark' : 'light');
      });
    </script>
  `;
}

export function mutli() {
  return /* html */`
    <script type="module">
      import 'usd-viewer/include.js';
    </script>
    <style>
      body {
        display: grid;
        grid-template-rows: 1fr 1fr;
        grid-template-columns: 1fr 1fr;
        height: 100vh;
        width: 100vw;
      }

      usd-viewer {
        outline: 1px solid #ccc;
      }
    </style>

    <usd-viewer src="./usd/ingenuity.usdz" alt="Ingenuity Mars Helicopter" max-distance="2" auto-rotate auto-rotate-speed="1"></usd-viewer>
    <usd-viewer src="./usd/perseverance.usdz" alt="Perseverance Mars Rover" auto-rotate auto-rotate-speed="1"></usd-viewer>
    <usd-viewer src="./usd/cassini.usdz" alt="Cassini Saturn Obiter" auto-rotate auto-rotate-speed="1"></usd-viewer>
    <usd-viewer src="./usd/bell-x1.usdz" alt="Bell X1" auto-rotate auto-rotate-speed="1"></usd-viewer>
  `;
}
