// @ts-check
/**
 * Lorenz attractor: a very simple weather model that behaves chaotically.
 *
 *   dx/dt = σ (y − x)
 *   dy/dt = x (ρ − z) − y
 *   dz/dt = x y − β z
 *
 * Several trajectories start a tiny distance (10⁻⁴) apart. At first they move together,
 * then they separate completely: the butterfly effect. Drag to rotate, scroll/pinch to zoom.
 *
 * Method: classical Runge–Kutta (RK4) for all trajectories at once. Each trajectory keeps
 * a trail of its recent positions, drawn as a line that fades towards its tail.
 *
 * This is also the reference for 3D simulations: `setup3d` creates Three.js objects once,
 * `update3d` copies the current state into them every frame.
 */
import { createRk4, createTrail } from "../../src/lib";

const MAX_TRAIL = 4000; // trail points stored per trajectory (the slider shows fewer)
const START_OFFSET = 1e-4;
const Z_CENTER = 25; // the attractor lies around z ≈ 25; shift it to the origin for the camera

/**
 * @typedef {object} State
 * @property {number} count           number of trajectories
 * @property {Float64Array} y         [x0, y0, z0, x1, y1, z1, ...]
 * @property {import("../../src/lib").Stepper} rk4
 * @property {import("../../src/lib").Trail[]} trails
 * @property {number} t               time
 */

/**
 * Three.js objects created in setup3d and updated in update3d.
 * @typedef {object} View
 * @property {any[]} lines   one THREE.Line per trajectory
 * @property {any[]} heads   one small sphere per trajectory (current position)
 * @property {number[][]} colors  RGB color per trajectory
 * @property {number[]} background  RGB of the background, trails fade into it
 */

/** @type {import("../../src/types").Simulation3D<State, View>} */
export default {
  renderer: "3d",
  camera: { position: [55, 15, 70], target: [0, 0, 0] },
  autoRotate: true,
  dt: 0.005,
  stepsPerSecond: 400, // 2 time units per second at speed ×1

  params: {
    sigma: { type: "range", min: 0, max: 30, step: 0.1, value: 10, label: "σ (sigma)" },
    rho: { type: "range", min: 0, max: 60, step: 0.1, value: 28, label: "ρ (rho)" },
    beta: { type: "range", min: 0, max: 6, step: 0.001, value: 2.667, label: "β (beta)" }, // classic value 8/3
    count: {
      type: "select", options: [1, 2, 3, 5, 10], value: 3, resetOnChange: true,
      label: { de: "Anzahl Bahnen", en: "Number of trajectories" },
    },
    trail: {
      type: "range", min: 50, max: MAX_TRAIL, step: 50, value: 3000,
      label: { de: "Spurlänge", en: "Trail length" },
    },
  },

  metrics: {
    distance: {
      label: { de: "Abstand Bahn 1 ↔ 2", en: "Distance trajectory 1 ↔ 2" },
      // null = "doesn't apply" (shown as –): with a single trajectory there is no distance.
      value: (s) => (s.count < 2 ? null : Math.hypot(s.y[3] - s.y[0], s.y[4] - s.y[1], s.y[5] - s.y[2])),
      yScale: "log", // grows from 10⁻⁴ to about 10¹: exponential growth becomes a straight line
      digits: 2,
    },
  },

  init(params) {
    const count = Number(params.count);
    const y = new Float64Array(3 * count);
    for (let k = 0; k < count; k++) {
      y[3 * k] = 1 + k * START_OFFSET; // almost the same starting point
      y[3 * k + 1] = 1;
      y[3 * k + 2] = 1;
    }
    return {
      count,
      y,
      rk4: createRk4(3 * count),
      trails: Array.from({ length: count }, () => createTrail(MAX_TRAIL, 3)),
      t: 0,
    };
  },

  step(s, p, dt) {
    const { sigma, rho, beta } = p;
    s.rk4(s.y, s.t, dt, (t, y, dy) => {
      for (let k = 0; k < 3 * s.count; k += 3) {
        const x = y[k], yy = y[k + 1], z = y[k + 2];
        dy[k] = sigma * (yy - x);
        dy[k + 1] = x * (rho - z) - yy;
        dy[k + 2] = x * yy - beta * z;
      }
    });
    s.t += dt;
    for (let k = 0; k < s.count; k++) s.trails[k].push(s.y[3 * k], s.y[3 * k + 1], s.y[3 * k + 2]);
  },

  setup3d({ THREE, scene }, s) {
    const background = /** @type {any} */ (scene.background)?.toArray?.() ?? [0, 0, 0];
    /** @type {View} */
    const view = { lines: [], heads: [], colors: [], background };
    for (let k = 0; k < s.count; k++) {
      // Evenly spread hues: each trajectory gets its own color.
      const color = new THREE.Color().setHSL(k / s.count + 0.05, 0.85, 0.6);
      view.colors.push(color.toArray());

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * MAX_TRAIL), 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(3 * MAX_TRAIL), 3));
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true }));
      line.frustumCulled = false; // the geometry changes every frame
      scene.add(line);
      view.lines.push(line);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }));
      scene.add(head);
      view.heads.push(head);
    }
    return view;
  },

  update3d(view, s, p) {
    const shown = Math.min(Number(p.trail), MAX_TRAIL);
    const [br, bg, bb] = view.background;
    for (let k = 0; k < s.count; k++) {
      const trail = s.trails[k];
      const n = Math.min(shown, trail.length);
      const start = trail.length - n;
      const geometry = view.lines[k].geometry;
      const pos = geometry.attributes.position.array;
      const col = geometry.attributes.color.array;
      const [r, g, b] = view.colors[k];
      for (let i = 0; i < n; i++) {
        // Lorenz (x, y, z) → screen (x, z, y): z is "up" in the usual pictures.
        pos[3 * i] = trail.get(start + i, 0);
        pos[3 * i + 1] = trail.get(start + i, 2) - Z_CENTER;
        pos[3 * i + 2] = trail.get(start + i, 1);
        // Fade from the background color (oldest) to full color (newest).
        const f = (i + 1) / n;
        col[3 * i] = br + f * (r - br);
        col[3 * i + 1] = bg + f * (g - bg);
        col[3 * i + 2] = bb + f * (b - bb);
      }
      geometry.setDrawRange(0, n);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      view.heads[k].position.set(s.y[3 * k], s.y[3 * k + 2] - Z_CENTER, s.y[3 * k + 1]);
    }
  },
};
