// @ts-check
/**
 * Checks every folder in simulations/ (including the template):
 *   - required files exist (sim.js|ts, meta.json, info.de.md, thumbnail)
 *   - meta.json and the simulation object follow the contract (src/types/index.ts)
 *   - smoke test without a browser: init + steps, every preset, button and pointer
 *     handler run without exceptions, and all metrics stay finite numbers
 * Also checks that the animation loop advances at the same speed at different frame rates.
 *
 * Run with `npm run check` (also runs the TypeScript check). Exits with code 1 on errors.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";

const ROOT = new URL("..", import.meta.url).pathname;
const SIM_DIR = join(ROOT, "simulations");
const SMOKE_STEPS = 200;
const THUMBNAIL_WARN_BYTES = 50 * 1024;

let errors = 0;
let warnings = 0;
/** @param {string} where @param {string} msg */
const error = (where, msg) => {
  errors++;
  console.log(`  ✗ ${where}: ${msg}`);
};
/** @param {string} where @param {string} msg */
const warn = (where, msg) => {
  warnings++;
  console.log(`  ! ${where}: ${msg}`);
};

/** A user-facing text: a non-empty string, or an object with a non-empty German string. */
const isText = (/** @type {any} */ t) =>
  (typeof t === "string" && t.trim() !== "") || (t && typeof t === "object" && typeof t.de === "string" && t.de.trim() !== "");

const isFn = (/** @type {any} */ f) => typeof f === "function";

// Tag keys are defined by the German UI strings ("tag.<key>").
const deStrings = JSON.parse(readFileSync(join(ROOT, "src/i18n/de.json"), "utf8"));
const knownTags = Object.keys(deStrings).filter((k) => k.startsWith("tag.")).map((k) => k.slice(4));

const server = await createServer({
  root: ROOT,
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});

try {
  const { defaultValues } = await server.ssrLoadModule("/src/runner/values.ts");
  const { stepsDue } = await server.ssrLoadModule("/src/runner/loop.ts");

  checkFrameRateIndependence(stepsDue);

  const folders = readdirSync(SIM_DIR).filter((f) => statSync(join(SIM_DIR, f)).isDirectory());
  for (const folder of folders) {
    console.log(`\n${folder}`);
    const dir = join(SIM_DIR, folder);
    const has = (/** @type {string} */ name) => existsSync(join(dir, name));

    // --- Files ---
    const simFiles = ["sim.js", "sim.ts"].filter(has);
    if (simFiles.length !== 1) error("files", "needs exactly one of sim.js or sim.ts");
    if (!has("info.de.md") || readFileSync(join(dir, "info.de.md"), "utf8").trim() === "")
      error("files", "info.de.md (German explanation text) is missing or empty");
    const thumbs = ["thumbnail.webp", "thumbnail.png"].filter(has);
    if (thumbs.length === 0) error("files", "thumbnail.webp (or .png) is missing (press T on the running simulation in `npm run dev`)");
    else {
      const size = statSync(join(dir, thumbs[0])).size;
      if (size > THUMBNAIL_WARN_BYTES) warn("files", `${thumbs[0]} is ${Math.round(size / 1024)} KB (guideline ≤ 50 KB)`);
    }

    // --- meta.json ---
    if (!has("meta.json")) error("meta.json", "missing");
    else {
      try {
        const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
        if (!isText(meta.title)) error("meta.json", "title needs a German text ({ \"de\": \"...\" })");
        if (!isText(meta.description)) error("meta.json", "description needs a German text");
        for (const tag of meta.tags ?? [])
          if (!knownTags.includes(tag)) error("meta.json", `unknown tag "${tag}" (known: ${knownTags.join(", ")}; add new ones to src/i18n/*.json)`);
        if (meta.order !== undefined && typeof meta.order !== "number") error("meta.json", "order must be a number");
      } catch (e) {
        error("meta.json", `invalid JSON: ${/** @type {Error} */ (e).message}`);
      }
    }

    if (simFiles.length !== 1) continue;

    // --- Contract and smoke test ---
    let sim;
    try {
      sim = (await server.ssrLoadModule(`/simulations/${folder}/${simFiles[0]}`)).default;
    } catch (e) {
      error(simFiles[0], `cannot be loaded: ${/** @type {Error} */ (e).message}`);
      continue;
    }
    if (!checkContract(sim)) continue;

    smokeTest(sim, "default parameters", defaultValues(sim, false));
    smokeTest(sim, "mobile parameters", defaultValues(sim, true));
    for (const [key, preset] of Object.entries(sim.presets ?? {})) {
      const values = { ...defaultValues(sim, false), ...preset.params };
      smokeTest(sim, `preset "${key}"`, values, preset.state ? () => preset.state(values) : undefined);
    }
  }
} finally {
  await server.close();
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 ? 1 : 0);

