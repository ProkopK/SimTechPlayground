// @ts-check
/**
 * Heat conduction: the heat equation ∂T/∂t = ∇·(α ∇T) on a grid, explicit finite differences.
 * Paint hot or cold spots, or walls of an insulating material (right mouse button: the opposite
 * tool). Each cell has its own conductivity α, so a wall slows down the heat flowing through it.
 * In "house in winter" a heater is held hot and the border cold, like a house in the cold.
 */
import { drawGrid, viridis } from "../../src/lib";

const WORLD = 256;

/** Overlay for wall cells: index 0 transparent, the rest translucent light gray. */
const WALL_OVERLAY = new Uint32Array(256).fill(((150 << 24) | (225 << 16) | (225 << 8) | 225) >>> 0);
WALL_OVERLAY[0] = 0;

/** What the right mouse button does for each tool: the opposite. @type {Record<string, string>} */
const OPPOSITE = { heat: "cold", cold: "heat", wall: "erase", erase: "wall" };

/**
 * @typedef {object} State
 * @property {number} n          cells per side
 * @property {Float32Array} T     temperature per cell (0 = cold, 1 = hot)
 * @property {Float32Array} nextT buffer for the next step
 * @property {Float32Array} k     conductivity per cell (refreshed every step from wall + params)
 * @property {Uint8Array} wall    1 = wall cell (insulating material)
 * @property {Uint8Array} heater  1 = heater cell, held at T = 1
 * @property {boolean} hasHeater
 * @property {number} power       heat the heater adds per time step (= heat lost through the house)
 * @property {number} lastX       previous pointer position in cells (NaN = no stroke)
 * @property {number} lastY
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",
  world: { width: WORLD, height: WORLD },
  stepsPerSecond: 240,

  params: {
    size: {
      type: "select", options: [64, 128, 256], value: 128, resetOnChange: true,
      label: { de: "Gittergröße", en: "Grid size" },
    },
    tool: {
      type: "select", value: "heat",
      options: {
        heat: { de: "Wärme", en: "Heat" },
        cold: { de: "Kälte", en: "Cold" },
        wall: { de: "Wand", en: "Wall" },
        erase: { de: "Wand löschen", en: "Erase wall" },
      },
      label: { de: "Werkzeug", en: "Tool" },
    },
    clear: { type: "button", label: { de: "Abkühlen", en: "Cool down" }, action: (s) => { s.T.fill(0); } },
    alpha: { type: "range", min: 0.01, max: 0.24, step: 0.01, value: 0.2, label: { de: "Wärmeleitfähigkeit α", en: "Diffusivity α" } },
    wallAlpha: {
      type: "range", min: 0, max: 0.2, step: 0.002, value: 0.03,
      label: { de: "Wärmeleitfähigkeit Wand", en: "Diffusivity of the wall" },
    },
  },

  presets: {
    free: { label: { de: "Freies Malen", en: "Free painting" }, params: { tool: "heat" }, state: (p) => createState(p, "free") },
    house: { label: { de: "Haus im Winter", en: "House in winter" }, params: { tool: "wall" }, state: (p) => createState(p, "house") },
  },

  metrics: {
    mean: {
      label: { de: "Mittlere Temperatur", en: "Mean temperature" },
      value: (s) => s.T.reduce((a, b) => a + b, 0) / (s.n * s.n),
    },
    // power: {
    //   label: { de: "Heizleistung", en: "Heating power" },
    //   value: (s) => (s.hasHeater ? s.power : null),
    //   digits: 2,
    // },
  },

  init(params) {
    return createState(params, "free");
  },

  step(s, p) {
    const { n, T, nextT: next, k, wall, heater } = s;
    for (let i = 0; i < n * n; i++) k[i] = wall[i] ? p.wallAlpha : p.alpha;

    // Border cells are not updated: they keep their value (or are held cold in winter).
    next.set(T);
    for (let y = 1; y < n - 1; y++) {
      for (let x = 1; x < n - 1; x++) {
        const i = y * n + x;
        const ki = k[i];
        next[i] = T[i]
          + conductance(ki, k[i - 1]) * (T[i - 1] - T[i])
          + conductance(ki, k[i + 1]) * (T[i + 1] - T[i])
          + conductance(ki, k[i - n]) * (T[i - n] - T[i])
          + conductance(ki, k[i + n]) * (T[i + n] - T[i]); // stable while every α ≤ 0.25
      }
    }

    // The heater stays at T = 1; the heat it has to add is exactly what flows away.
    let power = 0;
    if (s.hasHeater) {
      for (let i = 0; i < n * n; i++) {
        if (!heater[i]) continue;
        power += 1 - next[i];
        next[i] = 1;
      }
    }
    s.power = power;

    s.T = next;
    s.nextT = T;
  },

  onPointer(s, p, e) {
    if (e.type === "up" || e.buttons === 0) {
      s.lastX = s.lastY = NaN;
      return;
    }
    const tool = e.buttons & 2 ? OPPOSITE[p.tool] : p.tool;
    const x = e.x / (WORLD / s.n), y = e.y / (WORLD / s.n);
    // Fill the gap since the last event, so fast strokes leave no holes in a wall.
    const fromX = Number.isNaN(s.lastX) ? x : s.lastX, fromY = Number.isNaN(s.lastY) ? y : s.lastY;
    stroke(s, tool, fromX, fromY, x, y);
    s.lastX = x;
    s.lastY = y;
  },

  draw(ctx, s) {
    drawGrid(ctx, s.T, s.n, s.n, viridis, { min: 0, max: 1, width: WORLD, height: WORLD });
    drawGrid(ctx, s.wall, s.n, s.n, WALL_OVERLAY, { min: 0, max: 1, width: WORLD, height: WORLD });
  },
};

/**
 * How easily heat flows between two neighboring cells: the harmonic mean of their α.
 * Like resistors in series, the worse conductor dominates, so a thin wall already insulates.
 */
