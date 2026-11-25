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
  let time = 0;
  const stepListeners = new Set<() => void>();
  const resetListeners = new Set<() => void>();

  /** Start over from a new state: simulation time restarts at 0 and listeners are told. */
  function replaceState(newState: unknown) {
    state = newState;
    time = 0;
    view.reset?.(state, values);
    for (const fn of resetListeners) fn();
  }

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
    guard(() => replaceState(newState ?? sim.init(values)));
  }

  const loop = createLoop({
    rate: () => (sim.stepsPerSecond ?? 60) * speed,
    cap: stepCap(sim),
    step(count) {
      guard(() => {
        for (let i = 0; i < count; i++) {
          sim.step(state, values, dt);
          stepCount++;
          time += dt;
          for (const fn of stepListeners) fn();
        }
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
    /** Call `fn` after every simulation step (e.g. to sample metrics in simulation time). Returns an unsubscribe function. */
    onStep(fn: () => void): () => void {
      stepListeners.add(fn);
      return () => stepListeners.delete(fn);
    },
    /** Call `fn` whenever the state is replaced (reset, scenario, button returning a new state). Returns an unsubscribe function. */
    onReset(fn: () => void): () => void {
      resetListeners.add(fn);
      return () => resetListeners.delete(fn);
    },
    /** Simulation time since the state was last replaced (steps × dt). */
    get time() {
      return time;
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
        if (result !== undefined) replaceState(result);
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