// ---------------------------------------------------------------------------

/** Returns false if the basics are so broken that a smoke test makes no sense. */
function checkContract(/** @type {any} */ sim) {
  const where = "contract";
  if (!sim || typeof sim !== "object") {
    error(where, "sim file must `export default { ... }` a simulation object");
    return false;
  }
  let ok = true;
  if (sim.renderer !== "2d" && sim.renderer !== "3d") (error(where, 'renderer must be "2d" or "3d"'), (ok = false));
  for (const fn of ["init", "step"]) if (!isFn(sim[fn])) (error(where, `${fn}() is missing`), (ok = false));
  if (sim.renderer === "2d") {
    if (!(sim.world?.width > 0 && sim.world?.height > 0)) (error(where, "2D simulations need world: { width, height }"), (ok = false));
    if (!isFn(sim.draw)) (error(where, "2D simulations need draw()"), (ok = false));
  }
  if (sim.renderer === "3d") {
    for (const fn of ["setup3d", "update3d"]) if (!isFn(sim[fn])) (error(where, `3D simulations need ${fn}()`), (ok = false));
  }
  for (const key of ["dt", "stepsPerSecond", "maxSpeed", "maxStepsPerFrame"])
    if (sim[key] !== undefined && !(sim[key] > 0)) error(where, `${key} must be a positive number`);

  for (const [key, p] of Object.entries(sim.params ?? {})) {
    const at = `params.${key}`;
    if (!isText(p.label)) error(at, "needs a label with German text");
    switch (p.type) {
      case "range":
        if (!(p.min < p.max)) error(at, "needs min < max");
        for (const v of ["value", "mobileValue"])
          if (p[v] !== undefined && !(p[v] >= p.min && p[v] <= p.max)) error(at, `${v} ${p[v]} is outside [${p.min}, ${p.max}]`);
        break;
      case "select": {
        const options = Array.isArray(p.options) ? p.options.map(String) : Object.keys(p.options ?? {});
        if (options.length === 0) error(at, "needs options");
        for (const v of ["value", "mobileValue"])
          if (p[v] !== undefined && !options.includes(String(p[v]))) error(at, `${v} "${p[v]}" is not one of the options`);
        if (!Array.isArray(p.options) && typeof p.value !== "string")
          error(at, "with labelled options ({ value: label }) the value must be a string key");
        break;
      }
      case "boolean":
        if (typeof p.value !== "boolean") error(at, "value must be true or false");
        break;
      case "button":
        if (!isFn(p.action)) error(at, "needs action(state, params)");
        break;
      default:
        error(at, `unknown type "${p.type}" (range, select, boolean, button)`);
    }
  }
  for (const [key, preset] of Object.entries(sim.presets ?? {})) {
    if (!isText(preset.label)) error(`presets.${key}`, "needs a label with German text");
    for (const k of Object.keys(preset.params ?? {}))
      if (!sim.params?.[k]) error(`presets.${key}`, `sets unknown parameter "${k}"`);
  }
  for (const [key, m] of Object.entries(sim.metrics ?? {})) {
    if (!isText(m.label)) error(`metrics.${key}`, "needs a label with German text");
    if (!isFn(m.value)) error(`metrics.${key}`, "needs value(state, params)");
  }
  return ok;
}