function conductance(/** @type {number} */ a, /** @type {number} */ b) {
  return a + b > 0 ? (2 * a * b) / (a + b) : 0;
}

/** Fresh state: "free" = hot square in the middle, "house" = house outline with a heater. */
function createState(/** @type {import("../../src/types").Values} */ params, /** @type {"free" | "house"} */ scene) {
  const n = Number(params.size);
  /** @type {State} */
  const s = {
    n,
    T: new Float32Array(n * n),
    nextT: new Float32Array(n * n),
    k: new Float32Array(n * n),
    wall: new Uint8Array(n * n),
    heater: new Uint8Array(n * n),
    hasHeater: false,
    power: 0,
    lastX: NaN,
    lastY: NaN,
  };

  if (scene === "free") {
    for (let y = Math.floor(0.4 * n); y < Math.floor(0.6 * n); y++) for (let x = Math.floor(0.4 * n); x < Math.floor(0.6 * n); x++) s.T[y * n + x] = 1;
    return s;
  }

  // House outline in fractions of the grid: two side walls, floor and a gable roof.
  /** @type {[number, number][]} */
  const outline = [[0.27, 0.42], [0.27, 0.8], [0.73, 0.8], [0.73, 0.42], [0.5, 0.2], [0.27, 0.42]];
  for (let j = 1; j < outline.length; j++) {
    const [ax, ay] = outline[j - 1], [bx, by] = outline[j];
    stroke(s, "wall", ax * n, ay * n, bx * n, by * n);
  }
  // Heater: a small block inside, near the floor.
  for (let y = Math.floor(0.66 * n); y < Math.floor(0.75 * n); y++) {
    for (let x = Math.floor(0.33 * n); x < Math.floor(0.38 * n); x++) {
      s.heater[y * n + x] = 1;
      s.T[y * n + x] = 1;
    }
  }
  for (let j = 0; j < n; j++) s.nextT[j] = s.nextT[(n - 1) * n + j] = s.nextT[j * n] = s.nextT[j * n + n - 1] = 0;
  s.hasHeater = true;
  return s;
}

/** Paint a line from (x0, y0) to (x1, y1) (cell coordinates) with the given tool. */
function stroke(
  /** @type {State} */ s, /** @type {string} */ tool,
  /** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ x1, /** @type {number} */ y1,
) {
  const isWallTool = tool === "wall" || tool === "erase";
  const radius = isWallTool ? Math.max(1, s.n / 64) : 3.5;
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (radius / 2)));
  for (let t = 0; t <= steps; t++) paintDisk(s, tool, x0 + (t / steps) * (x1 - x0), y0 + (t / steps) * (y1 - y0), radius);
}

/** Apply the tool to all cells within `radius` of (cx, cy) (cell coordinates). */
function paintDisk(
  /** @type {State} */ s, /** @type {string} */ tool,
  /** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ radius,
) {
  const { n } = s;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(n - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(n - 1, Math.ceil(cx + radius)); x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > radius * radius) continue;
      const i = y * n + x;
      if (tool === "heat") s.T[i] = 1;
      else if (tool === "cold") s.T[i] = 0;
      else if (tool === "wall") s.wall[i] = 1;
      else s.wall[i] = 0;
    }
  }
}
