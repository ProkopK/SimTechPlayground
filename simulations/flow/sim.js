// @ts-check
/**
 * Wind tunnel: air flows from left to right around obstacles. Behind a cylinder, vortices
 * detach alternately from the top and bottom: the Kármán vortex street.
 *
 * Method: Lattice Boltzmann (D2Q9, BGK collision). Instead of solving the Navier–Stokes
 * equations directly, each grid cell stores how many fluid "particles" move in each of
 * 9 directions. Every step they (1) stream to the neighboring cell and (2) collide, i.e.
 * relax towards the local equilibrium. Density and velocity follow from these populations.
 * All quantities are in lattice units (cell size 1, time step 1).
 *
 * Draw obstacles with the mouse or a finger (right mouse button or the eraser toggle erases).
 */
import { blueWhiteRed, drawGrid, viridis } from "../../src/lib";

const W = 250; // world size: the channel is 2.5 times as long as it is high
const H = 100;

// The 9 lattice directions (x right, y down), their weights, and helpers.
const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const EY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const WEIGHT = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const OPPOSITE = [0, 3, 4, 1, 2, 7, 8, 5, 6]; // reversed direction (bounce-back at obstacles)
const MIRROR_Y = [0, 1, 4, 3, 2, 8, 7, 6, 5]; // y component flipped (free-slip at top/bottom)

// Limits that keep the method stable (see info text: Mach number and relaxation time).
const MAX_INFLOW = 0.12;
const MIN_VISCOSITY = 0.004; // relaxation time τ = 3ν + 0.5 ≥ 0.512
const NAN_CHECK_EVERY = 50;
const TRACERS = 800;

