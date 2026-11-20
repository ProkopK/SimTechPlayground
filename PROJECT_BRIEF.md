# Project Brief: SimTech Playground

> **To Claude Code:** This document summarizes an extensive consultation. The architecture decisions in section 3 have **already been made** and are justified, so please don't reopen them unless you hit a real technical blocker. The **way of working** is in section 12, the **task** in section 13.

---

## 0. Languages

| What | Language |
|---|---|
| **Working language** (code, identifiers, comments, commit messages, `docs/PLAN.md`, `docs/FINETUNING.md`, README, CONTRIBUTING, MAINTAINERS, CLAUDE.md, issues/PRs) | **English** |
| **Website content** (UI, simulation titles/descriptions, parameter labels, explanation texts) | **German first** (primary and default language); English as second language, completed later |

## 1. Context and Goal

We are students of the **Simulation Technology** degree program. We are building **SimTech Playground**, a **publicly accessible, interactive website** with many small simulation examples from the topics of our studies.

**Use cases:**
- At **fairs, open days and info booths**: A projector shows a running simulation as an eye-catcher, while high school students try things out themselves on laptops (and possibly their own phones) as we explain what we do in our studies.
- Afterwards as a **permanently available website** (e.g. via a QR code at the booth).

**Core idea of every simulation:** You change something (sliders, mouse/touch) and **immediately see, live,** what the simulation does with it over time. A single result image is not enough: the evolution over time must be visible.

**Constraints:**
- We work on this in our **free time**, so keep complexity as low as possible.
- There should be **as many simulations as possible**. The program covers many topics, and that should be visible. Every student specializing in an area should be able to **add a simulation from their own topic with little effort**.
- The project should **live on across several student generations**. Each year one person is responsible and gets a short handover from their predecessor.

**Already in the repo:**
- `LICENSE` (MIT). Do not change.
- `ideas.md`: a list of further simulation ideas (see section 6.5).

## 2. Audience and Usage

- **Audience:** High school students (upper secondary level) who are interested in the program or should become interested. There is **no** expert audience.
- **Code is not the focus.** The focus is the animation plus a **short, understandable explanation (with formulas)** and further information (What is happening here? Where does this show up in the program or in practice?).
- **Devices:** Laptops (including older ones), projectors, ideally also **smartphones/tablets with touch** (desirable, not mandatory).
- **Network:** There is usually internet at the booth, mobile data as fallback. The site must therefore **load fast**: the landing page and a single simulation should be usable within a few seconds, even over mobile data.
- **Performance beats physical accuracy.** A coarser grid that runs smoothly is better than an exact one that stutters.

## 3. Decisions Already Made (with Rationale)

| Decision | Rationale |
|---|---|
| **Static website, no backend** | Free hosting, no maintenance, scales arbitrarily. |
| **Simulations run in the browser** (Canvas 2D, or Three.js for 3D) | Fast loading, smooth animation, works on weak devices and phones. |
| **TypeScript/JavaScript middle ground:** the **shell in TypeScript**, **simulations as either `.js` or `.ts`** | The shell is maintained by few people for a long time, so types make refactoring safe. Contributors should not have to learn TS. The simulation contract ships as type definitions, so JS simulations also get autocompletion and warnings in the editor via JSDoc / `// @ts-check`. `tsc --noEmit` runs in CI. |
| **No UI framework** (no React/Vue/Svelte) | Must remain understandable and maintainable by other students years from now. |
| **Vite** as dev server and build tool | One command (`npm run dev`), TS out of the box, automatic discovery of simulation folders via `import.meta.glob`. |
| **Three.js** for 3D simulations (incl. OrbitControls) | Rotate and zoom with mouse and touch out of the box. **Lazy-loaded only for 3D simulations**, so the landing page and 2D simulations stay lean. |
| **KaTeX** for formulas in explanation texts, **from the start** | Formulas are required. KaTeX is fast and renders without a server. Lazy-load it or load it only on simulation pages. |
| **marked** (or similar) for Markdown explanation texts | Contributors just write Markdown with `$...$` / `$$...$$`. |
| **Tweakpane** or **lil-gui** for controls | Ready-made sliders, dropdowns, toggles and buttons, small. Justify the choice in the plan. |
| **GitHub + GitHub Pages**, deployed via GitHub Action | We already use GitHub, hosting is free, the pull request workflow is clear. |
| **Hash routing** (`#/sim/ising`) | Avoids 404 issues with deep links on GitHub Pages without server configuration. |

Add further dependencies only with good reason.

