// @ts-check
/**
 * Gravity: N bodies attracting each other (Newton's law of gravitation), e.g. a small
 * solar system. Drag on the canvas to launch a new body: the arrow sets its velocity.
 *
 * Method: direct summation of all pair forces (O(N²), fine for a few hundred bodies) with a
 * small "softening" length ε that avoids infinite forces when two bodies get very close.
 * Time integration with velocity Verlet, which keeps the total energy stable over many orbits.
 */
import { createTrail, cssColor, velocityVerlet, viridis } from "../../src/lib";

const W = 160; // world size (arbitrary length units)
const H = 100;
const MAX_BODIES = 300;
const SOFTENING = 0.5; // ε
const TRAIL_POINTS = 150;
const TRAIL_EVERY = 4; // store a trail point every 4 steps
const REMOVE_DISTANCE = 400; // bodies this far from the center of mass are dropped
const LAUNCH_FACTOR = 0.3; // velocity per world unit of drag

/**
 * @typedef {object} State
 * @property {number} n             number of bodies
 * @property {Float64Array} pos     positions [x0, y0, x1, y1, ...]
 * @property {Float64Array} vel     velocities, same layout
 * @property {Float64Array} acc     accelerations, same layout
 * @property {Float64Array} mass
 * @property {import("../../src/lib").Trail[]} trails
 * @property {number} G             gravitational constant used for the current step
 * @property {number} steps
 * @property {{ x0: number, y0: number, x1: number, y1: number } | null} drag  slingshot in progress (absolute coords)
 * @property {(pos: Float64Array, acc: Float64Array) => void} computeAcc
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",
  world: { width: W, height: H },
  dt: 0.02,
  stepsPerSecond: 150,

  params: {
    mass: {
      type: "range", min: 1, max: 200, step: 1, value: 10,
      label: { de: "Masse neuer Körper", en: "Mass of new bodies" },
    },
    G: {
      type: "range", min: 0.2, max: 3, step: 0.05, value: 1,
      label: { de: "Gravitationskonstante G", en: "Gravitational constant G" },
    },
    trails: { type: "boolean", value: true, label: { de: "Spuren", en: "Trails" } },
    merge: { type: "boolean", value: true, label: { de: "Zusammenstöße verschmelzen", en: "Merge on collision" } },
    follow: { type: "boolean", value: true, label: { de: "Kamera folgt Schwerpunkt", en: "Camera follows center of mass" } },
    clear: {
      type: "button",
      label: { de: "Alle entfernen", en: "Remove all" },
      action: (s) => {
        s.n = 0;
      },
    },
  },

  presets: {
    solar: { label: { de: "Sonne mit Planeten", en: "Sun and planets" }, state: solarSystem },
    binary: { label: { de: "Doppelstern mit Planet", en: "Binary star with planet" }, state: binaryStar },
    cluster: { label: { de: "Zufälliger Haufen", en: "Random cluster" }, state: cluster },
    figure8: { label: { de: "Achter-Bahn (3 Körper)", en: "Figure eight (3 bodies)" }, state: figureEight },
  },

  metrics: {
    energy: {
      type: "lines",
      label: { de: "Energie", en: "Energy" },
      lines: {
        total: { label: "E_tot", value: (s) => kineticEnergy(s) + potentialEnergy(s) },
        kinetic: { label: "E_kin", value: (s) => kineticEnergy(s) },
        potential: { label: "E_pot", value: (s) => potentialEnergy(s) },
      },
      digits: 1,
    },
    count: {
      label: { de: "Anzahl Körper", en: "Number of bodies" },
      value: (s) => s.n,
      digits: 0,
      plot: false,
    },
  },

  init: solarSystem,

  step(s, params, dt) {
    s.G = params.G;
    velocityVerlet(s.pos, s.vel, s.acc, 2 * s.n, dt, s.computeAcc);
    let changed = removeFarBodies(s);
    if (params.merge) changed = mergeCollisions(s) || changed;
    if (changed) s.computeAcc(s.pos, s.acc);

    s.steps++;
    if (s.steps % TRAIL_EVERY === 0) {
      for (let i = 0; i < s.n; i++) s.trails[i].push(s.pos[2 * i], s.pos[2 * i + 1]);
    }
  },

  onPointer(s, params, e) {
    // Pointer positions are on screen; with the follow camera the world is shifted.
    const [ox, oy] = cameraOffset(s, params);
    const x = e.x - ox;
    const y = e.y - oy;
    if (e.type === "down" && e.buttons & 1) {
      s.drag = { x0: x, y0: y, x1: x, y1: y };
    } else if (e.type === "move" && s.drag) {
      s.drag.x1 = x;
      s.drag.y1 = y;
    } else if (e.type === "up" && s.drag) {
      const { x0, y0, x1, y1 } = s.drag;
      // Launch relative to what you see: add the velocity of the center of mass.
      const [vx, vy] = params.follow ? centerOfMassVelocity(s) : [0, 0];
      s.G = params.G;
      addBody(s, x0, y0, vx + (x0 - x1) * LAUNCH_FACTOR, vy + (y0 - y1) * LAUNCH_FACTOR, params.mass);
      s.computeAcc(s.pos, s.acc);
      s.drag = null;
    }
  },

  draw(ctx, s, params, view) {
    const [ox, oy] = cameraOffset(s, params);
    ctx.translate(ox, oy);
    const px = 1 / view.pixelsPerUnit; // one screen pixel in world units

    if (params.trails) {
      ctx.lineWidth = 1.5 * px;
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < s.n; i++) {
        const trail = s.trails[i];
        if (trail.length < 2) continue;
        ctx.strokeStyle = bodyColor(s.mass[i]);
        ctx.beginPath();
        ctx.moveTo(trail.get(0, 0), trail.get(0, 1));
        for (let k = 1; k < trail.length; k++) ctx.lineTo(trail.get(k, 0), trail.get(k, 1));
        ctx.lineTo(s.pos[2 * i], s.pos[2 * i + 1]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < s.n; i++) {
      ctx.fillStyle = bodyColor(s.mass[i]);
      ctx.beginPath();
      ctx.arc(s.pos[2 * i], s.pos[2 * i + 1], Math.max(radius(s.mass[i]), 2 * px), 0, 2 * Math.PI);
      ctx.fill();
    }

    // Slingshot preview: the new body and an arrow showing its launch velocity.
    if (s.drag) {
      const { x0, y0, x1, y1 } = s.drag;
      ctx.strokeStyle = "#ffffff";
      ctx.fillStyle = bodyColor(params.mass);
      ctx.lineWidth = 2 * px;
      ctx.beginPath();
      ctx.arc(x0, y0, radius(params.mass), 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      const x1w = 0.5 * (x0 - x1) + x0;
      const y1w = 0.5 * (y0 - y1) + y0;
      ctx.lineTo(x1w, y1w);
      const angle = Math.atan2(y0 - y1, x0 - x1);
      const head = 10 * px;
      ctx.moveTo(x1w - head * Math.cos(angle - 0.4), y1w - head * Math.sin(angle - 0.4));
      ctx.lineTo(x1w, y1w);
      ctx.lineTo(x1w - head * Math.cos(angle + 0.4), y1w - head * Math.sin(angle + 0.4));
      ctx.stroke();
    }
  },
};

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

/** Newton: a_i = G Σ_j m_j (r_j − r_i) / (|r_j − r_i|² + ε²)^(3/2) */
function computeAccelerations(/** @type {State} */ s, /** @type {Float64Array} */ pos, /** @type {Float64Array} */ acc) {
  const { n, mass, G } = s;
  acc.fill(0, 0, 2 * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pos[2 * j] - pos[2 * i];
      const dy = pos[2 * j + 1] - pos[2 * i + 1];
      const r2 = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const f = G / (r2 * Math.sqrt(r2)); // G / r³
      // Each pair once: equal and opposite (Newton's third law).
      acc[2 * i] += f * mass[j] * dx;
      acc[2 * i + 1] += f * mass[j] * dy;
      acc[2 * j] -= f * mass[i] * dx;
      acc[2 * j + 1] -= f * mass[i] * dy;
    }
  }
}

