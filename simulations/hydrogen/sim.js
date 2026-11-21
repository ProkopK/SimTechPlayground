// @ts-check
/**
 * Hydrogen atom: the electron as a 3D cloud.
 *
 * Quantum mechanics does not say where the electron *is*, only how likely it is to be
 * found at each place: the probability density |ψ|². We draw many random points from
 * that density, so the cloud is dense where the electron is likely to be.
 *
 * Wavefunction (atomic units: Bohr radius a₀ = 1, ħ = 1, energies in Hartree):
 *
 *   ψ_nlm(r, θ, φ) = R_nl(r) · Y_lm(θ, φ),   E_n = −1 / (2 n²)
 *
 * R_nl uses generalized Laguerre polynomials, Y_lm associated Legendre functions.
 * Real orbitals (p_x, d_xy, …) use cos(mφ) / sin(mφ); complex ones use e^{imφ}.
 *
 * Time evolution: a single orbital is stationary (only its global phase turns, which is
 * invisible). A superposition of two orbitals with different n oscillates:
 *
 *   ψ(t) = c₁ψ₁ + c₂ψ₂ · e^{−iΔE·t}      (global phase dropped; c₁² + c₂² = 1 from the "mix" slider)
 *
 * Method: the points are sampled once (in init) from the time-averaged density
 * q = (|ψ₁|² + |ψ₂|²) / 2 by sampling each orbital exactly (radius from a tabulated
 * cumulative distribution, direction by rejection sampling). Every frame each point gets
 * the brightness |ψ(t)|² / q, which lies in [0, 2] for every mix (Cauchy–Schwarz), so the
 * summed brightness follows the current density without resampling ("importance
 * weighting"); the mix slider therefore works live. Colors show the phase of ψ.
 */
import { createRng } from "../../src/lib";

const VIEW_RADIUS = 10; // world units filled by 95 % of the probability
const SLICE_HALF_WIDTH = 0.6; // world units: half the thickness of the slice through the x-z plane
const TRUE_SIZE_RADIUS = 20; // Bohr radii shown as VIEW_RADIUS in "true size" mode (about n = 3)
const BOHR_PM = 52.918; // Bohr radius in picometers
const HARTREE_EV = 27.2114; // atomic unit of energy in eV
const AU_TIME_FS = 0.0241888; // atomic unit of time in femtoseconds
const HC_EV_NM = 1239.84; // h·c in eV·nm: wavelength = HC / energy
const RADIAL_SAMPLES = 2048; // resolution of the radial distribution table

/**
 * Orbital: quantum numbers n, l, m (m ≥ 0) and the angular form in φ:
 * "cos"/"sin" for real orbitals, "exp" for complex e^{imφ} (angular momentum m around z).
 * @typedef {{ n: number, l: number, m: number, kind: "cos" | "sin" | "exp" }} Orbital
 */

/** @type {Record<string, Orbital>} */
const ORBITALS = {
  "1s": { n: 1, l: 0, m: 0, kind: "cos" },
  "2s": { n: 2, l: 0, m: 0, kind: "cos" },
  "2p (z)": { n: 2, l: 1, m: 0, kind: "cos" },
  "2p (x)": { n: 2, l: 1, m: 1, kind: "cos" },
  "2p (y)": { n: 2, l: 1, m: 1, kind: "sin" },
  "2p (m = +1)": { n: 2, l: 1, m: 1, kind: "exp" },
  "3s": { n: 3, l: 0, m: 0, kind: "cos" },
  "3p (z)": { n: 3, l: 1, m: 0, kind: "cos" },
  "3d (z²)": { n: 3, l: 2, m: 0, kind: "cos" },
  "3d (xz)": { n: 3, l: 2, m: 1, kind: "cos" },
  "3d (xy)": { n: 3, l: 2, m: 2, kind: "sin" },
  "3d (x² - y²)": { n: 3, l: 2, m: 2, kind: "cos" },
  "3d (m = +2)": { n: 3, l: 2, m: 2, kind: "exp" },
  "4s": { n: 4, l: 0, m: 0, kind: "cos" },
  "4f (z³)": { n: 4, l: 3, m: 0, kind: "cos" },
  "4f (xyz)": { n: 4, l: 3, m: 2, kind: "sin" },
};
const orbitalOptions = Object.fromEntries(Object.keys(ORBITALS).map((k) => [k, k]));