**Rejected alternatives (for information, do not re-evaluate):**
- *marimo notebooks (WASM/Pyodide), PyScript:* The Python runtime plus NumPy costs several MB of loading time (too slow over mobile data at the booth), and frame-by-frame animation with mouse interaction doesn't fit the reactive cell model.
- *Python servers (Streamlit, Dash, Panel):* Hosting and maintenance effort, network latency for animations, bottlenecks with many concurrent users.
- *Possible future extension (do NOT build now):* optional Python simulations via Pyodide in a Web Worker, if there is real demand. The architecture should not rule this out, but needs no preparation for it.

## 4. Functional Requirements

### 4.1 Landing page
- **Tile grid** with all available simulations: thumbnail, name, short description (1 sentence), optional topic tag (e.g. „Strömung“, „Statistische Physik“, „Mechanik“).
- New simulations appear **automatically** once their folder exists. No manually maintained list.
- Short header with the title **SimTech Playground**: What is this? What is Simulation Technology? Link to the program's website (URL to follow, use a placeholder).

### 4.2 Simulation page
- **The simulation starts automatically** when opened and runs continuously (preferred over a "Run" button).
- Controls: **pause/resume**, **reset**, **speed** (steps per frame).
- **Controls** are generated automatically from the parameter definition: **sliders, dropdowns, toggles, buttons**. Parameter changes take effect **live while running**; only parameters marked `resetOnChange` trigger a reset.
- **Mouse and touch interaction** on the canvas (placing objects, drawing obstacles, …). The shell converts pointer coordinates to simulation coordinates. In 3D: rotate and zoom via OrbitControls.
- Optional **metrics** (e.g. magnetization, energy) shown as numbers, optionally as a small time series (sparkline).
- **Explanation text** from Markdown **with formulas (KaTeX)** next to (desktop) or below (mobile) the simulation.
- **Fullscreen/projector mode**: simulation large, controls compact or collapsible, text hidden.
- Back to the landing page, language switcher.

### 4.3 Internationalization (i18n)
- **German is the primary and default language** of the website. **English** is the second language.
- **Build the structure in from the start**; English content can be completed later.
- UI strings in language files (e.g. `src/i18n/de.json`, `en.json`).
- Per simulation, title, description and parameter labels are multilingual, and explanation texts are `info.de.md` / `info.en.md`.
- **Fallback to German** when a translation is missing. A missing translation must never cause an error.
- Language is remembered (localStorage, wrapped in try/catch) or derived from the browser language. Default is German.

### 4.4 Non-functional requirements
- **Performance:** Target 60 fps on a ~5-year-old laptop and smoothly usable ≥30 fps on a mid-range phone. Grid sizes may be chosen per device.
- **Load time:** The landing page loads no simulation code, and each simulation is **lazy-loaded via dynamic import**. Three.js and KaTeX are likewise loaded only when needed. Thumbnails are small (WebP/PNG, guideline ≤ 50 KB).
- The animation **pauses** when the tab is not visible.
- **Responsive**: desktop, projector (16:9, large type) and phone in portrait.
- **Touch** is on par with the mouse (Pointer Events), and scrolling/zooming on the canvas is suppressed during interaction.
- **Accessibility, as far as easily achievable:** sufficient contrast, usable controls.
- **Design:** consistent and modern, more science museum than government website. Use **CSS variables** for colors from the start, so that **dark/light mode** and later branding (fine-tuning) need no refactoring. No university logo without asking.

## 5. Architecture

### 5.1 Core principle
**The shell handles everything shared; a simulation is just a folder.** A contributor writes only the physics, the drawing and the explanation text, and does not need to understand the shell.

### 5.2 Proposed folder structure (may be refined in the plan)
```
LICENSE                  ← exists (MIT)
ideas.md                 ← exists (simulation ideas)
docs/
  PLAN.md                ← implementation plan (created and maintained by Claude Code)
  FINETUNING.md          ← fine-tuning todo list (see section 12)
  MAINTAINERS.md
simulations/
  _template/             ← copy template with commented minimal example (JS, with @ts-check)
  ising/
    sim.js|ts            ← simulation logic (contract below)
    meta.ts|js|json      ← title/description/tags (multilingual)
    info.de.md           ← explanation text, German (required)
    info.en.md           ← explanation text, English (optional)
    thumbnail.webp
  gravity/
  fluid/
  lorenz/                ← 3D reference
src/                     ← shell in TypeScript
  main.ts                ← router, landing page, simulation page
  types/                 ← simulation contract as type definitions (usable from JS sims too)
  runner/                ← animation loop, 2D canvas scaling, 3D setup, pointer mapping
  ui/                    ← control generation, tiles, layout, fullscreen, Markdown+KaTeX
  lib/                   ← helpers for simulations (see 5.4)
  i18n/                  ← de.json, en.json, helpers
  styles/                ← CSS with variables (themeable)
scripts/
  check-sims.ts|js       ← validation + smoke test of all simulations (CI)
.github/workflows/       ← typecheck, check, build, deploy to GitHub Pages
```