function kineticEnergy(/** @type {State} */ s) {
  const { n, vel, mass } = s;
  let kinetic = 0;
  for (let i = 0; i < n; i++) kinetic += 0.5 * mass[i] * (vel[2 * i] ** 2 + vel[2 * i + 1] ** 2);
  return kinetic;
}

/** Softened potential energy. Kinetic plus potential is constant up to small errors, except for merges. */
function potentialEnergy(/** @type {State} */ s) {
  const { n, pos, mass, G } = s;
  let potential = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const r2 = (pos[2 * j] - pos[2 * i]) ** 2 + (pos[2 * j + 1] - pos[2 * i + 1]) ** 2;
      potential -= (G * mass[i] * mass[j]) / Math.sqrt(r2 + SOFTENING * SOFTENING);
    }
  }
  return potential;
}

/** Visual and collision radius: grows with the cube root of the mass (constant density). */
function radius(/** @type {number} */ m) {
  return 0.4 * Math.cbrt(m);
}

/** Merge touching bodies into one, conserving mass and momentum. Returns true if any merged. */
function mergeCollisions(/** @type {State} */ s) {
  const { pos, vel, mass } = s;
  let merged = false;
  for (let i = 0; i < s.n; i++) {
    for (let j = i + 1; j < s.n; j++) {
      const dx = pos[2 * j] - pos[2 * i];
      const dy = pos[2 * j + 1] - pos[2 * i + 1];
      const rr = radius(mass[i]) + radius(mass[j]);
      if (dx * dx + dy * dy > rr * rr) continue;
      const m = mass[i] + mass[j];
      for (let k = 0; k < 2; k++) {
        pos[2 * i + k] = (mass[i] * pos[2 * i + k] + mass[j] * pos[2 * j + k]) / m;
        vel[2 * i + k] = (mass[i] * vel[2 * i + k] + mass[j] * vel[2 * j + k]) / m;
      }
      mass[i] = m;
      removeBody(s, j);
      j--; // the last body moved into slot j: check it too
      merged = true;
    }
  }
  return merged;
}