/**
 * @typedef {object} State
 * @property {number} count          number of points
 * @property {Float32Array} pos      point positions [x0, y0, z0, x1, ...], scaled to world units
 * @property {Float32Array} psi1re   ψ₁ at each point (real and imaginary part)
 * @property {Float32Array} psi1im
 * @property {Float32Array} psi2re   ψ₂ at each point (zero without a second orbital)
 * @property {Float32Array} psi2im
 * @property {Float32Array} invQ     1 / (|ψ₁|² + |ψ₂|²) at each point
 * @property {boolean} hasSecond     a second orbital is selected
 * @property {number} fitScale       world units per Bohr radius that fit this cloud to the view
 * @property {number} dE             energy difference E₂ − E₁ (Hartree); 0 = stationary
 * @property {number} t              time (atomic units)
 * @property {number[]} dipoleRe     ⟨ψ₁| r |ψ₂⟩ (Bohr radii), real and imaginary part
 * @property {number[]} dipoleIm
 * @property {number[]} axis         unit vector along which the center of charge moves
 * @property {number} period         oscillation period in fs (0 = stationary)
 * @property {number} wavelength     wavelength of the emitted light in nm (0 = no light)
 */

/**
 * Three.js objects created in setup3d and updated in update3d.
 * @typedef {object} View
 * @property {any} points     THREE.Points
 * @property {Float32Array} lut  256 RGB colors for the phase 0 … 2π
 */

// ---------------------------------------------------------------------------------------
// Wavefunctions

