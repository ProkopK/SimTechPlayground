import type { Simulation, Values } from "../types";

/** True on small or touch-first devices; simulations may pick lighter defaults there. */
export function isMobileDevice(): boolean {
  return typeof matchMedia === "function" && matchMedia("(max-width: 700px), (pointer: coarse)").matches;
}

/** Initial parameter values from the simulation's `params` (buttons have no value). */
export function defaultValues(sim: Simulation, mobile: boolean): Values {
  const values: Values = {};
  for (const [key, p] of Object.entries(sim.params ?? {})) {
    if (p.type === "button") continue;
    values[key] = mobile && "mobileValue" in p && p.mobileValue !== undefined ? p.mobileValue : p.value;
  }
  return values;
}

/** Steps per frame safety cap (see `Simulation.maxStepsPerFrame`). */
export function stepCap(sim: Simulation): number {
  return sim.maxStepsPerFrame ?? Math.ceil((4 * (sim.stepsPerSecond ?? 60) * (sim.maxSpeed ?? 5)) / 60);
}
