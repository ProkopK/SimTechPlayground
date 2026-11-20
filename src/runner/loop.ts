/**
 * Animation loop with a fixed simulation time step that is independent of the frame rate.
 *
 * Each frame, the real elapsed time is converted into a number of due simulation steps
 * (rate = steps per real second). A 30 fps device therefore runs about two steps per frame
 * where a 60 fps device runs one, and both advance at the same simulated speed.
 */

/** Longest real time (s) accounted for in one frame, so hiccups don't cause a burst of steps. */
export const MAX_FRAME_TIME = 0.1;

/**
 * How many steps are due this frame.
 * @param acc     fractional steps carried over from the previous frame
 * @param elapsed real seconds since the previous frame
 * @param rate    steps per real second
 * @param cap     maximum steps per frame; surplus is dropped (the simulation slows down
 *                instead of falling ever further behind on slow devices)
 */
export function stepsDue(acc: number, elapsed: number, rate: number, cap: number): { steps: number; acc: number } {
  acc += Math.min(Math.max(elapsed, 0), MAX_FRAME_TIME) * rate;
  const steps = Math.floor(acc);
  if (steps > cap) return { steps: cap, acc: 0 };
  return { steps, acc: acc - steps };
}

export interface LoopOptions {
  /** Current steps per real second (may change while running, e.g. speed slider). */
  rate(): number;
  cap: number;
  step(count: number): void;
  render(): void;
}

/**
 * Runs `step` and `render` via requestAnimationFrame. While paused, it keeps rendering
 * (so pointer edits stay visible) but runs no steps. Browsers stop requestAnimationFrame in
 * hidden tabs, which pauses the simulation; on return the time gap is ignored.
 */
export function createLoop(opts: LoopOptions) {
  let rafId = 0;
  let last: number | undefined;
  let acc = 0;
  let paused = false;

  const onVisibility = () => {
    last = undefined; // don't count the hidden time
  };
  document.addEventListener("visibilitychange", onVisibility);

  function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    const elapsed = last === undefined ? 0 : (now - last) / 1000;
    last = now;
    if (!paused) {
      const due = stepsDue(acc, elapsed, opts.rate(), opts.cap);
      acc = due.acc;
      if (due.steps > 0) opts.step(due.steps);
    }
    opts.render();
  }

  return {
    start() {
      if (!rafId) rafId = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
      last = undefined;
    },
    get paused() {
      return paused;
    },
    set paused(value: boolean) {
      paused = value;
      acc = 0;
    },
    dispose() {
      this.stop();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