/**
 * Run the simulation headless and make sure nothing throws and all metrics stay finite.
 * @param {any} sim
 * @param {string} label
 * @param {Record<string, any>} values
 * @param {() => any} [makeState]  builds the start state instead of init() (presets)
 */
function smokeTest(sim, label, values, makeState) {
  const where = `smoke test (${label})`;
  try {
    let state = makeState ? makeState() : sim.init(values);
    const t0 = performance.now();
    for (let i = 0; i < SMOKE_STEPS; i++) sim.step(state, values, sim.dt ?? 1);
    const msPerStep = (performance.now() - t0) / SMOKE_STEPS;
    checkMetrics(sim, state, values, where);

    for (const [key, p] of Object.entries(sim.params ?? {})) {
      if (p.type !== "button") continue;
      const result = p.action(state, values);
      if (result !== undefined) state = result;
      sim.step(state, values, sim.dt ?? 1);
      checkMetrics(sim, state, values, `${where}, after button "${key}"`);
    }

    if (isFn(sim.onPointer) && sim.renderer === "2d") {
      const { width: w, height: h } = sim.world;
      const pointer = (/** @type {string} */ type, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ buttons) =>
        sim.onPointer(state, values, { type, x, y, buttons, button: 0, pointerType: "mouse" });
      pointer("down", w * 0.5, h * 0.5, 1);
      pointer("move", w * 0.6, h * 0.4, 1);
      pointer("up", w * 0.6, h * 0.4, 0);
      pointer("move", -w, -h, 0); // hovering outside the world must not break anything
      for (let i = 0; i < 10; i++) sim.step(state, values, sim.dt ?? 1);
      checkMetrics(sim, state, values, `${where}, after pointer input`);
    }

    const budget = msPerStep * (sim.stepsPerSecond ?? 60);
    console.log(`  ✓ ${label}: ${msPerStep.toFixed(2)} ms/step ≈ ${Math.round(budget)} ms CPU per second at speed ×1`);
  } catch (e) {
    error(where, `threw ${/** @type {Error} */ (e).stack?.split("\n").slice(0, 3).join(" | ")}`);
  }
}

function checkMetrics(/** @type {any} */ sim, /** @type {any} */ state, /** @type {any} */ values, /** @type {string} */ where) {
  for (const [key, m] of Object.entries(sim.metrics ?? {})) {
    const v = m.value(state, values);
    if (typeof v !== "number" || !Number.isFinite(v)) error(where, `metric "${key}" is ${v}`);
  }
}

/** Simulated speed must not depend on the frame rate (as long as the step cap isn't hit). */
function checkFrameRateIndependence(/** @type {(acc: number, elapsed: number, rate: number, cap: number) => { steps: number, acc: number }} */ stepsDue) {
  console.log("animation loop");
  const rate = 60;
  for (const fps of [30, 60, 144]) {
    let acc = 0;
    let steps = 0;
    for (let frame = 0; frame < fps * 10; frame++) {
      const due = stepsDue(acc, 1 / fps, rate, 100);
      acc = due.acc;
      steps += due.steps;
    }
    const perSecond = steps / 10;
    if (Math.abs(perSecond - rate) > rate * 0.05) error("loop", `${fps} fps gives ${perSecond} steps/s instead of ${rate}`);
    else console.log(`  ✓ ${fps} fps → ${perSecond} steps/s`);
  }
  const capped = stepsDue(0, 1, 1000, 10);
  if (capped.steps !== 10 || capped.acc !== 0) error("loop", "surplus steps beyond the cap must be dropped");
  else console.log("  ✓ steps beyond the per-frame cap are dropped");
}
