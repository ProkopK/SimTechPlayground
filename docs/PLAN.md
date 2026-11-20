# SimTech Playground: Implementation Plan

> Source of truth for the implementation plan. Check off steps as they are committed; briefly justify any change to the plan in the "Plan changes" section at the end.

## Context

`PROJECT_BRIEF.md` describes SimTech Playground: a static, browser-only website with small interactive simulations from the Simulation Technology program, used at fairs (projector, laptops, phones) and as a permanent site. The repo currently contains only `LICENSE`, `PROJECT_BRIEF.md` and `ideas.md`. This plan turns the brief into small, individually committable steps: first the end-to-end chain (shell → Ising → GitHub Pages), then breadth (gravity, flow, template, CI), then the 3D path (Lorenz), then contributor docs.

## Working agreements (from the brief and team decisions)

- One small, working commit per step (English messages, build green, no console errors). Commits go directly to `main`.
- **Push `main` at the end of each phase** (triggers Pages deployment so you can test on real devices).
- **Browser checks per phase** with ad-hoc Playwright (headless Chromium + Firefox, run from the session scratchpad, not a project dependency): clean console, screenshots, mouse and touch-emulated pointer input, mobile viewport. The team spot-checks on real devices.
- Anything outside the PoC goes to `docs/FINETUNING.md` instead of being built.

## Assumptions about open points (brief §10)