/** n! @param {number} n */
function factorial(n) {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Generalized Laguerre polynomial L_k^α(x), by the three-term recurrence. @param {number} k @param {number} alpha @param {number} x */
function laguerre(k, alpha, x) {
  let prev = 1;
  if (k === 0) return prev;
  let cur = 1 + alpha - x;
  for (let j = 1; j < k; j++) {
    const next = ((2 * j + 1 + alpha - x) * cur - (j + alpha) * prev) / (j + 1);
    prev = cur;
    cur = next;
  }
  return cur;
}

/** Associated Legendre function P_l^m(cos θ) without the (−1)^m sign; u = cos θ, s = sin θ. @param {number} l @param {number} m @param {number} u @param {number} s */
function legendre(l, m, u, s) {
  let pmm = 1;
  for (let i = 1; i <= m; i++) pmm *= (2 * i - 1) * s;
  if (l === m) return pmm;
  let pm1 = u * (2 * m + 1) * pmm;
  for (let ll = m + 2; ll <= l; ll++) {
    const pll = ((2 * ll - 1) * u * pm1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pm1;
    pm1 = pll;
  }
  return pm1;
}

/** Normalized radial function R_nl(r). @param {Orbital} o @param {number} r */
function radial(o, r) {
  const rho = (2 * r) / o.n;
  const norm = Math.sqrt((8 / o.n ** 3) * factorial(o.n - o.l - 1) / (2 * o.n * factorial(o.n + o.l)));
  return norm * rho ** o.l * Math.exp(-rho / 2) * laguerre(o.n - o.l - 1, 2 * o.l + 1, rho);
}

/** Normalized (real or complex) spherical harmonic at direction (cos θ = u, sin θ = s, φ). Writes [re, im] into out.
 * @param {Orbital} o @param {number} u @param {number} s @param {number} phi @param {number[]} out */
function angular(o, u, s, phi, out) {
  let k = Math.sqrt(((2 * o.l + 1) / (4 * Math.PI)) * factorial(o.l - o.m) / factorial(o.l + o.m));
  if (o.m > 0 && o.kind !== "exp") k *= Math.SQRT2; // real orbitals combine +m and −m
  const p = k * legendre(o.l, o.m, u, s);
  if (o.kind === "sin") {
    out[0] = p * Math.sin(o.m * phi);
    out[1] = 0;
  } else {
    out[0] = p * Math.cos(o.m * phi);
    out[1] = o.kind === "exp" ? p * Math.sin(o.m * phi) : 0;
  }
}

/** ψ at the point (x, y, z) in Bohr radii. Writes [re, im] into out.
 * @param {Orbital} o @param {number} x @param {number} y @param {number} z @param {number[]} out */
function psi(o, x, y, z, out) {
  const r = Math.hypot(x, y, z) || 1e-12;
  angular(o, z / r, Math.hypot(x, y) / r, Math.atan2(y, x), out);
  const R = radial(o, r);
  out[0] *= R;
  out[1] *= R;
}

/** Largest radius worth considering: the density is negligible beyond it. @param {number} n */
const maxRadius = (n) => 6 * n * n + 10;

/**
 * Prepare sampling from |ψ|²: cumulative radial distribution r²R² (table) and the maximum of
 * |Y|² over the sphere (for rejection sampling of the direction).
 * @param {Orbital} o
 */
function createSampler(o) {
  const rMax = maxRadius(o.n);
  const cdf = new Float64Array(RADIAL_SAMPLES + 1);
  let prev = 0;
  for (let i = 1; i <= RADIAL_SAMPLES; i++) {
    const r = (i / RADIAL_SAMPLES) * rMax;
    const p = (r * radial(o, r)) ** 2;
    cdf[i] = cdf[i - 1] + (prev + p) / 2; // trapezoid rule
    prev = p;
  }
  for (let i = 0; i <= RADIAL_SAMPLES; i++) cdf[i] /= cdf[RADIAL_SAMPLES];

  const out = [0, 0];
  let yMax = 0;
  for (let i = 0; i <= 64; i++) {
    const u = -1 + i / 32;
    for (let j = 0; j < 128; j++) {
      angular(o, u, Math.sqrt(1 - u * u), (j / 128) * 2 * Math.PI, out);
      yMax = Math.max(yMax, out[0] ** 2 + out[1] ** 2);
    }
  }
  yMax *= 1.05; // margin: the grid may miss the exact maximum

  /** Radius below which a fraction f of the probability lies. @param {number} f */
  const quantile = (f) => {
    let lo = 0, hi = RADIAL_SAMPLES;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < f) lo = mid;
      else hi = mid;
    }
    const frac = (f - cdf[lo]) / (cdf[hi] - cdf[lo] || 1);
    return ((lo + frac) / RADIAL_SAMPLES) * rMax;
  };

  /** Draw one point from |ψ|²; writes [x, y, z] into p. @param {import("../../src/lib").Rng} rng @param {number[]} p */
  const sample = (rng, p) => {
    const r = quantile(rng.next());
    let u, s, phi;
    do {
      u = 2 * rng.next() - 1; // uniform direction on the sphere ...
      s = Math.sqrt(1 - u * u);
      phi = 2 * Math.PI * rng.next();
      angular(o, u, s, phi, out);
    } while (rng.next() * yMax > out[0] ** 2 + out[1] ** 2); // ... accepted with probability |Y|² / max
    p[0] = r * s * Math.cos(phi);
    p[1] = r * s * Math.sin(phi);
    p[2] = r * u;
  };

  return { sample, quantile };
}

/**
 * Transition dipole ⟨ψ₁| r |ψ₂⟩ = ∫ R₁R₂ r³ dr · ∫ Y₁* r̂ Y₂ dΩ, by numerical quadrature.
 * It is zero unless l changes by ±1 and m by 0 or ±1 (selection rules).
 * Returns the real and imaginary parts as 3-vectors.
 * @param {Orbital} o1 @param {Orbital} o2
 */
