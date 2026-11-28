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
import { createRng, cssColor, plasma } from "../../src/lib";

const MAX_PARTICLES = 300;
const EXTERNAL_FORCE = 50; // strength of the external force applied by mouse/touch

/**
 * Everything that changes over time lives in the state.
 * @typedef {object} State
 * @property {number} n           number of balls
 * @property {Float64Array} x     positions (world units)
 * @property {Float64Array} y
 * @property {Float64Array} vx    velocities (world units per second)
 * @property {Float64Array} vy
 * @property {Float64Array} fx_lj    Lennard-Jones forces (world units per second²)
 * @property {Float64Array} fy_lj
 * @property {Float64Array} fx_langevin    Langevin forces (world units per second²)
 * @property {Float64Array} fy_langevin
 * @property {boolean} external_active  whether the external force is active
 * @property {number} external_mult  multiplier for the external force (positive or negative)
 * @property {{ x: number, y: number }} external_pos  position of the external force
 * @property {import("../../src/lib").Rng} rng
 * @property {number} sigma  particle size (world units); need this to draw the balls
 * @property {boolean} colorBySpeed  whether to color the particles by speed or not
 * @property {Float64Array} past_temps  past measured temperatures for averaging
 * @property {Float64Array} past_pressures  past measured pressures for averaging
 */

