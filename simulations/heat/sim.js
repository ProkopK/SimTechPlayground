// @ts-check
/**
 * Heat conduction: the heat equation ∂T/∂t = α ∇²T on a grid, explicit finite differences.
 * Paint hot spots with the left button / finger, cold spots with the right button.
 */
import { drawGrid, viridis } from "../../src/lib";

const N = 100;

/**
 * @typedef {object} State
 * @property {Float32Array} T     temperature per cell (0 = cold, 1 = hot)
 * @property {Float32Array} next  buffer for the next step
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",
  world: { width: N, height: N },
  stepsPerSecond: 120,

  params: {
    alpha: { type: "range", min: 0.01, max: 0.24, step: 0.01, value: 0.2, label: { de: "Wärmeleitfähigkeit α", en: "Diffusivity α" } },
    clear: { type: "button", label: { de: "Abkühlen", en: "Cool down" }, action: (s) => { s.T.fill(0); } },
  },

  metrics: {
    mean: {
      label: { de: "Mittlere Temperatur", en: "Mean temperature" },
      value: (s) => s.T.reduce((a, b) => a + b, 0) / (N * N),
    },
  },

  init() {
    const T = new Float32Array(N * N);
    for (let y = 40; y < 60; y++) for (let x = 40; x < 60; x++) T[y * N + x] = 1;
    return { T, next: new Float32Array(N * N) };
  },

  step(s, p) {
    const { T, next } = s;
    // Insulated borders: copy the edge, update only the interior.
    next.set(T);
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        const laplace = T[i - 1] + T[i + 1] + T[i - N] + T[i + N] - 4 * T[i];
        next[i] = T[i] + p.alpha * laplace; // stable for α ≤ 0.25
      }
    }
    s.T = next;
    s.next = T;
  },

  onPointer(s, p, e) {
    if (e.buttons === 0) return;
    const value = e.buttons & 2 ? 0 : 1;
    const cx = Math.floor(e.x), cy = Math.floor(e.y);
    for (let y = cy - 3; y <= cy + 3; y++)
      for (let x = cx - 3; x <= cx + 3; x++)
        if (x >= 0 && y >= 0 && x < N && y < N) s.T[y * N + x] = value;
  },

  draw(ctx, s) {
    drawGrid(ctx, s.T, N, N, viridis, { min: 0, max: 1 });
  },
};