function transitionDipole(o1, o2) {
  const rMax = maxRadius(Math.max(o1.n, o2.n));
  const nr = 4000;
  let radialPart = 0;
  for (let i = 1; i < nr; i++) {
    const r = (i / nr) * rMax;
    radialPart += radial(o1, r) * radial(o2, r) * r ** 3;
  }
  radialPart *= rMax / nr;

  const re = [0, 0, 0], im = [0, 0, 0];
  const a = [0, 0], b = [0, 0];
  const nu = 64, nphi = 64;
  const dOmega = (2 / nu) * ((2 * Math.PI) / nphi);
  for (let i = 0; i < nu; i++) {
    const u = -1 + (2 * (i + 0.5)) / nu;
    const s = Math.sqrt(1 - u * u);
    for (let j = 0; j < nphi; j++) {
      const phi = ((j + 0.5) / nphi) * 2 * Math.PI;
      angular(o1, u, s, phi, a);
      angular(o2, u, s, phi, b);
      const pr = a[0] * b[0] + a[1] * b[1]; // conj(Y₁) · Y₂
      const pi = a[0] * b[1] - a[1] * b[0];
      const dir = [s * Math.cos(phi), s * Math.sin(phi), u];
      for (let k = 0; k < 3; k++) {
        re[k] += pr * dir[k] * dOmega;
        im[k] += pi * dir[k] * dOmega;
      }
    }
  }
  for (let k = 0; k < 3; k++) {
    re[k] = Math.abs(re[k]) < 1e-9 ? 0 : re[k] * radialPart; // remove quadrature noise of exact zeros
    im[k] = Math.abs(im[k]) < 1e-9 ? 0 : im[k] * radialPart;
  }
  return { re, im };
}

/** @param {number} n */
const energy = (n) => -1 / (2 * n * n);
/** @param {number[]} v */
const norm3 = (v) => Math.hypot(v[0], v[1], v[2]);

/** Amplitudes c₁, c₂ for a share `mix` of the second orbital (c₁² + c₂² = 1). @param {number} mix */
const amplitudes = (mix) => [Math.sqrt(1 - mix), Math.sqrt(mix)];

/** True if the electron really is in two states at once. @param {State} s @param {import("../../src/types").Values} p */
const isSuperposition = (s, p) => s.hasSecond && p.mix > 0 && p.mix < 1;

// ---------------------------------------------------------------------------------------

