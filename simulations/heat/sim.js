// @ts-check
/**
 * Heat conduction: the heat equation ∂T/∂t = α ∇²T on a grid, explicit finite differences.
 * Paint hot spots with the left button / finger, cold spots with the right button.
 */
import { drawGrid, viridis } from "../../src/lib";

const WORLD = 256;

/**
 * @typedef {object} State
 * @property {number} n     cells per side
 * @property {Float32Array} T     temperature per cell (0 = cold, 1 = hot)
 * @property {Float32Array} nextT  buffer for the next step
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",
  world: { width: WORLD, height: WORLD },
  stepsPerSecond: 120,

  params: {
    size: {
      type: "select", options: [64, 128, 256], value: 128, resetOnChange: true,
      label: { de: "Gittergröße", en: "Grid size" },
    },
    clear: { type: "button", label: { de: "Abkühlen", en: "Cool down" }, action: (s) => { s.T.fill(0); } },
    alpha: { type: "range", min: 0.01, max: 0.24, step: 0.01, value: 0.2, label: { de: "Wärmeleitfähigkeit α", en: "Diffusivity α" } },
  },

  metrics: {
    mean: {
      label: { de: "Mittlere Temperatur", en: "Mean temperature" },
      value: (s) => s.T.reduce((a, b) => a + b, 0) / (s.n * s.n),
    },
  },

  init(params) {
    const n = Number(params.size);
    const T = new Float32Array(n * n);
    for (let y = Math.floor(0.4 * n); y < Math.floor(0.6 * n); y++) for (let x = Math.floor(0.4 * n); x < Math.floor(0.6 * n); x++) T[Math.floor(y * n + x)] = 1;
    return { n, T, nextT: new Float32Array(n * n) };
  },

  step(s, p) {
    const { T, nextT: next } = s;
    // Insulated borders: copy the edge, update only the interior.
    next.set(T);
    for (let y = 1; y < s.n - 1; y++) {
      for (let x = 1; x < s.n - 1; x++) {
        const i = y * s.n + x;
        const laplace = T[i - 1] + T[i + 1] + T[i - s.n] + T[i + s.n] - 4 * T[i];
        next[i] = T[i] + p.alpha * laplace; // stable for α ≤ 0.25
      }
    }
    s.T = next;
    s.nextT = T;
  },

  onPointer(s, p, e) {
    if (e.buttons === 0) return;
    const value = e.buttons & 2 ? 0 : 1;
    const cx = Math.floor(e.x / (WORLD / s.n)), cy = Math.floor(e.y / (WORLD / s.n));
    for (let y = cy - 3; y <= cy + 3; y++)
      for (let x = cx - 3; x <= cx + 3; x++)
        if (x >= 0 && y >= 0 && x < s.n && y < s.n) s.T[y * s.n + x] = value;
  },

  draw(ctx, s) {
    drawGrid(ctx, s.T, s.n, s.n, viridis, { min: 0, max: 1, width: WORLD, height: WORLD });
  },
};