/** @type {import("../../src/types").Simulation2D<State>} */
export default {
    renderer: "2d",

    // Your coordinate system. The shell scales it to the screen. Origin top-left, y down.
    world: { width: 102, height: 102 },

    // Simulated time per step, and how many steps run per real second (at speed ×1).
    dt: 1 / 60,
    stepsPerSecond: 120,        // 2x speed looks cooler than 1x, easier than making all the forces bigger :)

    // Each parameter becomes a control. The current values arrive as `params` below.
    params: {
        n_particles: {
            type: "range", min: 1, max: MAX_PARTICLES, step: 1, value: 100,
            label: { de: "Anzahl Teilchen", en: "Number of particles" },
        },
        temperature: {
            type: "range", min: 0, max: 10, step: 0.1, value: 5,
            label: { de: "Zieltemperatur", en: "Target temperature" },
        },
        sigma: {
            type: "range", min: 0.5, max: 4, step: 0.1, value: 3,
            label: { de: "σ (Teilchengröße)", en: "σ (particle size)" },
        },
        epsilon: {
            type: "range", min: 0.1, max: 3, step: 0.01, value: 1,
            label: { de: "ε (Interaktionsstärke)", en: "ε (interaction strength)" },
        },
        gamma: {
            type: "range", min: 0, max: 5, step: 0.01, value: 1,
            label: { de: "γ (Stärke des Thermostats)", en: "γ (thermostat strength)" },
        },
        colorBySpeed: {
            type: "boolean", value: false,
            label: { de: "Teilchen nach Geschwindigkeit einfärben", en: "Color particles by speed" },
        },
        attract: {
            type: "boolean", value: true,
            label: { de: "Mauszeiger zieht Teilchen an", en: "Cursor attracts" },
        },
    },

    // Numbers shown below the simulation (with a small plot over time).
    metrics: {
        measured_temp: {
            label: { de: "Gemessene Temperatur (instantan)", en: "Measured temperature (instantaneous)" },
            value: (s) => {
                return s.past_temps.length > 0 ? s.past_temps[0] : 0;
            },
            digits: 3,
        },
        measured_temp_avg: {
            label: { de: "Gemessene Temperatur (über die letzten drei Sekunden gemittelt)", en: "Measured temperature (time-averaged over the last three seconds)" },
            value: (s) => {
                // Calculate the time-averaged temperature
                let sum = 0;
                for (let i = 0; i < s.past_temps.length; i++) {
                    sum += s.past_temps[i];
                }
                return s.past_temps.length > 0 ? sum / s.past_temps.length : 0;
            },
            digits: 3,
        },
        pressure: {
            label: { de: "Gemessener Druck", en: "Measured pressure" },
            value: (s) => {
                return s.past_pressures.length > 0 ? s.past_pressures[0] : 0;
            },
            digits: 3,
        },
        pressure_avg: {
            label: { de: "Gemessener Druck (über die letzten drei Sekunden gemittelt)", en: "Measured pressure (time-averaged over the last three seconds)" },
            value: (s) => {
                // Calculate the time-averaged pressure
                let sum = 0;
                for (let i = 0; i < s.past_pressures.length; i++) {
                    sum += s.past_pressures[i];
                }
                return s.past_pressures.length > 0 ? sum / s.past_pressures.length : 0;
            },
            digits: 3,
        },
    },

    init(params) {
        const rng = createRng();
        /** @type {State} */
        const state = {
            n: 0,
            x: new Float64Array(MAX_PARTICLES), // allocate once here, never inside step()
            y: new Float64Array(MAX_PARTICLES),
            vx: new Float64Array(MAX_PARTICLES),
            vy: new Float64Array(MAX_PARTICLES),
            fx_lj: new Float64Array(MAX_PARTICLES),
            fy_lj: new Float64Array(MAX_PARTICLES),
            fx_langevin: new Float64Array(MAX_PARTICLES),
            fy_langevin: new Float64Array(MAX_PARTICLES),
            external_active: false,
            external_mult: 0,
            external_pos: { x: 0, y: 0 },
            rng,
            sigma: params.sigma,
            colorBySpeed: params.colorBySpeed, // whether to color the particles by speed or not
            past_temps: new Float64Array(180), // store the last 180 measured temperatures
            past_pressures: new Float64Array(180), // store the last 180 measured pressures
        };
        for (let i = 0; i < Number(params.n_particles); i++) {
            addParticle(state, params.temperature, params.gamma, 0);
        }
        return state;
    },

    step(s, params, dt) {
        s.sigma = params.sigma; // update particle size in case it changed
        s.colorBySpeed = params.colorBySpeed; // update colorBySpeed setting in case it changed

        for (let i = 0; i < 100 && s.n < params.n_particles; i++) {
            addParticle(s, params.temperature, params.gamma, 0);
        }
        while (s.n > params.n_particles) removeParticle(s);

        let c = Math.exp(-params.gamma * dt); // damping factor for Langevin thermostat

        for (let i = 0; i < s.n; i++) {
            // Update velocities with half step
            s.vx[i] += 0.5 * dt * s.fx_lj[i];
            s.vy[i] += 0.5 * dt * s.fy_lj[i];
        }
        for (let i = 0; i < s.n; i++) {
            // Update positions
            s.x[i] += 0.5 * dt * s.vx[i];
            s.y[i] += 0.5 * dt * s.vy[i];
        }
        handleBCs(s, params); // handle boundary conditions (walls)
        for (let i = 0; i < s.n; i++) {
            // Noise term (Langevin thermostat)
            s.vx[i] = c * s.vx[i] + Math.sqrt((1 - c ** 2) * params.temperature) * s.rng.normal();
            s.vy[i] = c * s.vy[i] + Math.sqrt((1 - c ** 2) * params.temperature) * s.rng.normal();
        }
        for (let i = 0; i < s.n; i++) {
            s.x[i] += 0.5 * dt * s.vx[i];
            s.y[i] += 0.5 * dt * s.vy[i];
        }
        handleBCs(s, params); // handle boundary conditions (walls)
        computeLJForces(s, params.epsilon, params.sigma);
        addExternalForces(s);
        for (let i = 0; i < s.n; i++) {
            // Update velocities with another half step
            s.vx[i] += 0.5 * dt * s.fx_lj[i];
            s.vy[i] += 0.5 * dt * s.fy_lj[i];
        }

        // Update past temperatures for averaging
        let sum = 0;
        for (let i = 0; i < s.n; i++) {
            sum += s.vx[i] * s.vx[i] + s.vy[i] * s.vy[i];
        }
        const measured_temp = s.n > 0 ? sum / (2 * s.n) : 0;
        // Shift past temperatures and add the new one
        for (let i = s.past_temps.length - 1; i > 0; i--) {
            s.past_temps[i] = s.past_temps[i - 1];
        }
        s.past_temps[0] = measured_temp;

        let pressure_sum = 0;
        for (let i = 0; i < s.n; i++) {
            pressure_sum += s.vx[i] * s.vx[i] + s.vy[i] * s.vy[i] + 0.5 * (s.fx_lj[i] * s.x[i] + s.fy_lj[i] * s.y[i]);
        }
        const measured_pressure = pressure_sum / (2 * 10000); // divide by area (100x100) to get pressure
        // Shift past pressures and add the new one
        for (let i = s.past_pressures.length - 1; i > 0; i--) {
            s.past_pressures[i] = s.past_pressures[i - 1];
        }
        s.past_pressures[0] = measured_pressure;
    },

    onPointer(s, params, e) {
        if (e.type === "up" || e.buttons === 0) {
            s.external_active = false;
            return;
        }
        if (e.x < 1 || e.x > 101 || e.y < 1 || e.y > 101) {
            s.external_active = false;
            return;
        }

        // Left button / finger attracts (or repulses if the toggle is on), right button paints down.
        s.external_active = true;
        s.external_mult = params.attract ? EXTERNAL_FORCE : -EXTERNAL_FORCE;
        if (e.buttons & 2) s.external_mult = -EXTERNAL_FORCE;
        // Paint along the line from the previous position, so fast strokes leave no gaps.
        s.external_pos = { x: e.x, y: e.y };
    },

    draw(ctx, s) {
        for (let i = 0; i < s.n; i++) {
            const speed = Math.sqrt(s.vx[i] * s.vx[i] + s.vy[i] * s.vy[i]);
            if (s.colorBySpeed) {
                ctx.fillStyle = cssColor(plasma, Math.min(speed, 8) / 8);
            }
            else {
                ctx.fillStyle = cssColor(plasma, 0.8);
            }
            ctx.beginPath();
            ctx.arc(s.x[i] + 1, s.y[i] + 1, s.sigma / 2, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw walls
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 102, 102);
    },
};

/** Helper functions can live below the simulation object. */
function addParticle(/** @type {State} */ s, /** @type {number} */ T, /** @type {number} */ gamma, /** @type {number} */ dt) {
    if (s.n >= MAX_PARTICLES) return;
    for (let i = 0; i < 100; i++) { // try up to 100 times to place a particle
        const x = s.rng.range(1, 99);
        const y = s.rng.range(1, 99);
        let tooClose = false;
        for (let i = 0; i < s.n; i++) {
            const dx = x - s.x[i];
            const dy = y - s.y[i];
            if (dx * dx + dy * dy < s.sigma * s.sigma) { // minimum distance squared
                tooClose = true;
                break;
            }
        }
        if (!tooClose) {
            s.x[s.n] = x;
            s.y[s.n] = y;
            s.vx[s.n] = Math.sqrt(T) * s.rng.normal();
            s.vy[s.n] = Math.sqrt(T) * s.rng.normal();
            s.n++;
            break;
        }
    }
}

function removeParticle(/** @type {State} */ s) {
    if (s.n == 0) return;
    let index = s.rng.int(s.n - 1);
    s.x[index] = s.x[s.n - 1];
    s.y[index] = s.y[s.n - 1];
    s.vx[index] = s.vx[s.n - 1];
    s.vy[index] = s.vy[s.n - 1];
    s.n--;
}

function computeLJForces(/** @type {State} */ s, /** @type {number} */ epsilon, /** @type {number} */ sigma) {
    for (let i = 0; i < s.n; i++) {
        s.fx_lj[i] = 0;
        s.fy_lj[i] = 0;
    }

    const sigma6 = sigma ** 6;
    const sigma12 = sigma ** 12;

    for (let i = 0; i < s.n; i++) {
        for (let j = i + 1; j < s.n; j++) {
            let dx = s.x[j] - s.x[i];
            let dy = s.y[j] - s.y[i];

            let r2 = dx * dx + dy * dy;
            if (r2 < 1e-12) continue;
            let r6 = r2 * r2 * r2;
            let r12 = r6 * r6;
            let forceMagnitude = 24 * epsilon * (2 * sigma12 / r12 - sigma6 / r6) / Math.sqrt(r2);

            forceMagnitude = Math.max(-1000, Math.min(1000, forceMagnitude)); // prevent extreme forces

            // dx points from i to j. At short range this vector coefficient
            // is positive, so i must be pushed opposite dx and j along dx.
            s.fx_lj[i] -= forceMagnitude * dx;
            s.fy_lj[i] -= forceMagnitude * dy;
            s.fx_lj[j] += forceMagnitude * dx;
            s.fy_lj[j] += forceMagnitude * dy;
        }
    }
}

function addExternalForces(/** @type {State} */ s) {
    if (!s.external_active) return;
    for (let i = 0; i < s.n; i++) {
        let dx = s.x[i] - s.external_pos.x;
        let dy = s.y[i] - s.external_pos.y;

        let r2 = dx * dx + dy * dy;
        if (r2 < 1e-12) continue;
        let r = Math.sqrt(r2);
        let forceMagnitude = s.external_mult * Math.exp(-0.005 * r2);
        forceMagnitude = Math.max(-500, Math.min(500, forceMagnitude)); // prevent extreme forces
        s.fx_lj[i] -= forceMagnitude * dx / r;
        s.fy_lj[i] -= forceMagnitude * dy / r;
    }
}

function handleBCs(/** @type {State} */ s, /** @type {any} */ params) {
    for (let i = 0; i < s.n; i++) {
        // Reflective walls
        if (s.x[i] < s.sigma / 2) { s.x[i] = s.sigma / 2; s.vx[i] *= -1; }
        if (s.x[i] > 100 - s.sigma / 2) { s.x[i] = 100 - s.sigma / 2; s.vx[i] *= -1; }
        if (s.y[i] < s.sigma / 2) { s.y[i] = s.sigma / 2; s.vy[i] *= -1; }
        if (s.y[i] > 100 - s.sigma / 2) { s.y[i] = 100 - s.sigma / 2; s.vy[i] *= -1; }
    }
}