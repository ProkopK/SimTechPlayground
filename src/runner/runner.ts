/**
 * Drives one simulation: owns its state and parameter values, runs the loop, forwards
 * pointer input, and turns exceptions into a "crashed" status instead of a blank page.
 * Rendering is delegated to a `SimView` (2D canvas or Three.js).
 */
import type { PointerInfo, Simulation, Values } from "../types";
import { createLoop } from "./loop";
import { defaultValues, isMobileDevice, stepCap } from "./values";

export interface SimView {
  /** Called after every init/reset (3D: rebuild the scene objects). */
  reset?(state: unknown, values: Values): void;
  render(state: unknown, values: Values): void;
  dispose(): void;
}

export type Runner = ReturnType<typeof createRunner>;

export function createRunner(sim: Simulation, view: SimView, onCrash: (error: unknown) => void) {
  const values = defaultValues(sim, isMobileDevice());
  const dt = sim.dt ?? 1;
  let state: any;
  let speed = 1;
  let crashed = false;
  let stepCount = 0;

  /** Run simulation code; on an exception, stop and report instead of breaking the page. */
  function guard(fn: () => void) {
    if (crashed) return;
    try {
      fn();
    } catch (error) {
      crashed = true;
      console.error(error);
      onCrash(error);
    }
  }

  function reset(newState?: unknown) {
    crashed = false;
    guard(() => {
      state = newState ?? sim.init(values);
      view.reset?.(state, values);
    });
  }

  const loop = createLoop({
    rate: () => (sim.stepsPerSecond ?? 60) * speed,
    cap: stepCap(sim),
    step(count) {
      guard(() => {
        for (let i = 0; i < count; i++) sim.step(state, values, dt);
        stepCount += count;
      });
    },
    render() {
      guard(() => view.render(state, values));
    },
  });

  reset();
  loop.start();

  return {
    sim,
    /** Live parameter values. Writing to them takes effect immediately. */
    values,
    get paused() {
      return loop.paused;
    },
    set paused(value: boolean) {
      loop.paused = value;
    },
    get speed() {
      return speed;
    },
    set speed(value: number) {
      speed = value;
    },
    /** Total steps run so far (used by the dev frame-rate check). */
    get stepCount() {
      return stepCount;
    },
    reset,
    /** Change a parameter; resets if the parameter is marked `resetOnChange`. */
    setValue(key: string, value: unknown) {
      values[key] = value;
      const param = sim.params?.[key];
      if (param && param.type !== "button" && param.resetOnChange) reset();
    },
    /** Run a button parameter's action. */
    runAction(key: string) {
      const param = sim.params?.[key];
      if (param?.type !== "button") return;
      guard(() => {
        const result = param.action(state, values);
        if (result !== undefined) {
          state = result;
          view.reset?.(state, values);
        }
      });
    },
    /** Apply a preset: its parameter values first, then its state (or a reset if needed). */
    applyPreset(key: string) {
      const preset = sim.presets?.[key];
      if (!preset) return;
      let needsReset = false;
      for (const [k, v] of Object.entries(preset.params ?? {})) {
        const param = sim.params?.[k];
        if (param && param.type !== "button" && param.resetOnChange && values[k] !== v) needsReset = true;
        values[k] = v;
      }
      if (preset.state) {
        crashed = false;
        guard(() => reset(preset.state!(values)));
      } else if (needsReset) reset();
    },
    pointer(info: PointerInfo) {
      if (sim.onPointer) guard(() => sim.onPointer!(state, values, info));
    },
    /** For metrics and other read-only views. */
    get state() {
      return state;
    },
    dispose() {
      loop.dispose();
      view.dispose();
    },
  };
}
