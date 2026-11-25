/**
 * Shows a simulation's metrics below the controls. Two kinds (see src/types):
 * - value: a number with a small time-series plot (sparkline)
 * - lines: several numbers plotted over time in one chart, with a legend
 * Time plots show the last WINDOW_S seconds at speed ×1, measured in simulation time: a faster
 * speed scrolls faster but doesn't squeeze the curve. Points are stored at fixed simulation time
 * intervals; the line always ends at the current value, and the plots are redrawn every frame,
 * so they move smoothly even at a very low speed.
 */
import { t, text, type Text } from "../i18n";
import type { Runner } from "../runner/runner";
import type { LinesMetric, ValueMetric } from "../types";
import { el } from "./dom";

const WINDOW_S = 30; // time shown in a time plot, in real seconds at speed ×1
const SAMPLES = 300; // stored points per window
const DISPLAY_MS = 100; // how often the numbers are updated (plots: every frame)
const LINE_COLORS = 4; // --chart-1 … --chart-4 in main.css, reused cyclically

interface Row {
  root: HTMLElement;
  relabel(): void;
  /** Record a plot point at simulation time t (time plots only). */
  sample?(t: number): void;
  /** Forget the recorded plot points (after a reset). */
  clear?(): void;
  /** Update the numbers. */
  display(): void;
  /** Redraw the chart. */
  draw(): void;
}

export function createMetrics(container: HTMLElement, runner: Runner) {
  const entries = Object.entries(runner.sim.metrics ?? {});
  if (entries.length === 0) return { relabel() {}, dispose() {} };

  const heading = el("h2", {});
  // Simulation time shown at once, and between two stored points.
  const window = WINDOW_S * (runner.sim.stepsPerSecond ?? 60) * (runner.sim.dt ?? 1);
  const interval = window / SAMPLES;
  const rows = entries.map(([, metric]) => timeRow(metric, runner, window));
  const root = el("section", { class: "sim-metrics" }, heading, ...rows.map((r) => r.root));
  container.append(root);

  function relabel() {
    heading.textContent = t("sim.metrics");
    for (const r of rows) r.relabel();
  }
  relabel();

  // Store a plot point every `interval` of simulation time.
  let nextSample = 0;
  const offStep = runner.onStep(() => {
    const t = runner.time;
    if (t < nextSample - 1e-9 * interval) return;
    nextSample = Math.max(nextSample + interval, t);
    for (const r of rows) r.sample?.(t);
  });
  // After a reset the plots start empty at the left again.
  const offReset = runner.onReset(() => {
    nextSample = 0;
    for (const r of rows) r.clear?.();
  });

  function display() {
    if (runner.state === undefined) return;
    for (const r of rows) r.display();
  }
  const timer = setInterval(display, DISPLAY_MS);
  display();

  // Plots: every frame, also while paused (they change size when the panel layout changes).
  let frame = 0;
  const drawAll = () => {
    frame = requestAnimationFrame(drawAll);
    if (runner.state !== undefined) for (const r of rows) r.draw();
  };
  drawAll();

  return {
    relabel,
    dispose() {
      clearInterval(timer);
      cancelAnimationFrame(frame);
      offStep();
      offReset();
      root.remove();
    },
  };
}

/** Call simulation code; an exception shows up as NaN ("–") instead of breaking the panel. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const format = (v: number | null, digits = 3) => (v !== null && Number.isFinite(v) ? v.toFixed(digits) : "–"); // null = not applicable

/** Set a label's text; "E_kin" or "E_{kin}" shows "kin" as a subscript. */
function setLabel(node: HTMLElement, label: Text) {
  const parts = text(label).split(/_\{([^}]*)\}|_([\p{L}\p{N}]+)/u);
  // split() with capture groups: [text, group1, group2, text, group1, group2, …]
  node.replaceChildren();
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) node.append(parts[i]);
    const sub = parts[i + 1] ?? parts[i + 2];
    if (sub) node.append(el("sub", {}, sub));
  }
}

/** CSS variable holding the color of line k. */
const lineColor = (k: number) => `--chart-${(k % LINE_COLORS) + 1}`;

/** Legend: color swatch, label and current value of each line. */
function createLegend(labels: Text[], outputs: HTMLElement[]) {
  const labelEls = labels.map(() => el("span", { class: "metric__label" }));
  const items = labelEls.map((labelEl, k) =>
    el("li", {}, el("span", { class: "metric__swatch", style: `background: var(${lineColor(k)})` }), labelEl, outputs[k]),
  );
  return {
    list: el("ul", { class: "metric__legend" }, ...items),
    relabel: () => labelEls.forEach((labelEl, k) => setLabel(labelEl, labels[k])),
  };
}

