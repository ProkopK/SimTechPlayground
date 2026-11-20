/**
 * Small vector helpers on plain arrays ([x, y] or [x, y, z]).
 * Convenient for setup code; in hot loops, prefer working on typed arrays directly.
 */
export type Vec = number[];

export const add = (a: Vec, b: Vec): Vec => a.map((v, i) => v + b[i]);
export const sub = (a: Vec, b: Vec): Vec => a.map((v, i) => v - b[i]);
export const scale = (a: Vec, s: number): Vec => a.map((v) => v * s);
export const dot = (a: Vec, b: Vec): number => a.reduce((sum, v, i) => sum + v * b[i], 0);
export const length = (a: Vec): number => Math.sqrt(dot(a, a));
export const normalize = (a: Vec): Vec => scale(a, 1 / (length(a) || 1));
export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