/**
 * @typedef {object} State
 * @property {number} nx
 * @property {number} ny
 * @property {Float32Array} f       populations, layout f[q·N + cell]
 * @property {Float32Array} fNext   second buffer for the next step
 * @property {Uint8Array} solid     1 = obstacle cell
 * @property {Float32Array} ux      velocity per cell (x)
 * @property {Float32Array} uy      velocity per cell (y)
 * @property {Float32Array} display scratch buffer for drawing (speed or vorticity)
 * @property {Float64Array} fin     scratch: incoming populations of one cell
 * @property {number} size          obstacle height in cells (for the Reynolds number)
 * @property {number} steps
 * @property {Float32Array} tracers particle positions in cell units [x0, y0, x1, y1, ...]
 * @property {{ x: number, y: number } | null} brush  last pointer position while drawing
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",
  world: { width: W, height: H },
  stepsPerSecond: 120,

  params: {
    inflow: {
      type: "range", min: 0.02, max: MAX_INFLOW, step: 0.005, value: 0.1,
      label: { de: "Anströmgeschwindigkeit", en: "Inflow speed" },
    },
    viscosity: {
      type: "range", min: MIN_VISCOSITY, max: 0.1, step: 0.001, value: 0.008,
      label: { de: "Viskosität (Zähigkeit)", en: "Viscosity" },
    },
    view: {
      type: "select",
      options: { speed: { de: "Geschwindigkeit", en: "Speed" }, vorticity: { de: "Wirbelstärke", en: "Vorticity" } },
      value: "vorticity",
      label: { de: "Anzeige", en: "Show" },
    },
    resolution: {
      type: "select",
      options: { 150: { de: "Grob (150 × 60)", en: "Coarse (150 × 60)" }, 200: { de: "Mittel (200 × 80)", en: "Medium (200 × 80)" }, 300: { de: "Fein (300 × 120)", en: "Fine (300 × 120)" } },
      value: "200", mobileValue: "150", resetOnChange: true,
      label: { de: "Auflösung", en: "Resolution" },
    },
    erase: { type: "boolean", value: false, label: { de: "Radieren statt Zeichnen", en: "Erase instead of draw" } },
    tracers: { type: "boolean", value: true, label: { de: "Rauchteilchen", en: "Smoke particles" } },
  },

  presets: {
    cylinder: { label: { de: "Zylinder", en: "Cylinder" }, state: (p) => createState(p, "cylinder") },
    airfoil: { label: { de: "Tragflügel", en: "Airfoil" }, state: (p) => createState(p, "airfoil") },
    empty: { label: { de: "Leer (selbst zeichnen)", en: "Empty (draw yourself)" }, state: (p) => createState(p, "empty") },
  },

  metrics: {
    reynolds: {
      label: { de: "Reynolds-Zahl", en: "Reynolds number" },
      value: (s, p) => (Math.min(p.inflow, MAX_INFLOW) * s.size) / Math.max(p.viscosity, MIN_VISCOSITY),
      digits: 0,
      plot: false,
    },
  },

  init: (params) => createState(params, "cylinder"),

  step(s, params) {
    const u0 = Math.min(params.inflow, MAX_INFLOW);
    const omega = 1 / (3 * Math.max(params.viscosity, MIN_VISCOSITY) + 0.5); // 1 / τ
    streamAndCollide(s, omega);
    setInflow(s, u0);

    if (params.tracers) advectTracers(s);

    s.steps++;
    if (s.steps % NAN_CHECK_EVERY === 0 && !isHealthy(s)) fillEquilibrium(s, u0); // restart the flow, keep obstacles
  },

  onPointer(s, params, e) {
    if (e.type === "up" || e.buttons === 0) {
      s.brush = null;
      return;
    }
    const solid = params.erase || e.buttons & 2 ? 0 : 1;
    // Convert world to cell coordinates and paint along the line from the last position.
    const x = (e.x / W) * s.nx;
    const y = (e.y / H) * s.ny;
    const from = s.brush ?? { x, y };
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y)));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      paintDisk(s, from.x + t * (x - from.x), from.y + t * (y - from.y), Math.max(1.5, s.ny / 30), solid);
    }
    s.brush = { x, y };
    updateSize(s);
  },

  draw(ctx, s, params) {
    const { nx, ny, ux, uy, solid, display } = s;
    const u0 = Math.min(params.inflow, MAX_INFLOW);
    if (params.view === "vorticity") {
      // Vorticity ω = ∂u_y/∂x − ∂u_x/∂y (central differences): how strongly the fluid spins.
      for (let y = 1; y < ny - 1; y++) {
        for (let x = 1; x < nx - 1; x++) {
          const i = y * nx + x;
          display[i] = solid[i] ? NaN : uy[i + 1] - uy[i - 1] - (ux[i + nx] - ux[i - nx]);
        }
      }
      const range = 0.6 * u0;
      drawGrid(ctx, display, nx, ny, blueWhiteRed, { min: -range, max: range, width: W, height: H, nanColor: "#3a3f47" });
    } else {
      for (let i = 0; i < nx * ny; i++) display[i] = solid[i] ? NaN : Math.hypot(ux[i], uy[i]);
      drawGrid(ctx, display, nx, ny, viridis, { min: 0, max: 1.6 * u0, width: W, height: H, nanColor: "#c8ccd2" });
    }

    if (params.tracers) {
      const sx = W / nx;
      const sy = H / ny;
      const size = 0.6 * sx;
      ctx.fillStyle = params.view === "vorticity" ? "rgba(20, 24, 30, 0.7)" : "rgba(255, 255, 255, 0.8)";
      for (let k = 0; k < TRACERS; k++) ctx.fillRect(s.tracers[2 * k] * sx, s.tracers[2 * k + 1] * sy, size, size);
    }
  },
};

// ---------------------------------------------------------------------------
// Lattice Boltzmann
// ---------------------------------------------------------------------------

/**
 * One time step. For every fluid cell: pull the populations streaming in from the
 * neighbors (bounce back from obstacles, reflect at top/bottom walls), compute density
 * and velocity, then relax towards equilibrium with rate ω.
 *
 * Boundary cells use the general loop in `updateBoundaryCell`, which shows the method most
 * clearly. The ~95% interior cells use `updateInteriorCell`: the same computation written
 * out for all 9 directions, which runs about 2.5× faster in JavaScript.
 */