Important: Metadata (title, description, thumbnail) must be available to the landing page **without** loading simulation code. Keep metadata separate, or import only the metadata eagerly via `import.meta.glob` with `eager`.

### 5.3 Simulation contract (draft, finalize in the plan)
Goal: as small and understandable as possible. **Physics (`step`) and rendering (`draw`) are strictly separated**, so `step` can be tested headless (Node, without Canvas/WebGL). The contract is defined as a TypeScript type in `src/types/`. JS simulations reference it via JSDoc (e.g. `/** @type {import('../../src/types').Simulation} */`) for editor support.

```js
export default {
  renderer: "2d",                 // "2d" (Canvas) or "3d" (Three.js)

  // 2D only: logical coordinate system; the shell scales it to the canvas
  // (aspect ratio preserved, letterboxing), incl. devicePixelRatio.
  world: { width: 200, height: 100 },

  params: {
    T:     { type: "range", min: 0.1, max: 5, step: 0.01, value: 2.0,      // slider
             label: { de: "Temperatur", en: "Temperature" } },
    size:  { type: "select", options: [64, 128, 256], value: 128,           // dropdown
             resetOnChange: true, label: { de: "Gittergröße", en: "Grid size" } },
    trails:{ type: "boolean", value: true,                                   // toggle
             label: { de: "Spuren", en: "Trails" } },
    // type "button": action, e.g. "Alles zufällig"
  },

  presets: { /* optional: named parameter or state presets */ },

  init(params) { return state; },            // creates initial state
  step(state, params, dt) { },               // one time step (no DOM/Canvas/WebGL!)

  // 2D:
  draw(ctx, state, params, view) { },        // render; view = scaling info/helpers
  // 3D (instead of draw):
  setup3d(three, scene, state, params) { },  // once: create objects (shell provides
                                             //   renderer, camera, OrbitControls, lights)
  update3d(state, params) { },               // per frame: update geometries

  onPointer(state, params, e) { },           // optional (mainly 2D); x, y in world coordinates
  metrics(state) { return { M: 0.12 }; },    // optional; shell displays/plots them
};
```

The shell takes care of: the animation loop (`requestAnimationFrame`, **fixed time step** with steps per frame per the speed control), pause/reset, pausing when hidden, controls, pointer mapping, resize, fullscreen, lazy loading Three.js, cleanup (releasing the WebGL context/geometries when leaving the page), and error display ("simulation crashed" instead of a blank page).

### 5.4 Helper library `src/lib/` (for contributors)
Keep it small, but cover what recurs:
- **Grid renderer:** `Float32Array`/`Int8Array` + colormap → `ImageData` → scaled to the canvas (for Ising, fluid, heat conduction, …).
- **Colormaps:** e.g. viridis, diverging (blue–white–red).
- **Seedable random number generator.**
- **Small vector helpers** (2D/3D), **ODE integrators** (Euler, RK4, leapfrog). Many ideas need them.
- Possibly **trail/particle helpers** (2D and 3D).

## 6. Simulations

The reference simulations also serve as **role models** for future contributors. The code should therefore be especially **readable and well commented** (in English), and the explanation texts (in German) should suit high school students, with few, well-chosen formulas.

### 6.1 Ising model (2D): first reference and proof of concept
- Square lattice with periodic boundaries, J = 1, k_B = 1, Metropolis algorithm (random sweeps or checkerboard). Precompute acceptance probabilities as a lookup table.
- **Parameters:** temperature T (slider, approx. 0.1–5, default near the critical temperature T_c ≈ 2.269), magnetic field B (−1…1), lattice size (dropdown, resetOnChange).
- **Interaction:** "paint" spins with mouse/finger (e.g. left = up, right = down; a toggle on touch).
- **Buttons/presets:** „Zufällig (heiß)“, „Alle ausgerichtet (kalt)“.
- **Metrics:** magnetization, energy per spin (with sparkline).
- **Explanation text idea:** magnets, phase transitions, why a magnet loses its magnetization when heated, the energy and Boltzmann formulas, where Monte Carlo methods appear in the program.

