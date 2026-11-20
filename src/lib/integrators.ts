/**
 * Time integrators for ordinary differential equations dy/dt = f(t, y).
 *
 * The state y is a Float64Array, and `deriv(t, y, dydt)` writes f(t, y) into `dydt`.
 * Steppers are created once with the state size and reuse their scratch arrays, so
 * calling them every step allocates nothing.
 *
 *   const rk4 = createRk4(3);
 *   rk4(y, t, dt, (t, y, dy) => { dy[0] = ...; dy[1] = ...; dy[2] = ...; });
 */
export type Derivative = (t: number, y: Float64Array, dydt: Float64Array) => void;
export type Stepper = (y: Float64Array, t: number, dt: number, deriv: Derivative) => void;

/** Explicit Euler: simplest, first order. Fine for demos, drifts quickly for orbits. */
export function createEuler(n: number): Stepper {
  const k = new Float64Array(n);
  return (y, t, dt, deriv) => {
    deriv(t, y, k);
    for (let i = 0; i < n; i++) y[i] += dt * k[i];
  };
}

/** Classical Runge–Kutta, fourth order: accurate general-purpose choice (e.g. Lorenz). */
export function createRk4(n: number): Stepper {
  const k1 = new Float64Array(n);
  const k2 = new Float64Array(n);
  const k3 = new Float64Array(n);
  const k4 = new Float64Array(n);
  const tmp = new Float64Array(n);
  return (y, t, dt, deriv) => {
    deriv(t, y, k1);
    for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * dt * k1[i];
    deriv(t + 0.5 * dt, tmp, k2);
    for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * dt * k2[i];
    deriv(t + 0.5 * dt, tmp, k3);
    for (let i = 0; i < n; i++) tmp[i] = y[i] + dt * k3[i];
    deriv(t + dt, tmp, k4);
    for (let i = 0; i < n; i++) y[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  };
}

/**
 * Velocity Verlet (a leapfrog variant) for particles: x'' = a(x).
 * Conserves energy very well over long times, ideal for gravity and molecular dynamics.
 *
 * `acc` must hold the accelerations for the current positions when called (compute them once
 * after init); `computeAcc(pos, acc)` overwrites `acc` for given positions. Arrays are flat,
 * e.g. [x0, y0, x1, y1, ...]; `count` is the number of entries in use (may be < array length).
 */
export function velocityVerlet(
  pos: Float64Array,
  vel: Float64Array,
  acc: Float64Array,
  count: number,
  dt: number,
  computeAcc: (pos: Float64Array, acc: Float64Array) => void,
): void {
  for (let i = 0; i < count; i++) {
    vel[i] += 0.5 * dt * acc[i]; // half kick
    pos[i] += dt * vel[i]; // drift
  }
  computeAcc(pos, acc);
  for (let i = 0; i < count; i++) vel[i] += 0.5 * dt * acc[i]; // half kick
}