function removeFarBodies(/** @type {State} */ s) {
  const [cx, cy] = centerOfMass(s);
  let removed = false;
  for (let i = s.n - 1; i >= 0; i--) {
    if (Math.hypot(s.pos[2 * i] - cx, s.pos[2 * i + 1] - cy) > REMOVE_DISTANCE) {
      removeBody(s, i);
      removed = true;
    }
  }
  return removed;
}

function centerOfMass(/** @type {State} */ s) {
  let m = 0, x = 0, y = 0;
  for (let i = 0; i < s.n; i++) {
    m += s.mass[i];
    x += s.mass[i] * s.pos[2 * i];
    y += s.mass[i] * s.pos[2 * i + 1];
  }
  return m > 0 ? [x / m, y / m] : [W / 2, H / 2];
}

function centerOfMassVelocity(/** @type {State} */ s) {
  let m = 0, vx = 0, vy = 0;
  for (let i = 0; i < s.n; i++) {
    m += s.mass[i];
    vx += s.mass[i] * s.vel[2 * i];
    vy += s.mass[i] * s.vel[2 * i + 1];
  }
  return m > 0 ? [vx / m, vy / m] : [0, 0];
}

/** Shift that puts the center of mass in the middle of the screen (if following). */
function cameraOffset(/** @type {State} */ s, /** @type {import("../../src/types").Values} */ params) {
  if (!params.follow || s.n === 0) return [0, 0];
  const [cx, cy] = centerOfMass(s);
  return [W / 2 - cx, H / 2 - cy];
}

function bodyColor(/** @type {number} */ m) {
  return cssColor(viridis, 0.25 + 0.75 * Math.min(1, Math.log10(m) / 3));
}

// ---------------------------------------------------------------------------
// Creating bodies and scenarios
// ---------------------------------------------------------------------------

/** @returns {State} */
function emptyState(/** @type {number} */ G) {
  /** @type {State} */
  const s = {
    n: 0,
    pos: new Float64Array(2 * MAX_BODIES),
    vel: new Float64Array(2 * MAX_BODIES),
    acc: new Float64Array(2 * MAX_BODIES),
    mass: new Float64Array(MAX_BODIES),
    trails: Array.from({ length: MAX_BODIES }, () => createTrail(TRAIL_POINTS, 2)),
    G,
    steps: 0,
    drag: null,
    computeAcc: (pos, acc) => computeAccelerations(s, pos, acc),
  };
  return s;
}