function streamAndCollide(/** @type {State} */ s, /** @type {number} */ omega) {
  const { nx, ny, f, fNext, solid, ux, uy } = s;
  for (let y = 0; y < ny; y++) {
    const edgeRow = y === 0 || y === ny - 1;
    for (let x = 0; x < nx; x++) {
      const i = y * nx + x;
      if (solid[i]) {
        ux[i] = 0;
        uy[i] = 0;
      } else if (edgeRow || x === 0 || x === nx - 1) {
        updateBoundaryCell(s, x, y, omega);
      } else {
        updateInteriorCell(f, fNext, solid, ux, uy, nx, ny, i, omega);
      }
    }
  }
  s.f = fNext;
  s.fNext = f;
}

function updateBoundaryCell(/** @type {State} */ s, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ omega) {
  const { nx, ny, f, fNext, solid, fin } = s;
  const N = nx * ny;
  const i = y * nx + x;
  let rho = 0;
  let mx = 0;
  let my = 0;
  for (let q = 0; q < 9; q++) {
    // Clamping x at the ends gives a zero-gradient outflow (the inflow is set afterwards).
    const sx = Math.min(nx - 1, Math.max(0, x - EX[q]));
    const sy = y - EY[q];
    let v;
    if (sy < 0 || sy >= ny) v = f[MIRROR_Y[q] * N + y * nx + sx]; // free-slip wall
    else if (solid[sy * nx + sx]) v = f[OPPOSITE[q] * N + i]; // bounce back from obstacle
    else v = f[q * N + sy * nx + sx]; // normal streaming
    fin[q] = v;
    rho += v;
    mx += EX[q] * v;
    my += EY[q] * v;
  }
  const vx = mx / rho;
  const vy = my / rho;
  s.ux[i] = vx;
  s.uy[i] = vy;
  const usq = 1.5 * (vx * vx + vy * vy);
  for (let q = 0; q < 9; q++) {
    const eu = 3 * (EX[q] * vx + EY[q] * vy);
    const feq = WEIGHT[q] * rho * (1 + eu + 0.5 * eu * eu - usq);
    fNext[q * N + i] = fin[q] + omega * (feq - fin[q]);
  }
}

/** Population q arriving at cell i from neighbor j (bounced back if j is an obstacle). */
function pull(/** @type {Float32Array} */ f, /** @type {Uint8Array} */ solid, /** @type {number} */ N, /** @type {number} */ i, /** @type {number} */ q, /** @type {number} */ j) {
  return solid[j] ? f[OPPOSITE[q] * N + i] : f[q * N + j];
}

/** Same as updateBoundaryCell for a cell whose 8 neighbors all exist, written out per direction. */
function updateInteriorCell(
  /** @type {Float32Array} */ f, /** @type {Float32Array} */ fNext, /** @type {Uint8Array} */ solid,
  /** @type {Float32Array} */ ux, /** @type {Float32Array} */ uy,
  /** @type {number} */ nx, /** @type {number} */ ny, /** @type {number} */ i, /** @type {number} */ omega,
) {
  const N = nx * ny;
  // Streaming: direction q comes from the neighbor at (x − EX[q], y − EY[q]).
  const f0 = f[i];
  const f1 = pull(f, solid, N, i, 1, i - 1);
  const f2 = pull(f, solid, N, i, 2, i - nx);
  const f3 = pull(f, solid, N, i, 3, i + 1);
  const f4 = pull(f, solid, N, i, 4, i + nx);
  const f5 = pull(f, solid, N, i, 5, i - 1 - nx);
  const f6 = pull(f, solid, N, i, 6, i + 1 - nx);
  const f7 = pull(f, solid, N, i, 7, i + 1 + nx);
  const f8 = pull(f, solid, N, i, 8, i - 1 + nx);
  // Density and velocity
  const rho = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
  const vx = (f1 - f3 + f5 - f6 - f7 + f8) / rho;
  const vy = (f2 - f4 + f5 + f6 - f7 - f8) / rho;
  ux[i] = vx;
  uy[i] = vy;
  // Collision: f ← f + ω (f_eq − f), with f_eq = w ρ (1 + 3 e·u + 4.5 (e·u)² − 1.5 u²)
  const usq = 1.5 * (vx * vx + vy * vy);
  const r9 = rho / 9;
  const r36 = rho / 36;
  const eq = (/** @type {number} */ w, /** @type {number} */ eu) => w * (1 + eu + 0.5 * eu * eu - usq);
  fNext[i] = f0 + omega * (eq(4 * r9, 0) - f0);
  fNext[N + i] = f1 + omega * (eq(r9, 3 * vx) - f1);
  fNext[2 * N + i] = f2 + omega * (eq(r9, 3 * vy) - f2);
  fNext[3 * N + i] = f3 + omega * (eq(r9, -3 * vx) - f3);
  fNext[4 * N + i] = f4 + omega * (eq(r9, -3 * vy) - f4);
  fNext[5 * N + i] = f5 + omega * (eq(r36, 3 * (vx + vy)) - f5);
  fNext[6 * N + i] = f6 + omega * (eq(r36, 3 * (vy - vx)) - f6);
  fNext[7 * N + i] = f7 + omega * (eq(r36, -3 * (vx + vy)) - f7);
  fNext[8 * N + i] = f8 + omega * (eq(r36, 3 * (vx - vy)) - f8);
}