| Point | Assumption |
|---|---|
| Repo / base path | Remote is `ProkopK/SimTechPlayground` → Vite `base` = `/SimTechPlayground/`, overridable via env `BASE_PATH` (e.g. `/` for a custom domain or university hosting). |
| Program website link | Placeholder constant `PROGRAM_URL = "https://example.org/simtech"` in one config file, marked `TODO`. |
| Branding | Neutral palette via CSS variables only; no logo. |
| GitHub Pages | Pages source must be set to "GitHub Actions" once in repo settings. Claude asks before doing this via `gh api` (or a maintainer clicks it). |
| Node | CI uses Node 24 LTS; `engines: ">=22"`. Local Node 26 works. |
| Simulation speed | **Frame-rate independent** (team requirement, deviates from the brief's "steps per frame"): each sim declares a base rate `stepsPerSecond`; the speed slider is a multiplier (×0.1 … ×max). The loop accumulates real elapsed time and runs as many fixed `dt` steps as are due, so 30 fps and 60 fps devices advance at the same simulated speed (30 fps just does ~2 steps per frame). Safeguards: elapsed time per frame clamped to 0.1 s (tab switches, hiccups), and steps per frame capped at `maxStepsPerFrame`; if a device can't keep up, the surplus is dropped (the sim runs slower instead of freezing in a "spiral of death"). |

## Dependencies (final)

| Package | Why |
|---|---|
| `vite`, `typescript` (dev) | Decided in brief. |
| `lil-gui` | Controls. **Chosen over Tweakpane**: smaller (~10 KB gz vs ~30 KB+), one flat API (`add(obj, key, min, max, step)`, `onChange`), all needed widgets (slider, dropdown, toggle, button), touch-friendly, themeable via CSS variables. Tweakpane's extra features (graph monitors, plugins) are not needed: the sparkline is ~30 lines of our own canvas code. |
| `marked` | Markdown for explanation texts. Math is handled by a ~30-line custom marked extension (`$…$`, `$$…$$` → KaTeX), so no `marked-katex-extension`. |
| `katex` | Formulas. Dynamically imported only on simulation pages (together with marked). |
| `three` (+ `@types/three` dev) | 3D incl. `OrbitControls` from `three/addons`. Dynamically imported only for `renderer: "3d"`. |

No test framework: the headless smoke test in `scripts/check-sims.js` loads simulations through Vite's own SSR module loader (`createServer` + `ssrLoadModule`), so JS/TS sims and `src/lib` imports resolve exactly as in the app without `tsx`/`vitest`.

## Fluid method: Lattice Boltzmann (D2Q9, BGK) on the CPU

- Produces a Kármán vortex street behind a cylinder at moderate Re on a ~200×80 grid; Stable Fluids is unconditionally stable but numerically so diffusive at this resolution that vortex shedding is weak or absent.
- Obstacles are trivial: a per-cell solid flag with bounce-back. Drawing/erasing live just toggles flags.
- Purely local, explicit update in `Float32Array`s (one fused stream+collide pass, two buffers), with no pressure solve. Short, readable code.
- Stability: clamp inflow speed to ≤ 0.12 (lattice units) and relaxation time τ ≥ 0.51 (from viscosity slider); check for NaN every N steps and reset automatically. Grid 200×80 on desktop, smaller on phones via `mobileValue`.
- Boundaries: equilibrium inflow on the left, zero-gradient outflow on the right, free-slip top/bottom; small initial perturbation to trigger shedding.

## Final simulation contract (`src/types/index.ts`)

```ts
/** Text shown to users: plain string (language-neutral) or per language; German required. */
export type Text = string | { de: string; en?: string };

interface ParamBase { label: Text; resetOnChange?: boolean }
export type Param =
  | ParamBase & { type: "range";   min: number; max: number; step?: number; value: number; mobileValue?: number }
  | ParamBase & { type: "select";  options: (number | string)[] | Record<string, Text>; value: number | string; mobileValue?: number | string }
  | ParamBase & { type: "boolean"; value: boolean }
  | ParamBase & { type: "button";  action(state: any, params: Values): any | void }; // may mutate or return new state

export type Values = Record<string, number | string | boolean>; // current param values passed to the sim

export interface Preset {            // shown as a "Preset" dropdown
  label: Text;
  params?: Partial<Values>;          // applied first
  state?(params: Values): any;       // optional: build a specific initial state (else init() if a resetOnChange param changed)
}

export interface Metric {
  label: Text;
  value(state: any, params: Values): number; // cheap; compute heavy values in step() and store on state
  plot?: boolean;                    // sparkline, default true
  digits?: number;
}

export interface PointerInfo {       // x, y already in world coordinates (2D)
  type: "down" | "move" | "up";
  x: number; y: number;
  buttons: number; button: number;   // right button = 2 (context menu suppressed on canvas)
  pointerType: "mouse" | "touch" | "pen";
}

export interface View2D { width: number; height: number; pixelsPerUnit: number }
// draw() gets a ctx already transformed to world coordinates, origin top-left, y down.

export interface Three3D {           // provided by the shell for 3D sims
  THREE: typeof import("three");
  scene: Scene; camera: PerspectiveCamera; controls: OrbitControls;
}

interface SimBase<S> {
  params?: Record<string, Param>;
  presets?: Record<string, Preset>;
  metrics?: Record<string, Metric>;
  dt?: number;                                    // fixed time step passed to step(), default 1
  stepsPerSecond?: number;                        // real-time base rate at speed ×1, default 60
  maxSpeed?: number;                              // upper end of the speed multiplier slider, default 5
  maxStepsPerFrame?: number;                      // safety cap per rendered frame, default ceil(4 × stepsPerSecond × maxSpeed / 60)
  init(params: Values): S;
  step(state: S, params: Values, dt: number): void; // pure computation: no DOM/Canvas/WebGL
  onPointer?(state: S, params: Values, e: PointerInfo): void;
}
export interface Simulation2D<S = any> extends SimBase<S> {
  renderer: "2d";
  world: { width: number; height: number };       // logical coords; shell letterboxes + handles DPR
  draw(ctx: CanvasRenderingContext2D, state: S, params: Values, view: View2D): void;
}
export interface Simulation3D<S = any, V = any> extends SimBase<S> {
  renderer: "3d";
  camera?: { position: [number, number, number]; target?: [number, number, number] };
  autoRotate?: boolean;                           // slow rotation while idle (projector)
  setup3d(three: Three3D, state: S, params: Values): V; // create objects once (after init/reset); return handles
  update3d(view: V, state: S, params: Values): void;    // per frame
}
export type Simulation = Simulation2D | Simulation3D;

export interface SimMeta {           // simulations/<id>/meta.json
  title: Text; description: Text;    // description: one sentence
  tags?: TagKey[];                   // keys from a central list, translated in src/i18n/*.json
  order?: number;                    // optional sort key on the landing page
}
```

Changes vs. the brief's draft (justified):
- Speed is expressed as real-time rate (`stepsPerSecond` × speed multiplier) instead of steps per frame, so simulated speed does not depend on the device's frame rate.
- `setup3d` returns a handle object passed to `update3d`, so Three.js objects need neither module globals nor live in the headless-testable state. On reset the shell disposes the scene contents and calls `setup3d` again.
- `metrics` is declarative (label + value getter) so labels are translatable, consistent with `params`.
- `button` params carry their own `action`; `presets` cover "named parameter or state" setups (e.g. gravity's sun + planets).
- `mobileValue` on params covers "grid sizes may be chosen per device" without device checks in sim code (shell picks it when `matchMedia("(max-width: 700px), (pointer: coarse)")` matches).
- Metadata lives in `meta.json` (not code): eagerly importable without touching sim code, readable by `check-sims` without a loader. Thumbnails: `thumbnail.webp` (or `.png`).

Per-simulation folder: `sim.js|sim.ts`, `meta.json`, `info.de.md` (required), `info.en.md` (optional), `thumbnail.webp`. Folders starting with `_` (the template) are not shown on the site but are checked by `check-sims`.

Discovery in `src/registry.ts`:
- `import.meta.glob("/simulations/[!_]*/meta.json", { eager: true })` and thumbnails with `{ eager: true, query: "?url", import: "default" }` → landing page.
- `import.meta.glob("/simulations/[!_]*/sim.{js,ts}")` (lazy) and `…/info.*.md` with `query: "?raw"` (lazy) → simulation page.

## Gaps noticed in `ideas.md` (not built now; recorded here and in FINETUNING where relevant)

| Idea | Fits the contract? | Gap / note |
|---|---|---|
| Lennard-Jones (ensembles, thermostat, observables) | Yes (2D particles, params, metrics + sparklines) | Needs a cell-list neighbor helper in `src/lib` for N > ~500. Distribution plots (velocity histogram, RDF) are not covered by scalar metrics: a sim can draw them itself on the canvas; a `charts` extension could come later. |
| Swarm behavior | Yes | Same neighbor helper useful. |
| Structural mechanics / truss builder | Mostly | Tool modes (place node / beam / load) via a `select` param + `onPointer` work; needs a small linear solver (dense Cholesky/CG) in `src/lib` later. "Test to failure" = steps of increasing load. |
| Convection / heat transfer, turbulence | Yes (grid renderer, colormaps) | Turbulence at useful resolution likely needs the WebGL path (already on FINETUNING). |
| Electronic structure | Yes, if the time evolution is e.g. SCF iterations as steps | 2D or 3D; possibly heavy → see Worker note. |
| Hydrogen wavefunctions | Yes: `THREE.Points` with positions/colors updated in `update3d`; superposition time evolution via `step` | No 3D picking in `onPointer` (only orbit/zoom); add a ray-based `onPointer3d` only if an idea needs it. Sampling many points per frame may want a Web Worker. |
| Neural network classifier | Yes: step = training iteration, decision boundary via grid renderer, `onPointer` adds data points | — |
| General | — | `step` always runs on the main thread. Heavy sims could later run `step` in a Worker; the strict step/draw split keeps that possible (same applies to a future Pyodide path). |

---

## Steps

Each step ends with: `npm run build` green, `npx tsc --noEmit` green, no console errors; then one commit.

### Phase 0: Plan
- [x] **0.1** Add `docs/PLAN.md` (this plan) and `docs/FINETUNING.md` (initial list from brief §12 plus: charts/histograms for sims, neighbor-list and linear-solver helpers, Web Worker option). Commit.

### Phase 1: PoC core (chain shell → Ising → deployment)
- [x] **1.1 Scaffold:** `package.json` (scripts `dev`, `build`, `preview`, `typecheck`), `tsconfig.json` (strict, `allowJs`, `checkJs: false` so only `// @ts-check` JS files are checked, includes `src`, `simulations`, `scripts`), `vite.config.ts` (`base` from `BASE_PATH`, default `/SimTechPlayground/`), `index.html`, `src/main.ts` placeholder, `.gitignore`. → verify: dev server shows page, build ok.
- [x] **1.2 Deployment early:** `.github/workflows/deploy.yml` (push to `main`: `npm ci` → typecheck → build → `actions/upload-pages-artifact` → `actions/deploy-pages`). Ask before enabling Pages source via `gh api`. → verify after the phase push: site reachable at `https://prokopk.github.io/SimTechPlayground/`.
- [x] **1.3 Styles:** `src/styles/` with CSS variables (colors, spacing, font sizes, radius) on `:root`, base layout, responsive breakpoints (phone portrait, desktop, projector 16:9 with larger type), lil-gui themed via its CSS variables.
- [x] **1.4 i18n skeleton:** `src/i18n/de.json`, `en.json` (UI strings + tag names), `t(key)`, `text(Text)` resolver with German fallback (never throws), language from localStorage (try/catch) → browser language → `de`. Language switcher component.
- [x] **1.5 Contract types:** `src/types/index.ts` as above, exported for JSDoc use (`/** @type {import('../../src/types').Simulation2D} */`).
- [x] **1.6 Registry:** `src/registry.ts` with the globs above; list of `{ id, meta, thumbnail, loadSim(), loadInfo(lang) }`.
- [x] **1.7 Router + landing page:** hash routes `#/` and `#/sim/<id>`; header (title, what is SimTech, link placeholder), tile grid (thumbnail or placeholder, title, description, tags); landing page imports no sim code. Unknown id → friendly "not found".
- [x] **1.8 2D runner:** `src/runner/loop.ts` (rAF, fixed `dt`, real-time accumulator as a small pure function `stepsDue(acc, elapsed, rate, cap) → { steps, acc }` (elapsed clamped to 0.1 s, steps capped, surplus dropped), pause/resume (resume resets the frame timestamp so no catch-up burst), reset, auto-pause on `visibilitychange`, try/catch → "Simulation abgestürzt" message with reset button) and `src/runner/canvas2d.ts` (ResizeObserver, DPR, letterboxed world transform, `View2D`). Cleanup on route change. Dev-only: key `T` downloads the canvas as `thumbnail.webp` (≤ 400×300) for contributors.
- [x] **1.9 Controls:** `src/ui/controls.ts` builds lil-gui from `params` (range/select/boolean/button), `presets` dropdown, shell controls (pause/resume, reset, speed multiplier slider ×0.1 … ×`maxSpeed`). Changes write into the live `Values`; `resetOnChange` triggers reset. `mobileValue` applied at start.
- [x] **1.10 Pointer mapping:** `src/runner/pointer.ts` with Pointer Events → world coords → `onPointer`; pointer capture, `touch-action: none` on canvas, context menu suppressed.
- [x] **1.11 `src/lib` (2D basics):** seedable RNG (mulberry32), colormaps (viridis, blue–white–red diverging) as 256-entry LUTs, grid renderer (`Float32Array`/`Int8Array` + colormap → offscreen `ImageData` → `drawImage` into world rect, smoothing off).
- [x] **1.12 Explanation panel:** `src/ui/info.ts` lazy-imports `marked` + `katex` (+ KaTeX CSS), custom math extension, renders `info.<lang>.md` with fallback to `info.de.md`. Layout: beside canvas on desktop, below on mobile.
- [x] **1.13 Ising:** `simulations/ising/` (JS with `@ts-check`, heavily commented): periodic square lattice in `Int8Array`, Metropolis random-site sweeps (1 step = 1 sweep, `stepsPerSecond` ≈ 30), acceptance LUT over (ΔE, field) rebuilt when T/B change; params T (0.1–5, default 2.27), B (−1…1), size (64/128/256, `resetOnChange`, mobile 128), touch paint mode toggle; buttons „Zufällig (heiß)“, „Alle ausgerichtet (kalt)“; painting with mouse (left up / right down) and touch; metrics magnetization and energy per spin (tracked incrementally in `step`); `meta.json`, `info.de.md` (magnets, phase transition, energy + Boltzmann factor, Monte Carlo in the program), thumbnail.
- [x] **1.14 Phase check:** Playwright in Chromium + Firefox (desktop and 390×844 touch emulation): landing → Ising, console clean, frame-rate independence (see Verification), painting works with mouse and touch, sliders/reset/pause work, formulas render. Check build output: landing chunk contains no sim/KaTeX code. Update PLAN.md, push, verify Pages deployment.

### Phase 2: Breadth
- [x] **2.1 `src/lib` (motion):** 2D/3D vector helpers (plain functions on arrays/typed arrays, no classes), integrators (`euler`, `rk4` on `Float64Array` state with derivative callback, leapfrog/velocity-Verlet helper), trail ring buffer.
- [x] **2.2 Metrics + sparkline:** `src/ui/metrics.ts` shows each metric as number plus a small canvas sparkline (last ~300 samples), updated a few times per second.
- [x] **2.3 Gravity:** structure-of-arrays bodies (N ≤ 300), O(N²) with softening, kick-drift-kick leapfrog; slingshot placement with preview line (drawn in `draw` from state); params mass, time scale, trails, merging on/off, center on center of mass; bodies beyond a large radius removed; presets sun + planets, binary star, random cluster, figure-8; metric total energy (shows integrator quality); `info.de.md`, thumbnail.
- [x] **2.4 Flow, solver:** `simulations/flow/` LBM D2Q9 BGK as described; rendering speed / vorticity (dropdown) via grid renderer; params inflow speed, viscosity (clamped), metric Reynolds number; NaN auto-reset; cylinder default.
- [x] **2.5 Flow, interaction:** draw/erase obstacles live (tool toggle, erase with right button), presets cylinder, airfoil, empty; optional tracer particles; `info.de.md` (vortex shedding, Re formula, CFD), thumbnail. Measure fps at desktop/mobile grid size; if too slow, reduce `mobileValue` grid.
- [x] **2.6 Fullscreen/projector mode:** button → Fullscreen API on the sim container (CSS fallback class where unsupported, e.g. iPhone): canvas maximized, text hidden, controls collapsible; `Esc`/button exits.
- [x] **2.7 `_template`:** `simulations/_template/` minimal commented 2D example in JS with `// @ts-check` (e.g. bouncing particles: one slider, one toggle, one button, `onPointer`, one metric), `meta.json`, `info.de.md` with a formula example, thumbnail.
- [x] **2.8 `check-sims`:** `scripts/check-sims.js` (`npm run check`): for every folder: required files exist, `meta.json` valid (German title/description, known tags), thumbnail exists (warn > 50 KB), sim exports a valid contract shape (renderer, required functions, param definitions valid, `value` within range/options); smoke test: `init` + 200 `step`s (also after each preset and with `mobileValue`s) without exceptions and with finite metrics. `npm run check` also runs `tsc --noEmit`.
- [x] **2.9 CI:** `.github/workflows/ci.yml` for PRs (typecheck, check, build); add `npm run check` to `deploy.yml`.
- [x] **2.10 Phase check:** Playwright on all three sims incl. touch slingshot and obstacle drawing, fullscreen; push; verify deployment.

### Phase 3: 3D path
- [ ] **3.1 3D runner:** `src/runner/three.ts` dynamically imports `three` and `OrbitControls`; renderer (DPR capped at 2), camera, ambient + directional light, controls with touch, optional idle auto-rotate (stops on interaction, resumes after ~5 s); resize; reset disposes geometries/materials and calls `setup3d` again; leaving the page calls `renderer.dispose()` and `forceContextLoss()`.
- [ ] **3.2 Lorenz:** `simulations/lorenz/`: K trajectories (1–10, `resetOnChange`) starting 1e-5 apart, RK4 from `src/lib`, per-trajectory ring buffer → `THREE.Line` with `BufferGeometry` and vertex colors fading along the trail; params σ, ρ, β (10, 28, 8/3), trajectory count, trail length; metric: distance between first two trajectories (shows exponential divergence); `info.de.md` (equations, deterministic chaos, weather), thumbnail.
- [ ] **3.3 Phase check:** Playwright (WebGL in headless Chromium/Firefox), orbit via mouse and touch; verify `three` is in its own chunk, not loaded by landing page or 2D sims; push; verify deployment.

### Phase 4: Contributability
- [ ] **4.1** `README.md` (what it is, live link, quick start, project structure).
- [ ] **4.2** `CONTRIBUTING.md` (add a 2D and a 3D sim step by step, contract reference, JS vs TS, Markdown + formulas, thumbnails via `T` key, performance tips: typed arrays, no allocations in `step`, compute metrics in `step`; text guidelines: German first, for high school students, short, link to program; pre-PR checklist).
- [ ] **4.3** `docs/MAINTAINERS.md` (yearly handover: deployment and Pages settings, `BASE_PATH`, reviewing sim PRs, updating dependencies, where things live).
- [ ] **4.4** `CLAUDE.md` (languages per §0, contract rules, way of working per §12, plan/fine-tuning files).
- [ ] **4.5** English: complete `en.json` UI strings, English `title`/`description`/param labels in all `meta.json`/params (explanation texts stay German-only for now → FINETUNING).
- [ ] **4.6 Template walkthrough:** on a throwaway branch, create a new sim by copying `_template` and following only CONTRIBUTING; record friction, fix docs/template on `main`, note the result in PLAN.md (the demo sim is not merged).
- [ ] **4.7 Final DoD check (brief §11)** in Chromium + Firefox desktop and mobile emulation, all sims; push; verify deployment.

### Afterwards
- Fine-tuning items from `docs/FINETUNING.md`, in an order agreed with the team.

## Verification summary

- Per step: `npm run build`, `npm run typecheck` (from 2.8: `npm run check`).
- Per phase: Playwright script in the scratchpad (`npx playwright` with Chromium + Firefox): visit every route, assert no console errors/page errors, take screenshots at 1280×800, 1920×1080 and 390×844 (touch), dispatch mouse and touch pointer sequences on the canvas and assert state changes visibly (screenshot diff), toggle pause/reset/fullscreen. Inspect `dist/assets` chunk contents for lazy loading.
- Frame-rate independence: (a) `check-sims` (from 2.8) also asserts `stepsDue` over 1 s of simulated frames yields the same step count (±5 %) at 30, 60 and 144 fps, and drops surplus at the cap; (b) in Playwright/Chromium, run Ising for 5 s normally and with CDP CPU throttling (`Emulation.setCPUThrottlingRate`) to force a lower frame rate, read the step counter exposed in dev mode (`window.__simSteps`), and confirm both counts are within ~10 % as long as the cap isn't hit.
- After each phase push: GitHub Actions green, live site loads.

## Plan changes

- 2026-11-20: Speed control changed from "steps per frame" (brief §5.3) to a frame-rate independent real-time rate (`stepsPerSecond` × multiplier), at the team's request, so 30 fps and 60 fps devices run at the same simulated speed.
- 2026-11-20 (Phase 1): Small deviations while implementing:
  - `@types/node` added (Vite config and scripts use Node APIs); `three` and `@types/three` installed already in 1.5 so the 3D part of the contract is typed (type-only import, no bundle cost).
  - The whole simulation page (runner, lil-gui) is lazy-loaded too, not only the simulation module: the landing page now loads ~7 kB JS.
  - `src/lib/grid.ts`: the default target rectangle is one world unit per cell (0, 0, nx, ny); the full world size is not derivable from the canvas because of letterboxing.
  - Ising defaults to a 128×128 grid on all devices instead of 256 (desktop) / 128 (mobile): a 256² sweep took ~7 ms on a fast machine, too much for older laptops at higher speeds. 256 stays selectable.
  - Dev-only hooks `window.__runner` / `window.__simSteps` for the automated browser checks.
  - `en.json` is intentionally incomplete until 4.5 (exercises the German fallback).
  - `gh` is not installed on the dev machine, so GitHub Pages ("Source: GitHub Actions") has to be enabled manually in the repo settings.
- 2026-11-20 (Phase 2): Deviations while implementing:
  - Flow: the interior LBM kernel is written out per direction (2.5× faster than the loop version, which is kept for boundary cells as the readable reference); 200×80 costs ~1.6 ms/step. A smaller default cylinder (diameter ny/8), viscosity 0.008, and a sideways push at start make the vortex street appear within seconds instead of ~20 s.
  - Flow on phones defaults to 150×60 via `mobileValue`.
  - Gravity: the cluster preset got velocity dispersion so it doesn't clump instantly; the camera "follows" the center of mass only in drawing/pointer mapping (physics stays in absolute coordinates).
  - Sparklines use a minimum vertical span of 1% of the value, so numerical noise in conserved quantities looks flat.
  - `check-sims` prints ms/step and CPU time per second at speed ×1 per simulation, which helps contributors spot slow simulations.
