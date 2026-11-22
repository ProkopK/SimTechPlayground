// @ts-check
/**
 * Ising model: a grid of tiny magnets ("spins") that point up (+1) or down (−1).
 *
 * Neighboring spins like to point the same way (coupling J = 1). Temperature T adds random
 * flipping. Below the critical temperature T_c ≈ 2.269 large aligned regions (domains) form
 * and the grid becomes magnetized; above T_c the order melts away.
 *
 * Method: Metropolis Monte Carlo. Pick a random spin, compute the energy change ΔE of
 * flipping it, and flip with probability min(1, exp(−ΔE / T)). One `step` is one sweep,
 * i.e. on average one flip attempt per spin. Units: J = 1, k_B = 1.
 */
import { naviYellow, createRng, drawGrid } from "../../src/lib";

/** The lattice is drawn into a square world of this size, whatever the number of cells. */
const WORLD = 256;

/**
 * @typedef {object} State
 * @property {number} n           cells per side
 * @property {Int8Array} spins    n·n spins (+1 or −1), row-major: index = y·n + x
 * @property {number} M           total magnetization Σ s_i
 * @property {number} Eint        interaction energy −Σ_<ij> s_i s_j (each neighbor pair once)
 * @property {Float64Array} lut   flip acceptance probabilities, see updateLut()
 * @property {number} lutT        temperature the lookup table was built for
 * @property {number} lutB        field the lookup table was built for
 * @property {import("../../src/lib").Rng} rng
 * @property {{ x: number, y: number } | null} brush  last pointer position while painting
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",
  world: { width: WORLD, height: WORLD },
  stepsPerSecond: 30, // sweeps per second at speed ×1

  params: {
    T: {
      type: "range", min: 0.01, max: 5, step: 0.01, value: 2.27,
      label: { de: "Temperatur T", en: "Temperature T" },
    },
    B: {
      type: "range", min: -3, max: 3, step: 0.01, value: 0,
      label: { de: "Magnetfeld B", en: "Magnetic field B" },
    },
    size: {
      type: "select", options: [64, 128, 256], value: 128, resetOnChange: true,
      label: { de: "Gittergröße", en: "Grid size" },
    },
    paintDown: {
      type: "boolean", value: false,
      label: { de: "Malen: Spin ↓ statt ↑", en: "Paint: spin ↓ instead of ↑" },
    },
    randomize: {
      type: "button",
      label: { de: "Zufällig (heiß)", en: "Random (hot)" },
      action: (s) => fill(s, () => (s.rng.next() < 0.5 ? 1 : -1)),
    },
    align: {
      type: "button",
      label: { de: "Alle ausgerichtet (kalt)", en: "All aligned (cold)" },
      action: (s) => fill(s, () => 1),
    },
  },

  metrics: {
    m: {
      label: { de: "Magnetisierung pro Spin", en: "Magnetization per spin" },
      value: (s) => s.M / (s.n * s.n),
    },
    e: {
      label: { de: "Energie pro Spin", en: "Energy per spin" },
      value: (s, p) => (s.Eint - p.B * s.M) / (s.n * s.n),
    },
  },

  init(params) {
    const n = Number(params.size);
    /** @type {State} */
    const state = {
      n,
      spins: new Int8Array(n * n),
      M: 0,
      Eint: 0,
      lut: new Float64Array(10),
      lutT: NaN,
      lutB: NaN,
      rng: createRng(),
      brush: null,
    };
    fill(state, () => (state.rng.next() < 0.5 ? 1 : -1));
    return state;
  },

  step(s, params) {
    updateLut(s, params.T, params.B);
    const { n, spins, lut, rng } = s;
    const N = n * n;
    for (let k = 0; k < N; k++) {
      const i = rng.int(N);
      const x = i % n;
      const y = (i - x) / n;
      const h = neighborSum(spins, n, x, y);
      const si = spins[i];
      // Lookup index: (si = −1 → 0, +1 → 5) + (h = −4…4 → 0…4)
      if (rng.next() < lut[(si + 1) * 2.5 + (h + 4) / 2]) {
        spins[i] = -si;
        s.M -= 2 * si;
        s.Eint += 2 * si * h;
      }
    }
  },

  onPointer(s, params, e) {
    if (e.type === "up" || e.buttons === 0) {
      s.brush = null;
      return;
    }
    // Left button / finger paints up (or down if the toggle is on), right button paints down.
    let value = params.paintDown ? -1 : 1;
    if (e.buttons & 2) value = -1;
    // Paint along the line from the previous position, so fast strokes leave no gaps.
    const from = s.brush ?? e;
    const cell = WORLD / s.n;
    const steps = Math.max(1, Math.ceil(Math.hypot(e.x - from.x, e.y - from.y) / cell));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      paint(s, from.x + t * (e.x - from.x), from.y + t * (e.y - from.y), value);
    }
    s.brush = { x: e.x, y: e.y };
  },

  draw(ctx, s) {
    drawGrid(ctx, s.spins, s.n, s.n, naviYellow, { min: -1, max: 1, width: WORLD, height: WORLD });
  },
};

/** Sum of the four neighbor spins, with periodic boundaries (the grid wraps around). */
function neighborSum(/** @type {Int8Array} */ spins, /** @type {number} */ n, /** @type {number} */ x, /** @type {number} */ y) {
  const row = y * n;
  return (
    spins[row + ((x + 1) % n)] +
    spins[row + ((x + n - 1) % n)] +
    spins[((y + 1) % n) * n + x] +
    spins[((y + n - 1) % n) * n + x]
  );
}

/**
 * Flipping spin s_i with neighbor sum h changes the energy by ΔE = 2·s_i·(h + B).
 * There are only 2 × 5 possible cases, so the probabilities exp(−ΔE/T) are precomputed.
 */
function updateLut(/** @type {State} */ s, /** @type {number} */ T, /** @type {number} */ B) {
  if (T === s.lutT && B === s.lutB) return;
  for (let si = -1; si <= 1; si += 2) {
    for (let h = -4; h <= 4; h += 2) {
      const dE = 2 * si * (h + B);
      s.lut[(si + 1) * 2.5 + (h + 4) / 2] = dE <= 0 ? 1 : Math.exp(-dE / T);
    }
  }
  s.lutT = T;
  s.lutB = B;
}

/** Set every spin from `valueOf()` and recompute the totals. */
function fill(/** @type {State} */ s, /** @type {() => number} */ valueOf) {
  const { n, spins } = s;
  for (let i = 0; i < n * n; i++) spins[i] = valueOf();
  s.M = 0;
  s.Eint = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const si = spins[y * n + x];
      s.M += si;
      // Right and lower neighbor only, so every pair is counted once.
      s.Eint -= si * (spins[y * n + ((x + 1) % n)] + spins[((y + 1) % n) * n + x]);
    }
  }
}

/** Set all spins within a small round brush around world point (wx, wy) to `value`. */
function paint(/** @type {State} */ s, /** @type {number} */ wx, /** @type {number} */ wy, /** @type {number} */ value) {
  const { n, spins } = s;
  const cx = Math.floor((wx / WORLD) * n);
  const cy = Math.floor((wy / WORLD) * n);
  const r = Math.max(1, Math.round(n / 40));
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      const i = y * n + x;
      const si = spins[i];
      if (si === value) continue;
      const h = neighborSum(spins, n, x, y);
      spins[i] = -si;
      s.M -= 2 * si;
      s.Eint += 2 * si * h;
    }
  }
}