### 6.2 Gravity (2D N-body)
- Direct O(N²) summation with softening, leapfrog/velocity-Verlet integrator (energy-conserving, stable). Limit N to approx. 200–300.
- **Interaction:** click and drag places a new body; drag direction and length set the initial velocity ("slingshot"), with a preview line while dragging.
- **Parameters:** mass of new bodies, G or time scale, trails on/off, optionally collisions (merging) on/off.
- **Presets:** sun + planets, binary star, random cluster, possibly a figure-8 choreography.
- Camera: optional centering on the center of mass; remove bodies beyond a large radius.
- **Explanation text idea:** Newton's law of gravitation, numerical integration, why the integrator matters (energy conservation), connection to spaceflight and molecular dynamics.

### 6.3 Flow around a drawn obstacle (2D)
- **Recommended: Lattice Boltzmann (D2Q9, BGK)** on a grid of about 200×80 (adapt per device), with inflow on the left and outflow on the right. With suitable parameters LBM produces a **Kármán vortex street**, which is exactly the wow effect we want. Alternatively Stable Fluids (Stam), if that is significantly simpler or more stable. Justify the choice in the plan.
- Implement on the **CPU with typed arrays** first. Use WebGL only if the CPU is demonstrably insufficient (then as a fine-tuning item).
- **Interaction:** **draw and erase** obstacles with mouse/finger, live while the flow is running.
- **Parameters:** inflow velocity, viscosity (or Reynolds number). Clamp values so the simulation **cannot become unstable**. Reset automatically on NaN.
- **Rendering:** switchable (dropdown) between velocity magnitude and vorticity, optional tracer particles.
- **Presets:** cylinder, airfoil, empty.
- **Explanation text idea:** why vortices shed, the Reynolds number made tangible (with formula), connection to cars, airplanes and bridges (CFD in the program).

### 6.4 Lorenz attractor (3D): reference for the 3D path
- Integrate the Lorenz system live with RK4 and draw it as a growing line with a fading trail. **Several starting points a tiny distance apart** show the chaos (butterfly effect).
- **Parameters:** σ, ρ, β (sliders, defaults 10, 28, 8/3), number of trajectories, trail length.
- **Interaction:** rotate and zoom via OrbitControls (mouse and touch), optional slow auto-rotation while nobody interacts (good for the projector).
- **Explanation text idea:** the three equations, deterministic chaos, weather forecasting.

### 6.5 More ideas: `ideas.md`
- `ideas.md` in the repo lists further simulation ideas. **Read it during planning** to make sure the contract, `src/lib` and 3D support **don't rule these ideas out** (e.g. hydrogen orbitals as a 3D point cloud, possibly with the time evolution of a superposition of states).
- The ideas are **not** implemented in the proof of concept. If you notice a gap in the contract for one of them, note it in the plan.

## 7. Contribution Workflow (for future students)

1. Fork the repo or create a branch.
2. Copy `simulations/_template/` and rename it.
3. Write `init`, `step`, `draw` (or `setup3d`/`update3d`) and optionally `onPointer`, `metrics`; add the explanation text (Markdown + formulas, German required) and a thumbnail.
4. `npm run dev` starts the site locally, and the new tile appears automatically.
5. `npm run check` validates metadata and thumbnail, checks types and runs a smoke test (init + N steps headless, no exceptions, no NaN in `metrics`).
6. Open a pull request. CI runs check and build; after merge it deploys automatically.

**Documentation to create (in English):**
- `README.md`: what SimTech Playground is, quick start.
- `CONTRIBUTING.md`: step-by-step "Add your own simulation" (2D and 3D), incl. the contract, JS vs. TS, formulas in explanation texts, performance tips (typed arrays, no allocations in `step`), a pre-PR checklist, and guidance for explanation texts (German first, suitable for high school students, short, with a link to the program).
- `docs/MAINTAINERS.md`: handover docs for the yearly responsible person (deployment, reviews, updating dependencies).
- `CLAUDE.md`: short project conventions so future contributors using AI assistants produce consistent simulations (incl. the languages from section 0 and the way of working from section 12).
- License: **MIT, already in the repo as `LICENSE`.**

## 8. Deployment
- GitHub Action: on push to `main` → `npm ci` → typecheck → `npm run check` → `npm run build` → deploy to **GitHub Pages**.
- Set Vite `base` correctly for project pages (`/<repo-name>/`), but keep it configurable so a custom domain or university hosting is possible later (the output is a plain static folder).
- PRs: typecheck, check and build run; no deployment.
- Deployment should be in place **early** (already in the proof of concept), so we can test on real phones and laptops.

