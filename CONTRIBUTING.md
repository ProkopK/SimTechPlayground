# Contributing: add your own simulation

Thanks for adding a simulation from your field! You only write the **physics**, the **drawing** and a short **explanation text**. The shell takes care of everything else: animation loop, controls, mouse and touch input, resizing, fullscreen, formulas, languages.

Working language for code, comments, commits and PRs is **English**. Website content (titles, labels, explanation texts) is **German first**; English is optional.

## Contents

1. [Setup](#1-setup)
2. [Step by step: a new 2D simulation](#2-step-by-step-a-new-2d-simulation)
3. [The simulation object](#3-the-simulation-object)
4. [Parameters, presets, metrics, pointer input](#4-parameters-presets-metrics-pointer-input)
5. [3D simulations](#5-3d-simulations)
6. [JavaScript or TypeScript?](#6-javascript-or-typescript)
7. [Helpers in `src/lib`](#7-helpers-in-srclib)
8. [Explanation texts and formulas](#8-explanation-texts-and-formulas)
9. [Performance tips](#9-performance-tips)
10. [Checklist before opening a pull request](#10-checklist-before-opening-a-pull-request)

## 1. Setup

You need [Node.js](https://nodejs.org/) 22 or newer and Git.

```bash
git clone https://github.com/ProkopK/SimTechPlayground.git   # or your fork
cd SimTechPlayground
npm install
npm run dev
```

Open the URL that `npm run dev` prints (http://localhost:5173/SimTechPlayground/). Changes to your files reload the page automatically.

## 2. Step by step: a new 2D simulation

1. **Create a branch** (or fork the repository): `git checkout -b sim/heat-equation`
2. **Copy the template** and give the folder a short name in lowercase with dashes. The folder name is the URL: `#/sim/heat-equation`.
   ```bash
   cp -r simulations/_template simulations/heat-equation
   ```
   Folders starting with `_` are hidden on the website, so your copy appears as soon as it has a new name.
3. **Edit `meta.json`**: title, one-sentence description, topic tags (see [tags](#tags)).
4. **Edit `sim.js`**: replace the bouncing balls with your simulation. The template is commented line by line; section 3 below explains every field.
5. **Write `info.de.md`**: the German explanation text (see section 8). `info.en.md` is optional.
6. **Create a thumbnail**: open your simulation in `npm run dev`, wait for a nice moment, and press **T**. Your browser downloads `thumbnail.webp`; move it into your folder.
7. **Run the checks**: `npm run check` (see section 10).
8. **Commit and open a pull request.** GitHub runs the same checks and a build. After the merge, the site is deployed automatically.

A simulation folder contains:

| File | Required | Content |
|---|---|---|
| `sim.js` or `sim.ts` | yes | the simulation object (`export default { ... }`) |
| `meta.json` | yes | title, description, tags, optional sort `order` |
| `info.de.md` | yes | German explanation text (Markdown with formulas) |
| `info.en.md` | no | English explanation text (falls back to German) |
| `thumbnail.webp` | yes | tile image, about 400 × 300, ≤ 50 KB (`.png` also works) |

### meta.json

```json
{
  "title": { "de": "Wärmeleitung", "en": "Heat conduction" },
  "description": { "de": "Ein Satz, der neugierig macht.", "en": "One sentence that makes people curious." },
  "tags": ["fluids"],
  "order": 50
}
```

<a id="tags"></a>Known tags are the `tag.*` keys in [src/i18n/de.json](src/i18n/de.json): `statphys`, `fluids`, `mechanics`, `chaos`, `demo`. To add a tag, add `tag.<key>` to `de.json` and `en.json` and the key to `TagKey` in [src/types/index.ts](src/types/index.ts). `order` sorts the tiles (lower first, default 100).

## 3. The simulation object

The complete contract with comments is in [src/types/index.ts](src/types/index.ts). The essentials:

```js
// @ts-check
/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",
  world: { width: 100, height: 60 }, // your coordinate system, origin top-left, y down

  dt: 1 / 60,          // time step passed to step() (default 1)
  stepsPerSecond: 60,  // steps per real second at speed ×1 (default 60)

  params: { /* controls, see section 4 */ },

  init(params) { return state; },             // create the starting state
  step(state, params, dt) { /* ... */ },      // advance one time step: physics only
  draw(ctx, state, params, view) { /* ... */ }, // draw the current state
};
```

**How time works.** The shell calls `step()` exactly `stepsPerSecond × speed` times per real second, independent of the frame rate: a 30 fps phone runs two steps per frame where a 60 fps laptop runs one. `dt` is the simulated time per step. So simulated time per real second is `dt × stepsPerSecond`. If a device can't keep up, the simulation slows down instead of freezing.

**`step` and `draw` are strictly separated.** `step` must not touch the DOM, canvas or WebGL. That is what lets `npm run check` test your simulation without a browser.

**`draw`** gets a canvas 2D context that is already scaled to your `world` coordinates (letterboxed, sharp on HiDPI screens). The background is dark (`--color-canvas-bg`), so draw light things or fill the world yourself. `view.pixelsPerUnit` tells you how many screen pixels one world unit is, e.g. for a line that should always be 2 px wide: `ctx.lineWidth = 2 / view.pixelsPerUnit`.

**State** is whatever object you return from `init()`. Describe it with a JSDoc `@typedef` (see the template) to get autocompletion for `state.` everywhere.

**Errors.** If your code throws, the shell shows "Die Simulation ist abgestürzt" with a reset button instead of a blank page, and the error is in the browser console.

## 4. Parameters, presets, metrics, pointer input

### Parameters (controls)

Each entry in `params` becomes a control. The current values arrive as `params` in `init`, `step`, `draw` and `onPointer`, keyed like your definition (`params.T`). Changes take effect live while the simulation runs.

| `type` | Control | Fields |
|---|---|---|
| `"range"` | slider | `min`, `max`, `step`, `value` |
| `"select"` | dropdown | `options`: a list `[64, 128]` or labelled `{ speed: { de: "Geschwindigkeit" } }`; `value` |
| `"boolean"` | toggle | `value` |
| `"button"` | button | `action(state, params)`: change the state in place, or return a new state |

Every parameter has a `label`: a plain string (e.g. `"σ"`) or `{ de: "...", en: "..." }`.

- `resetOnChange: true` restarts the simulation via `init()` when the value changes (use it for grid sizes, number of particles, anything `init` allocates).
- `mobileValue` is used instead of `value` on phones and tablets (e.g. a coarser grid).
- With labelled `select` options, the value is the string key (`params.view === "speed"`). With a list of numbers, use `Number(params.size)` to be safe.

### Presets

Named scenarios in a "Szenario" dropdown:

```js
presets: {
  sun: { label: { de: "Sonne mit Planeten" }, state: (params) => solarSystem(params) },
  slow: { label: { de: "Langsam" }, params: { speed: 0.2 } },
},
```

`params` are applied first; `state(params)` builds a specific starting state. Without `state`, the simulation is only reset if a `resetOnChange` parameter changed.

### Metrics

Numbers shown below the controls, with a small plot over the last 30 seconds:

```js
metrics: {
  energy: { label: { de: "Energie" }, value: (state, params) => state.energy, digits: 2 },
  count: { label: { de: "Anzahl" }, value: (s) => s.n, digits: 0, plot: false },
},
```

`value` is called ten times per second and must be cheap. Compute expensive quantities in `step` and store them on the state.

### Pointer input (mouse and touch)

```js
onPointer(state, params, e) {
  // e.type: "down" | "move" | "up"; e.x, e.y in world coordinates
  // e.buttons: 1 = left button or finger, 2 = right button, 0 = hovering
  // e.pointerType: "mouse" | "touch" | "pen"
  if (e.type === "down") addParticle(state, e.x, e.y);
},
```

Touch works like a mouse with the left button held down. There is no right button on touch screens, so offer a toggle for the second action (see the eraser in [simulations/flow/sim.js](simulations/flow/sim.js)). Fast strokes deliver positions far apart, so for drawing, interpolate between the last and the current position (see `paint` in [simulations/ising/sim.js](simulations/ising/sim.js)).

## 5. 3D simulations

Set `renderer: "3d"` and replace `world`/`draw` with two functions. The shell provides the renderer, camera, lights and orbit controls (rotate and zoom with mouse and touch). Three.js is loaded only for 3D simulations.

```js
/** @type {import("../../src/types").Simulation3D<State, View>} */
export default {
  renderer: "3d",
  camera: { position: [0, 20, 60], target: [0, 0, 0] },
  autoRotate: true, // slowly rotate while nobody interacts (good for the projector)

  init(params) { /* ... */ },
  step(state, params, dt) { /* ... */ },

  // Once after every init/reset: create Three.js objects, return what update3d needs.
  setup3d({ THREE, scene, camera, controls }, state, params) {
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    return { points };
  },
  // Every frame: copy the state into the objects.
  update3d(view, state, params) {
    view.points.geometry.attributes.position.needsUpdate = true;
  },
};
```

Don't import `three` yourself; use the `THREE` passed to `setup3d`. Everything you add to `scene` is disposed automatically on reset and when the page is left. Allocate buffers in `setup3d` and only update them in `update3d`. [simulations/lorenz/sim.js](simulations/lorenz/sim.js) is the reference: lines with fading colors, updated every frame.

Thumbnails work the same way: press **T** in `npm run dev`.

## 6. JavaScript or TypeScript?

Both work; use what you're comfortable with.

- **JavaScript** (`sim.js`): keep `// @ts-check` in the first line and the `/** @type {...} */` annotation from the template. Your editor (e.g. VS Code) then shows autocompletion and warnings, and `npm run check` reports type errors, without you writing any types.
- **TypeScript** (`sim.ts`): `import type { Simulation2D } from "../../src/types";` and `export default { ... } satisfies Simulation2D<State>;`

## 7. Helpers in `src/lib`

Import from `"../../src/lib"`:

| Helper | Use |
|---|---|
| `drawGrid(ctx, data, nx, ny, colormap, { min, max, width, height, nanColor })` | draw a 2D array (temperature, spins, velocity) as a colored image; NaN cells get `nanColor` |
| `viridis`, `blueWhiteRed`, `makeColormap(stops)`, `cssColor(cmap, t)` | colormaps; `viridis` for magnitudes, `blueWhiteRed` for signed values |
| `createRng(seed)` | seedable random numbers: `next()`, `int(n)`, `range(a, b)`, `normal()` |
| `createRk4(n)`, `createEuler(n)` | ODE integrators without allocations: `rk4(y, t, dt, (t, y, dydt) => {...})` |
| `velocityVerlet(pos, vel, acc, count, dt, computeAcc)` | energy-conserving integrator for particles (gravity, molecular dynamics) |
| `createTrail(capacity, 2 \| 3)` | ring buffer of recent positions, e.g. for trails |
| `vec.add`, `vec.length`, `vec.cross`, … | small vector helpers on arrays, for setup code |

If you need something that more simulations would use, add it to `src/lib` with a comment and an example.

## 8. Explanation texts and formulas

`info.de.md` is shown next to the simulation (below it on phones). The audience is **high school students** (Oberstufe) who are curious, not experts.

- **German first.** Short, friendly, "du"-form. Avoid jargon or explain it right away.
- **Structure** that works well (see the existing simulations):
  - one or two sentences: what do I see?
  - `## Was du ausprobieren kannst`: three to five concrete things to try with the controls
  - `## Die Physik dahinter` (or similar): the idea, with **few, well-chosen formulas**
  - `## Wie der Computer das rechnet`: the numerical method in simple words
  - `## Und im Studium?`: where this shows up in the program or in practice
- **Formulas**: `$E = m c^2$` inline, and display formulas on their own lines:
  ```markdown
  $$
  F = G \, \frac{m_1 m_2}{r^2}
  $$
  ```
  Everything [KaTeX supports](https://katex.org/docs/supported.html) works, e.g. `\begin{aligned} ... \end{aligned}`. Use a decimal comma in German texts: `2{,}27`.
- Don't put the title at the top; it's shown already. Start headings with `##`.

## 9. Performance tips

The simulation should run smoothly on a five-year-old laptop and on a mid-range phone. Physical accuracy matters less than smoothness.

- **Use typed arrays** (`Float32Array`, `Float64Array`, `Int8Array`) for anything per cell or per particle.
- **Don't allocate in `step` or `draw`**: no `new`, no array literals, no `map`/`filter` in hot loops. Allocate once in `init` (or `setup3d`).
- **Compute metrics in `step`** if they're expensive, and store them on the state.
- **Choose grid sizes per device** with `mobileValue`.
- `npm run check` prints how many milliseconds of CPU time per real second your simulation needs at speed ×1. Keep it well below ~300 ms on your machine; phones are several times slower.
- Drawing: one `drawGrid` call is much faster than thousands of `fillRect`s. For many small shapes, set the style once and batch them into one path.

## 10. Checklist before opening a pull request

- [ ] `npm run check` passes (types, files, metadata, smoke test)
- [ ] The simulation starts by itself and looks interesting within a few seconds
- [ ] All controls do something visible; parameters that need a restart have `resetOnChange`
- [ ] Mouse **and** touch work (Chrome/Firefox devtools: device toolbar, touch emulation)
- [ ] It runs smoothly; try the phone view and fullscreen mode
- [ ] No errors in the browser console
- [ ] `info.de.md`: short, understandable for high school students, formulas render
- [ ] `meta.json`: German title and one-sentence description, fitting tags
- [ ] `thumbnail.webp` exists and is ≤ 50 KB
- [ ] Code comments in English; the code is readable for the next student