/** @type {import("../../src/types").Simulation3D<State, View>} */
export default {
  renderer: "3d",
  camera: { position: [0, 7, 30], target: [0, 0, 0] },
  autoRotate: true,
  dt: 1 / 3, // atomic units of time (≈ 8 attoseconds)
  stepsPerSecond: 60, // 20 atomic time units per second: 1s + 2p oscillates in under a second
  maxSpeed: 10,

  params: {
    orbital: {
      type: "select", options: orbitalOptions, value: "2p (z)", resetOnChange: true,
      label: { de: "Orbital", en: "Orbital" },
    },
    second: {
      type: "select", options: { none: { de: "– keins –", en: "– none –" }, ...orbitalOptions }, value: "none", resetOnChange: true,
      label: { de: "Überlagert mit", en: "Superposed with" },
    },
    mix: {
      type: "range", min: 0, max: 1, step: 0.01, value: 0.5,
      label: { de: "Anteil 2. Orbital", en: "Share of 2nd orbital" },
    },
    trueSize: { type: "boolean", value: false, label: { de: "Echte Größenverhältnisse", en: "True relative size" } },
    slice: { type: "boolean", value: false, label: { de: "Nur Schnitt (x-z-Ebene)", en: "Slice only (x-z plane)" } },
    count: {
      type: "select", options: [20000, 50000, 100000], value: 50000, mobileValue: 20000, resetOnChange: true,
      label: { de: "Anzahl Punkte", en: "Number of points" },
    },
  },

  presets: {
    ground: { label: { de: "Grundzustand 1s", en: "Ground state 1s" }, params: { orbital: "1s", second: "none" } },
    dumbbell: { label: { de: "Hantel 2p (z)", en: "Dumbbell 2p (z)" }, params: { orbital: "2p (z)", second: "none" } },
    clover: { label: { de: "Kleeblatt 3d (xy)", en: "Cloverleaf 3d (xy)" }, params: { orbital: "3d (xy)", second: "none" } },
    swing: { label: { de: "Schwingung 1s + 2p (z): UV-Licht", en: "Oscillation 1s + 2p (z): UV light" }, params: { orbital: "1s", second: "2p (z)", mix: 0.5 } },
    spin: { label: { de: "Kreisel 1s + 2p (m = +1)", en: "Spinning 1s + 2p (m = +1)" }, params: { orbital: "1s", second: "2p (m = +1)", mix: 0.5 } },
    red: { label: { de: "Rotes Licht 2s + 3p (z)", en: "Red light 2s + 3p (z)" }, params: { orbital: "2s", second: "3p (z)", mix: 0.5 } },
    breathe: { label: { de: "Atmen 1s + 2s: kein Licht", en: "Breathing 1s + 2s: no light" }, params: { orbital: "1s", second: "2s", mix: 0.5 } },
  },

  // null = "doesn't apply" (shown as –): without a superposition nothing oscillates or shines.
  metrics: {
    dipole: {
      label: { de: "Auslenkung des Ladungsschwerpunkts (pm)", en: "Displacement of the center of charge (pm)" },
      // ⟨r⟩(t) = 2 c₁c₂ · Re(⟨ψ₁| r |ψ₂⟩ · e^{−iΔE·t}), projected on its axis
      value: (s, p) => {
        if (!isSuperposition(s, p)) return null;
        const [c1, c2] = amplitudes(p.mix);
        const c = Math.cos(s.dE * s.t), sn = Math.sin(s.dE * s.t);
        let d = 0;
        for (let k = 0; k < 3; k++) d += s.axis[k] * (s.dipoleRe[k] * c + s.dipoleIm[k] * sn);
        return 2 * c1 * c2 * d * BOHR_PM;
      },
      digits: 1,
    },
    period: {
      label: { de: "Schwingungsdauer (Femtosekunden)", en: "Oscillation period (femtoseconds)" },
      value: (s, p) => (isSuperposition(s, p) && s.period > 0 ? s.period : null),
      plot: false,
      digits: 2,
    },
    wavelength: {
      label: { de: "Wellenlänge des ausgesandten Lichts (nm)", en: "Wavelength of the emitted light (nm)" },
      value: (s, p) => (isSuperposition(s, p) && s.wavelength > 0 ? s.wavelength : null),
      plot: false,
      digits: 0,
    },
  },

  init(params) {
    const count = Number(params.count);
    const o1 = ORBITALS[params.orbital];
    const o2 = params.second === "none" ? null : ORBITALS[params.second];
    const sampler1 = createSampler(o1);
    const sampler2 = o2 ? createSampler(o2) : sampler1;

    // Fit the cloud to the view: 95 % of the probability within VIEW_RADIUS.
    const r95 = Math.max(sampler1.quantile(0.95), sampler2.quantile(0.95));
    const scale = VIEW_RADIUS / r95;

    const pos = new Float32Array(3 * count);
    const psi1re = new Float32Array(count), psi1im = new Float32Array(count);
    const psi2re = new Float32Array(count), psi2im = new Float32Array(count);
    const invQ = new Float32Array(count);
    const rng = createRng(1);
    const p = [0, 0, 0], v = [0, 0];
    for (let i = 0; i < count; i++) {
      // Alternate between the two orbitals: samples the average density q exactly 50/50.
      (i % 2 ? sampler2 : sampler1).sample(rng, p);
      psi(o1, p[0], p[1], p[2], v);
      psi1re[i] = v[0];
      psi1im[i] = v[1];
      if (o2) {
        psi(o2, p[0], p[1], p[2], v);
        psi2re[i] = v[0];
        psi2im[i] = v[1];
      }
      invQ[i] = 1 / (psi1re[i] ** 2 + psi1im[i] ** 2 + psi2re[i] ** 2 + psi2im[i] ** 2 || 1e-30);
      for (let k = 0; k < 3; k++) pos[3 * i + k] = p[k] * scale;
    }

    const dE = o2 ? energy(o2.n) - energy(o1.n) : 0;
    const dipole = o2 ? transitionDipole(o1, o2) : { re: [0, 0, 0], im: [0, 0, 0] };
    // The center of charge moves along Re(dipole), or along Im(dipole) if that is zero.
    const main = norm3(dipole.re) > 0 ? dipole.re : dipole.im;
    const len = norm3(main);
    const axis = len > 0 ? main.map((x) => x / len) : [0, 0, 0];
    const emits = dE !== 0 && len > 0;
    return {
      count, pos, psi1re, psi1im, psi2re, psi2im, invQ, hasSecond: !!o2, fitScale: scale, dE, t: 0,
      dipoleRe: dipole.re, dipoleIm: dipole.im, axis,
      period: dE !== 0 ? ((2 * Math.PI) / Math.abs(dE)) * AU_TIME_FS : 0,
      wavelength: emits ? HC_EV_NM / (Math.abs(dE) * HARTREE_EV) : 0,
    };
  },

  step(s, p, dt) {
    s.t += dt; // the wavefunction is known exactly for every t; only time advances
  },

  setup3d({ THREE, scene }, s) {
    // Positions never change. Physics z (up) becomes Three.js y (up): (x, y, z) → (x, z, −y).
    const positions = new Float32Array(3 * s.count);
    for (let i = 0; i < s.count; i++) {
      positions[3 * i] = s.pos[3 * i];
      positions[3 * i + 1] = s.pos[3 * i + 2];
      positions[3 * i + 2] = -s.pos[3 * i + 1];
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(3 * s.count), 3));
    const material = new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, // overlapping points add up: brightness ~ density
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Coordinate axes: x red, y green, z blue (z points up).
    const L = 1.3 * VIEW_RADIUS;
    const axes = new THREE.BufferGeometry();
    axes.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0, L, 0, 0, 0, 0, 0, 0, 0, -L, 0, 0, 0, 0, L, 0]), 3));
    axes.setAttribute("color", new THREE.BufferAttribute(new Float32Array([0.6, 0.15, 0.15, 0.6, 0.15, 0.15, 0.15, 0.5, 0.15, 0.15, 0.5, 0.15, 0.2, 0.3, 0.7, 0.2, 0.3, 0.7]), 3));
    scene.add(new THREE.LineSegments(axes, new THREE.LineBasicMaterial({ vertexColors: true })));

    // Phase colors: phase 0 (ψ > 0) orange, phase π (ψ < 0) light blue, rainbow in between.
    const lut = new Float32Array(3 * 256);
    const color = new THREE.Color();
    for (let k = 0; k < 256; k++) {
      color.setHSL((0.08 + k / 256) % 1, 0.9, 0.55);
      lut[3 * k] = color.r;
      lut[3 * k + 1] = color.g;
      lut[3 * k + 2] = color.b;
    }
    return { points, lut };
  },

  update3d(view, s, p) {
    // True size: the same scale for every orbital (n = 3 fills the view); otherwise fitted.
    const size = p.trueSize ? VIEW_RADIUS / TRUE_SIZE_RADIUS / s.fitScale : 1;
    view.points.scale.setScalar(size);

    const [c1, c2] = s.hasSecond ? amplitudes(p.mix) : [1, 0];
    // q = (|ψ₁|² + |ψ₂|²) / 2 with two orbitals, |ψ₁|² with one; invQ stores 1 / (|ψ₁|² + |ψ₂|²).
    const qFactor = s.hasSecond ? 2 : 1;
    const c = c2 * Math.cos(s.dE * s.t), sn = c2 * Math.sin(s.dE * s.t);
    const col = view.points.geometry.attributes.color.array;
    // Fewer points → each one brighter; the thin slice shows few points, so brighter too.
    // A shrunken cloud packs the points closer together, so each one is dimmer.
    const gain = (p.slice ? 0.8 : 0.35) * Math.sqrt(50000 / s.count) * Math.min(1, size) ** 1.5;
    const sliceHalfWidth = SLICE_HALF_WIDTH / size;
    for (let i = 0; i < s.count; i++) {
      // c₁ψ₁ + c₂ψ₂ · e^{−iΔE·t}
      const a = s.psi2re[i], b = s.psi2im[i];
      const re = c1 * s.psi1re[i] + a * c + b * sn;
      const im = c1 * s.psi1im[i] + b * c - a * sn;
      let w = qFactor * (re * re + im * im) * s.invQ[i]; // |ψ(t)|² / q, between 0 and 2
      if (p.slice && Math.abs(s.pos[3 * i + 1]) > sliceHalfWidth) w = 0; // keep a thin slab around y = 0
      const k = (((Math.atan2(im, re) / (2 * Math.PI) + 1) * 256) | 0) & 255;
      const f = w * gain;
      col[3 * i] = view.lut[3 * k] * f;
      col[3 * i + 1] = view.lut[3 * k + 1] * f;
      col[3 * i + 2] = view.lut[3 * k + 2] * f;
    }
    view.points.geometry.attributes.color.needsUpdate = true;
  },
};