/** Equilibrium populations for density ρ and velocity (vx, vy), written into f at cell i. */
function setEquilibrium(/** @type {Float32Array} */ f, /** @type {number} */ N, /** @type {number} */ i, /** @type {number} */ rho, /** @type {number} */ vx, /** @type {number} */ vy) {
  const usq = 1.5 * (vx * vx + vy * vy);
  for (let q = 0; q < 9; q++) {
    const eu = 3 * (EX[q] * vx + EY[q] * vy);
    f[q * N + i] = WEIGHT[q] * rho * (1 + eu + 0.5 * eu * eu - usq);
  }
}

/** Left column: fluid enters with the inflow speed. */
function setInflow(/** @type {State} */ s, /** @type {number} */ u0) {
  const N = s.nx * s.ny;
  for (let y = 0; y < s.ny; y++) setEquilibrium(s.f, N, y * s.nx, 1, u0, 0);
}

/**
 * Uniform flow everywhere (used at start and to recover from instability), plus a small
 * sideways push in the right half. In a perfectly symmetric flow the vortex street would
 * take a long time to appear; the push breaks the symmetry so it starts within seconds.
 */
function fillEquilibrium(/** @type {State} */ s, /** @type {number} */ u0) {
  const N = s.nx * s.ny;
  for (let i = 0; i < N; i++) {
    const vy = i % s.nx > s.nx / 4 ? 0.3 * u0 : 0;
    setEquilibrium(s.f, N, i, 1, u0, vy);
    s.ux[i] = s.solid[i] ? 0 : u0;
    s.uy[i] = s.solid[i] ? 0 : vy;
  }
}

/** False if the simulation blew up (NaN or unphysically fast flow). */
function isHealthy(/** @type {State} */ s) {
  for (let i = 0; i < s.ux.length; i += 7) {
    const v = Math.abs(s.ux[i]) + Math.abs(s.uy[i]);
    if (!(v < 0.5)) return false; // also catches NaN
  }
  return true;
}

// ---------------------------------------------------------------------------
// Obstacles, scenarios and smoke particles
// ---------------------------------------------------------------------------

