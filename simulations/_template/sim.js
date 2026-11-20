// @ts-check
/**
 * TEMPLATE: copy this folder to simulations/<your-name>/ and start editing.
 * (Folders starting with "_" are not shown on the website.)
 *
 * Example: balls falling under gravity and bouncing off the floor.
 * Click or tap to drop a new ball.
 *
 * A simulation is one object with:
 *   init(params)                 → creates the starting state
 *   step(state, params, dt)      → advances the state by one time step (no drawing here!)
 *   draw(ctx, state, params)     → draws the state on a canvas
 * plus optional params (controls), metrics (numbers + plot) and onPointer (mouse/touch).
 * See CONTRIBUTING.md and src/types/index.ts for all options.
 */
import { createRng } from "../../src/lib";

const MAX_BALLS = 100;

/**
 * Everything that changes over time lives in the state.
 * @typedef {object} State
 * @property {number} n           number of balls
 * @property {Float64Array} x     positions (world units)
 * @property {Float64Array} y
 * @property {Float64Array} vx    velocities (world units per second)
 * @property {Float64Array} vy
 * @property {import("../../src/lib").Rng} rng
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
  renderer: "2d",

  // Your coordinate system. The shell scales it to the screen. Origin top-left, y down.
  world: { width: 100, height: 60 },

  // Simulated time per step, and how many steps run per real second (at speed ×1).
  dt: 1 / 60,
  stepsPerSecond: 60,

  // Each parameter becomes a control. The current values arrive as `params` below.
  params: {
    gravity: {
      type: "range", min: 0, max: 50, step: 1, value: 20,
      label: { de: "Schwerkraft g", en: "Gravity g" },
    },
    bouncy: {
      type: "boolean", value: true,
      label: { de: "Elastisch springen", en: "Bounce elastically" },
    },
    count: {
      type: "select", options: [5, 20, 50], value: 20,
      resetOnChange: true, // changing this restarts the simulation via init()
      label: { de: "Anzahl Bälle", en: "Number of balls" },
    },
    shake: {
      type: "button",
      label: { de: "Durchschütteln", en: "Shake" },
      action: (s) => {
        for (let i = 0; i < s.n; i++) s.vy[i] -= 20 + 20 * s.rng.next();
      },
    },
  },

  // Numbers shown below the simulation (with a small plot over time).
  metrics: {
    height: {
      label: { de: "Mittlere Höhe", en: "Average height" },
      value: (s) => {
        let sum = 0;
        for (let i = 0; i < s.n; i++) sum += 60 - s.y[i];
        return s.n > 0 ? sum / s.n : 0;
      },
      digits: 1,
    },
  },

  init(params) {
    const rng = createRng();
    /** @type {State} */
    const state = {
      n: 0,
      x: new Float64Array(MAX_BALLS), // allocate once here, never inside step()
      y: new Float64Array(MAX_BALLS),
      vx: new Float64Array(MAX_BALLS),
      vy: new Float64Array(MAX_BALLS),
      rng,
    };
    for (let i = 0; i < Number(params.count); i++) {
      addBall(state, rng.range(5, 95), rng.range(5, 30));
    }
    return state;
  },

  step(s, params, dt) {
    for (let i = 0; i < s.n; i++) {
      // Newton: velocity changes by acceleration·dt, position by velocity·dt (Euler method)
      s.vy[i] += params.gravity * dt;
      s.x[i] += s.vx[i] * dt;
      s.y[i] += s.vy[i] * dt;
      // Floor and walls
      if (s.y[i] > 59) {
        s.y[i] = 59;
        s.vy[i] = params.bouncy ? -Math.abs(s.vy[i]) : -0.5 * Math.abs(s.vy[i]);
      }
      if (s.x[i] < 1 || s.x[i] > 99) s.vx[i] *= -1;
    }
  },

  // Mouse and touch: x, y are already in world coordinates.
  onPointer(s, params, e) {
    if (e.type === "down") addBall(s, e.x, e.y);
  },

  draw(ctx, s) {
    ctx.fillStyle = "#f4a259";
    for (let i = 0; i < s.n; i++) {
      ctx.beginPath();
      ctx.arc(s.x[i], s.y[i], 1, 0, 2 * Math.PI);
      ctx.fill();
    }
  },
};

/** Helper functions can live below the simulation object. */
function addBall(/** @type {State} */ s, /** @type {number} */ x, /** @type {number} */ y) {
  if (s.n >= MAX_BALLS) return;
  s.x[s.n] = x;
  s.y[s.n] = y;
  s.vx[s.n] = s.rng.range(-10, 10);
  s.vy[s.n] = 0;
  s.n++;
}