/** A single value with an optional sparkline, or several values over time in one chart. */
function timeRow(metric: ValueMetric | LinesMetric, runner: Runner, window: number): Row {
  const label = el("span", { class: "metric__label" });
  const lines = metric.type === "lines" ? Object.values(metric.lines) : [metric];
  const outputs = lines.map(() => el("span", { class: "metric__value" }, "–"));
  // Stored points: a common list of times and one list of values per line.
  const times: number[] = [];
  const histories = lines.map(() => [] as (number | null)[]);
  const read = (k: number) => safe(() => lines[k].value(runner.state, runner.values), NaN);

  const plot = metric.type === "lines" || metric.plot !== false;
  const canvas = plot ? el("canvas", { class: "metric__plot" }) : undefined;
  let legend: ReturnType<typeof createLegend> | undefined;
  let root: HTMLElement;
  if (metric.type === "lines") {
    legend = createLegend(
      Object.values(metric.lines).map((line) => line.label),
      outputs,
    );
    root = el("div", { class: "metric metric--plot" }, label, canvas!, legend.list);
  } else {
    root = el("div", { class: plot ? "metric metric--plot" : "metric" }, label, outputs[0]);
    if (canvas) root.append(canvas);
  }

  return {
    root,
    relabel() {
      setLabel(label, metric.label);
      legend?.relabel();
    },
    sample: canvas
      ? (t) => {
          times.push(t);
          histories.forEach((history, k) => history.push(read(k)));
          // Drop points that scrolled out, but keep one left of the window so the line reaches the edge.
          while (times.length > 2 && times[1] < t - window) {
            times.shift();
            for (const history of histories) history.shift();
          }
        }
      : undefined,
    clear() {
      times.length = 0;
      for (const history of histories) history.length = 0;
    },
    display() {
      outputs.forEach((output, k) => (output.textContent = format(read(k), metric.digits)));
    },
    draw() {
      if (!canvas) return;
      const now = runner.time;
      // Before the window is full, time runs from 0 at the left edge; then the plot scrolls.
      const end = Math.max(now, window);
      drawTimePlot(canvas, times, histories, now, lines.map((_, k) => read(k)), end - window, end);
    },
  };
}

/** Match the canvas' pixel size to its CSS size (sharp on HiDPI). Returns null if hidden. */
function prepare(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (w === 0 || h === 0) return null;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h, dpr, style: getComputedStyle(canvas) };
}

/** Common y range of all data; null if there is no finite value. */
function yRange(data: (number | null)[][]): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const values of data) {
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v === null || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) return null;
  // Minimum span of 1% of the magnitude, so tiny numerical noise doesn't look like a big wave.
  const span = Math.max(1e-9, 0.01 * Math.max(Math.abs(min), Math.abs(max)));
  if (max - min < span) {
    const mid = (min + max) / 2;
    min = mid - span / 2;
    max = mid + span / 2;
  }
  return [min, max];
}

/**
 * Stored points (times, histories) plus the current values at time `now` as the line's end,
 * on an x axis from t0 to t1.
 */
function drawTimePlot(
  canvas: HTMLCanvasElement,
  times: number[],
  histories: (number | null)[][],
  now: number,
  current: (number | null)[],
  t0: number,
  t1: number,
) {
  const c = prepare(canvas);
  const range = c && yRange([...histories, current]);
  if (!c || !range) return;
  const { ctx, w, h, dpr, style } = c;
  const [min, max] = range;
  const pad = 2 * dpr;
  const toX = (t: number) => ((t - t0) / (t1 - t0)) * w;
  const toY = (v: number) => pad + (1 - (v - min) / (max - min)) * (h - 2 * pad);
  ctx.lineWidth = 1.5 * dpr;
  histories.forEach((history, k) => {
    ctx.strokeStyle = style.getPropertyValue(lineColor(k));
    ctx.beginPath();
    let started = false; // null (not applicable) or NaN leaves a gap
    const point = (t: number, v: number | null) => {
      if (v === null || !Number.isFinite(v)) return void (started = false);
      if (started) ctx.lineTo(toX(t), toY(v));
      else ctx.moveTo(toX(t), toY(v));
      started = true;
    };
    history.forEach((v, i) => point(times[i], v));
    if (times.length === 0 || now > times[times.length - 1]) point(now, current[k]);
    ctx.stroke();
  });
}