/** @returns {State} */
function createState(/** @type {import("../../src/types").Values} */ params, /** @type {"cylinder" | "airfoil" | "empty"} */ shape) {
  const nx = Number(params.resolution);
  const ny = Math.round(nx * 0.4);
  const N = nx * ny;
  /** @type {State} */
  const s = {
    nx,
    ny,
    f: new Float32Array(9 * N),
    fNext: new Float32Array(9 * N),
    solid: new Uint8Array(N),
    ux: new Float32Array(N),
    uy: new Float32Array(N),
    display: new Float32Array(N),
    fin: new Float64Array(9),
    size: 0,
    steps: 0,
    tracers: new Float32Array(2 * TRACERS),
    brush: null,
  };
  if (shape === "cylinder") paintDisk(s, ny * 0.6, ny / 2 + 1, ny / 16, 1);
  if (shape === "airfoil") addAirfoil(s, ny * 0.45, ny / 2, ny * 0.5, 12);
  updateSize(s);
  fillEquilibrium(s, Math.min(params.inflow, MAX_INFLOW));
  for (let k = 0; k < TRACERS; k++) {
    s.tracers[2 * k] = Math.random() * nx;
    s.tracers[2 * k + 1] = Math.random() * ny;
  }
  return s;
}

/** Set a disk of cells (cell coordinates) to obstacle (1) or fluid (0). */
function paintDisk(/** @type {State} */ s, /** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r, /** @type {number} */ value) {
  const N = s.nx * s.ny;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if (x < 1 || y < 0 || x >= s.nx - 1 || y >= s.ny) continue; // keep inflow/outflow columns free
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = y * s.nx + x;
      if (s.solid[i] === value) continue;
      s.solid[i] = value;
      // A freshly erased cell starts as fluid at rest.
      if (!value) {
        setEquilibrium(s.f, N, i, 1, 0, 0);
        setEquilibrium(s.fNext, N, i, 1, 0, 0);
      }
    }
  }
}

/**
 * A symmetric NACA airfoil (wing profile) with chord length c, nose at (x0, y0),
 * tilted nose-up by `angle` degrees ("angle of attack").
 */
function addAirfoil(/** @type {State} */ s, /** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ c, /** @type {number} */ angle) {
  const a = (angle * Math.PI) / 180;
  const thickness = 0.15;
  for (let y = 0; y < s.ny; y++) {
    for (let x = 0; x < s.nx; x++) {
      // Rotate the cell into the airfoil's frame: u along the chord, v across it.
      // y points down on screen, so the tail lies at +c·(cos a, sin a), i.e. below the nose.
      const dx = x - x0;
      const dy = y - y0;
      const u = (dx * Math.cos(a) + dy * Math.sin(a)) / c;
      const v = (-dx * Math.sin(a) + dy * Math.cos(a)) / c;
      if (u < 0 || u > 1) continue;
      const half = 5 * thickness * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u ** 2 + 0.2843 * u ** 3 - 0.1015 * u ** 4);
      if (Math.abs(v) <= half) s.solid[y * s.nx + x] = 1;
    }
  }
}

/**
 * Smoke particles drift with the local flow velocity (bilinear interpolation between cells).
 * Particles that leave the channel or get stuck in an obstacle restart at the inflow.
 */
function advectTracers(/** @type {State} */ s) {
  const { nx, ny, ux, uy, solid, tracers } = s;
  for (let k = 0; k < TRACERS; k++) {
    let x = tracers[2 * k];
    let y = tracers[2 * k + 1];
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    if (x0 < 0 || y0 < 0 || x0 >= nx - 1 || y0 >= ny - 1 || solid[y0 * nx + x0]) {
      x = Math.random() * 2;
      y = Math.random() * (ny - 1);
    } else {
      const fx = x - x0;
      const fy = y - y0;
      const i = y0 * nx + x0;
      const lerp2 = (/** @type {Float32Array} */ u) =>
        (1 - fy) * ((1 - fx) * u[i] + fx * u[i + 1]) + fy * ((1 - fx) * u[i + nx] + fx * u[i + nx + 1]);
      x += lerp2(ux);
      y += lerp2(uy);
    }
    tracers[2 * k] = x;
    tracers[2 * k + 1] = y;
  }
}

/** Vertical extent of all obstacles in cells: the length scale of the Reynolds number. */
function updateSize(/** @type {State} */ s) {
  let top = s.ny;
  let bottom = -1;
  for (let i = 0; i < s.solid.length; i++) {
    if (!s.solid[i]) continue;
    const y = Math.floor(i / s.nx);
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
  s.size = bottom >= top ? bottom - top + 1 : 0;
}
