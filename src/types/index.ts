/**
 * The simulation contract.
 *
 * A simulation is a folder in `simulations/` whose `sim.js` or `sim.ts` default-exports
 * an object of type `Simulation2D` or `Simulation3D`. The shell does everything else
 * (animation loop, controls, pointer input, resizing, fullscreen, explanation text).
 *
 * JavaScript simulations get editor support by adding `// @ts-check` and a JSDoc annotation:
 *
 *   /** @type {import('../../src/types').Simulation2D<State>} *\/
 *   export default { ... };
 */
import type { PerspectiveCamera, Scene } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Text } from "../i18n";

export type { Text };

/** Current parameter values, keyed like `params` (buttons have no value). */
export type Values = Record<string, any>;

interface ParamBase {
  label: Text;
  /** If true, changing this parameter restarts the simulation via `init()`. */
  resetOnChange?: boolean;
}

/** Slider. */
export interface RangeParam extends ParamBase {
  type: "range";
  min: number;
  max: number;
  step?: number;
  value: number;
  /** Default on small or touch devices (e.g. a coarser grid). */
  mobileValue?: number;
}

/** Dropdown. `options` is a list of values, or a map value → label. */
export interface SelectParam extends ParamBase {
  type: "select";
  options: (number | string)[] | Record<string, Text>;
  value: number | string;
  mobileValue?: number | string;
}

/** Toggle. */
export interface BooleanParam extends ParamBase {
  type: "boolean";
  value: boolean;
}

/** Button. `action` may modify `state` in place or return a new state. */
export interface ButtonParam<S = any> {
  type: "button";
  label: Text;
  action(state: S, params: Values): S | void;
}

export type Param<S = any> = RangeParam | SelectParam | BooleanParam | ButtonParam<S>;

/** A named scenario, shown in a "Szenario" dropdown. */
export interface Preset<S = any> {
  label: Text;
  /** Parameter values to apply first. */
  params?: Values;
  /**
   * Optional: build a specific initial state for this scenario.
   * Without it, the simulation is reset only if a `resetOnChange` parameter changed.
   */
  state?(params: Values): S;
}

/** A number shown below the simulation, optionally with a small time-series plot. */
export interface Metric<S = any> {
  label: Text;
  /** Must be cheap. Compute expensive values in `step()` and store them on the state. */
  value(state: S, params: Values): number;
  /** Show a sparkline (default true). */
  plot?: boolean;
  /** Decimal places shown (default 3). */
  digits?: number;
}

/** Pointer (mouse, touch, pen) input, already converted to world coordinates (2D). */
export interface PointerInfo {
  type: "down" | "move" | "up";
  x: number;
  y: number;
  /** Bitmask of pressed buttons: 1 = left/touch, 2 = right, 4 = middle. 0 while hovering. */
  buttons: number;
  /** Button that changed: 0 = left/touch, 2 = right. */
  button: number;
  pointerType: "mouse" | "touch" | "pen";
}

/** Passed to `draw()`. The context is already transformed to world coordinates. */
export interface View2D {
  /** World size, same as `world`. */
  width: number;
  height: number;
  /** Screen pixels per world unit (useful for line widths that should look constant). */
  pixelsPerUnit: number;
}

/** What the shell provides to 3D simulations. */
export interface Three3D {
  THREE: typeof import("three");
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
}

interface SimulationBase<S> {
  params?: Record<string, Param<S>>;
  presets?: Record<string, Preset<S>>;
  metrics?: Record<string, Metric<S>>;
  /** Fixed time step passed to `step()` (default 1). */
  dt?: number;
  /** How many steps per real second at speed ×1 (default 60). Independent of the frame rate. */
  stepsPerSecond?: number;
  /** Upper end of the speed slider (default 5, i.e. ×5). */
  maxSpeed?: number;
  /** Safety cap of steps per rendered frame; surplus steps are dropped on slow devices. */
  maxStepsPerFrame?: number;

  /** Create the initial state. */
  init(params: Values): S;
  /** Advance the state by one time step. Pure computation: no DOM, Canvas or WebGL here. */
  step(state: S, params: Values, dt: number): void;
  /** Optional mouse/touch handling. May modify the state. */
  onPointer?(state: S, params: Values, e: PointerInfo): void;
}

export interface Simulation2D<S = any> extends SimulationBase<S> {
  renderer: "2d";
  /** Logical coordinate system. The shell scales it to the canvas (letterboxed, sharp on HiDPI). */
  world: { width: number; height: number };
  /** Draw the state. Origin top-left, y pointing down, units = world units. */
  draw(ctx: CanvasRenderingContext2D, state: S, params: Values, view: View2D): void;
}

export interface Simulation3D<S = any, V = any> extends SimulationBase<S> {
  renderer: "3d";
  camera?: { position: [number, number, number]; target?: [number, number, number] };
  /** Rotate slowly while nobody interacts (nice on the projector). */
  autoRotate?: boolean;
  /** Create the Three.js objects (after every init/reset). Return whatever `update3d` needs. */
  setup3d(three: Three3D, state: S, params: Values): V;
  /** Update the Three.js objects from the state, once per frame. */
  update3d(view: V, state: S, params: Values): void;
}

export type Simulation = Simulation2D | Simulation3D;

/** Topic tags. Names are translated in src/i18n/<lang>.json as `tag.<key>`. */
export type TagKey = "statphys" | "fluids" | "mechanics" | "chaos" | "demo";

/** Contents of `simulations/<id>/meta.json`. */
export interface SimMeta {
  title: Text;
  /** One sentence. */
  description: Text;
  tags?: TagKey[];
  /** Sort key on the landing page (lower first, default 100). */
  order?: number;
}
