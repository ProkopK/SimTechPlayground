/**
 * Seedable pseudo-random number generator (mulberry32): fast, small, good enough for
 * simulations. Same seed → same sequence, which makes runs reproducible.
 *
 *   const rng = createRng(42);
 *   rng.next();        // float in [0, 1)
 *   rng.int(10);       // integer in 0..9
 *   rng.range(-1, 1);  // float in [-1, 1)
 *   rng.normal();      // standard normal distribution (mean 0, std 1)
 */
export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    range: (min: number, max: number) => min + (max - min) * next(),
    /** Box–Muller transform. */
    normal: () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()),
  };
}

export type Rng = ReturnType<typeof createRng>;