## 9. Non-goals (for now)
- No backend, no accounts, no database, no tracking.
- No code view or code editor on the site.
- No Python simulations (see section 3).
- No maximum physical accuracy; what matters is illustrative, stable and smooth behavior.

## 10. Open Points (mark as assumption in the plan, or ask)
- Branding (colors, logo), neutral via CSS variables for now.
- Link to the program's website (placeholder).
- Repo name / `base` path for GitHub Pages: derive it from the repo or ask.

## 11. Definition of Done for the Proof of Concept
- Landing page with automatically generated tiles, UI in German.
- Ising, gravity, flow (2D) and Lorenz (3D) start automatically, run smoothly (see 4.4), work with mouse **and** touch, and have controls (sliders, dropdowns, toggles, buttons), reset, pause and a German explanation text **with rendered formulas**.
- Fullscreen/projector mode works.
- i18n structure is in place: UI in German and English, simulation texts at least in German, fallback works.
- `_template` and `CONTRIBUTING.md` exist, and it has been demonstrated that a new simulation can be added just by copying the template (please walk through this once yourself).
- Typecheck, `npm run check` and CI pass, and deployment to GitHub Pages works.
- Tested at least in Chrome and Firefox on desktop and in mobile view (devtools emulation).

The PoC does not have to look perfect yet. The polish comes afterwards (see `docs/FINETUNING.md`).

## 12. Way of Working (mandatory)

- **Plan in the repo:** The implementation plan lives in **`docs/PLAN.md` in the repository**, **not** in `~/.claude/` or any other local folder. If you use a plan mode, transfer the plan to `docs/PLAN.md` and commit it. Keep the plan up to date: check off completed steps and briefly justify changes to the plan.
- **Small steps, one commit after each step.** Each step is small and works on its own (build green, no console errors) and is committed with a meaningful commit message in English. No huge catch-all commits.
- **Important things first (proof of concept), then fine-tuning.** First get the chain shell → one simulation → deployment working end to end, then broaden. Don't do polish early.
- **Fine-tuning list:** Anything you notice during the work that isn't part of the PoC goes as a todo into **`docs/FINETUNING.md`** instead of being implemented right away. Initial contents of this list (at least):
  - [ ] **Dark/light mode** (toggle + `prefers-color-scheme`)
  - [ ] Design polish, branding (colors, logo only after asking)
  - [ ] English explanation texts for all simulations
  - [ ] Topic filter on the landing page
  - [ ] "Booth mode": when idle, the projector cycles through simulations automatically (attract loop), returning on touch
  - [ ] QR code to the site shown in fullscreen mode
  - [ ] Automatically generated thumbnails (optional)
  - [ ] WebGL acceleration for the flow simulation if the CPU version is too slow on phones
  - [ ] More simulations from `ideas.md`
- **Ask instead of assuming** when something is unclear or a decision would break the "keep it simple" frame.

## 13. Task for Claude Code

1. **Read this document and `ideas.md` completely.**
2. **Create the implementation plan in `docs/PLAN.md`** (in English), broken into **small, individually committable steps**, roughly in this order:
   - **Phase 1, PoC core:** Vite + TS scaffold, minimal shell (router, landing page with tiles, simulation page, runner with fixed time step, control generation, pointer mapping), Markdown + KaTeX, i18n skeleton (German default), CSS variables, **Ising** as the first simulation, **GitHub Pages deployment**.
   - **Phase 2, breadth:** gravity, flow, `_template`, `check-sims` + CI (typecheck, smoke test), fullscreen/projector mode, metrics/sparkline.
   - **Phase 3, 3D path:** lazy-loaded Three.js, the 3D part of the contract, the Lorenz attractor.
   - **Phase 4, contributability:** README, CONTRIBUTING, MAINTAINERS, CLAUDE.md, English UI strings, walk through "new simulation from template" once.
   - **Afterwards:** fine-tuning per `docs/FINETUNING.md`.
3. Record in the plan: **the final simulation contract** (2D and 3D), the chosen dependencies with rationale (e.g. Tweakpane vs. lil-gui), the choice of fluid method, any gaps you noticed in `ideas.md`, and all assumptions about open points.
4. **Commit the plan and show it before implementing.** Then implement it step by step with one commit per step, and after each phase check in the browser that everything works (clean console, interaction works, including with touch emulation).

**Guiding principle for all trade-offs:** the most appealing, interactive result with the least code and complexity, one that students can still extend years from now.