function addBody(/** @type {State} */ s, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ vx, /** @type {number} */ vy, /** @type {number} */ m) {
  if (s.n >= MAX_BODIES) return;
  const i = s.n++;
  s.pos[2 * i] = x;
  s.pos[2 * i + 1] = y;
  s.vel[2 * i] = vx;
  s.vel[2 * i + 1] = vy;
  s.mass[i] = m;
  s.trails[i].clear();
}

/** Remove body i by moving the last body into its slot. */
function removeBody(/** @type {State} */ s, /** @type {number} */ i) {
  const last = --s.n;
  for (let k = 0; k < 2; k++) {
    s.pos[2 * i + k] = s.pos[2 * last + k];
    s.vel[2 * i + k] = s.vel[2 * last + k];
    s.acc[2 * i + k] = s.acc[2 * last + k];
  }
  s.mass[i] = s.mass[last];
  [s.trails[i], s.trails[last]] = [s.trails[last], s.trails[i]];
}

/** Add a body on a circular orbit of radius r around a central mass M at (cx, cy). */
function addOrbiting(/** @type {State} */ s, /** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ M, /** @type {number} */ r, /** @type {number} */ angle, /** @type {number} */ m) {
  const v = Math.sqrt((s.G * M) / r); // circular orbit: v² / r = G M / r²
  addBody(s, cx + r * Math.cos(angle), cy + r * Math.sin(angle), -v * Math.sin(angle), v * Math.cos(angle), m);
}

function finish(/** @type {State} */ s) {
  s.computeAcc(s.pos, s.acc);
  return s;
}

function solarSystem(/** @type {import("../../src/types").Values} */ params) {
  const s = emptyState(params.G);
  const sun = 1000;
  addBody(s, W / 2, H / 2, 0, 0, sun);
  [[12, 1], [20, 3], [30, 5], [42, 20]].forEach(([r, m], k) => addOrbiting(s, W / 2, H / 2, sun, r, k * 2, m));
  return finish(s);
}

function binaryStar(/** @type {import("../../src/types").Values} */ params) {
  const s = emptyState(params.G);
  const m = 300;
  const d = 16; // separation; each star circles the center at d/2
  const v = Math.sqrt((s.G * m) / (2 * d));
  addBody(s, W / 2 - d / 2, H / 2, 0, -v, m);
  addBody(s, W / 2 + d / 2, H / 2, 0, v, m);
  addOrbiting(s, W / 2, H / 2, 2 * m, 45, 0, 2); // far away the pair acts like one mass 2m
  return finish(s);
}

function cluster(/** @type {import("../../src/types").Values} */ params) {
  const s = emptyState(params.G);
  const count = 150;
  const R = 45;
  const totalMass = count * 6;
  for (let i = 0; i < count; i++) {
    const r = R * Math.sqrt(Math.random());
    const a = Math.random() * 2 * Math.PI;
    // Rotation slightly below orbital speed (mass inside r grows like r² in a uniform disk),
    // so the cluster swirls and slowly clumps together.
    const v = 0.9 * Math.sqrt((s.G * totalMass * (r / R) ** 2) / Math.max(r, 1));
    // Plus some random motion, which keeps the cold disk from clumping instantly.
    const jx = 1.5 * (Math.random() - 0.5);
    const jy = 1.5 * (Math.random() - 0.5);
    addBody(s, W / 2 + r * Math.cos(a), H / 2 + r * Math.sin(a), jx - v * Math.sin(a), jy + v * Math.cos(a), 2 + 8 * Math.random());
  }
  return finish(s);
}

/** The famous figure-eight solution of three equal masses (Chenciner & Montgomery, 2000). */
function figureEight(/** @type {import("../../src/types").Values} */ params) {
  const s = emptyState(params.G);
  const m = 100;
  const L = 22; // length scale; velocities scale with sqrt(G m / L)
  const vs = Math.sqrt((s.G * m) / L);
  const [x1, y1] = [0.97000436, -0.24308753];
  const [vx3, vy3] = [-0.93240737, -0.86473146];
  addBody(s, W / 2 + L * x1, H / 2 + L * y1, (-vs * vx3) / 2, (-vs * vy3) / 2, m);
  addBody(s, W / 2 - L * x1, H / 2 - L * y1, (-vs * vx3) / 2, (-vs * vy3) / 2, m);
  addBody(s, W / 2, H / 2, vs * vx3, vs * vy3, m);
  return finish(s);
}
