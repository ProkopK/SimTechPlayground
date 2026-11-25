/**
 * Shows a simulation's metrics below the controls. Three kinds (see src/types):
 * - value: a number with a small time-series plot (sparkline)
 * - lines: several numbers plotted over time in one chart, with a legend
 * - distribution: a chart over some other quantity than time (e.g. a histogram), redrawn live
 * Time plots show the last WINDOW_S seconds at speed ×1, measured in simulation time: a faster
 * speed scrolls faster but doesn't squeeze the curve. Points are stored at fixed simulation time
 * intervals; the line always ends at the current value, and the plots are redrawn every frame,
 * so they move smoothly even at a very low speed.
 */
import { t, text, type Text } from "../i18n";
import type { Runner } from "../runner/runner";
import type { DistributionLine, DistributionMetric, LinesMetric, Metric, ValueMetric } from "../types";
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
  const rows = entries.map(([, metric]) => createRow(metric, runner, window));
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

function createRow(metric: Metric, runner: Runner, window: number): Row {
  if (metric.type === "distribution") return distributionRow(metric, runner);
  return timeRow(metric, runner, window);
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

/** Legend: color swatch, label and (optionally) the current value of each line. */
function createLegend(labels: Text[], outputs?: HTMLElement[]) {
  const labelEls = labels.map(() => el("span", { class: "metric__label" }));
  const items = labelEls.map((labelEl, k) => {
    const item = el("li", {}, el("span", { class: "metric__swatch", style: `background: var(${lineColor(k)})` }), labelEl);
    if (outputs) item.append(outputs[k]);
    return item;
  });
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

  const unit = runner.sim.timeUnit;
  const timeAxis = { name: unit ? `t in ${unit.unit}` : "t", scale: unit?.scale ?? 1 };
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
      drawTimePlot(canvas, times, histories, now, lines.map((_, k) => read(k)), end - window, end, timeAxis);
    },
  };
}

/** A chart over a quantity other than time. */
function distributionRow(metric: DistributionMetric, runner: Runner): Row {
  const label = el("span", { class: "metric__label" });
  const lines = Object.values(metric.lines);
  const canvas = el("canvas", { class: "metric__plot" });
  // A single line needs no legend: the chart's label says what it is.
  const legend = lines.length > 1 ? createLegend(lines.map((line) => line.label)) : undefined;
  const root = el("div", { class: "metric metric--plot" }, label, canvas);
  if (legend) root.append(legend.list);

  return {
    root,
    relabel() {
      setLabel(label, metric.label);
      legend?.relabel();
    },
    display() {},
    draw() {
      const range = safe(() => metric.range(runner.state, runner.values), [NaN, NaN] as [number, number]);
      const data = lines.map((line) => safe(() => line.values(runner.state, runner.values), null));
      const xName = metric.xLabel === undefined ? "" : text(metric.xLabel);
      drawDistribution(canvas, range, xName, data, lines);
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
function yRange(data: (ArrayLike<number | null> | null)[], fromZero: boolean): [number, number] | null {
  let min = fromZero ? 0 : Infinity;
  let max = fromZero ? 0 : -Infinity;
  for (const values of data) {
    if (!values) continue;
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
    if (fromZero) max = min + span;
    else {
      const mid = (min + max) / 2;
      min = mid - span / 2;
      max = mid + span / 2;
    }
  }
  return [min, max];
}

/** Tick positions at 1, 2 or 5 × 10^k: about `count` of them within [min, max], but at least 2. */
function niceTicks(min: number, max: number, count: number) {
  const raw = (max - min) / Math.max(1, count);
  let decade = 10 ** Math.floor(Math.log10(raw));
  let factor = [1, 2, 5, 10].find((f) => f * decade >= raw) ?? 10;
  const list = (step: number) => {
    const ticks: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return ticks;
  };
  let ticks = list(factor * decade);
  while (ticks.length < 2) {
    // Next smaller nice step: 10 → 5 → 2 → 1 → 0.5 …
    if (factor === 1) [factor, decade] = [5, decade / 10];
    else factor = factor === 10 ? 5 : factor === 5 ? 2 : 1;
    ticks = list(factor * decade);
  }
  const step = factor * decade;
  // Enough decimals to tell neighboring ticks apart; exponent notation for extreme magnitudes.
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const big = Math.max(Math.abs(min), Math.abs(max)) >= 1e6;
  const format = (v: number) => (big || decimals > 5 ? v.toExponential(1) : v.toFixed(decimals));
  return { ticks, format };
}

/**
 * Draws grid lines, tick labels and the x axis name, and returns the mapping from data to
 * canvas pixels of the plot area. Afterwards drawing is clipped to the plot area; the caller
 * must call ctx.restore().
 */
function drawAxes(
  c: NonNullable<ReturnType<typeof prepare>>,
  [x0, x1]: [number, number],
  [y0, y1]: [number, number],
  xName: string,
) {
  const { ctx, w, h, dpr, style } = c;
  const fontSize = 10 * dpr;
  ctx.font = `${fontSize}px ${style.fontFamily}`;
  const gap = 3 * dpr;
  const top = fontSize / 2 + gap;
  const bottom = h - fontSize - 2 * gap;

  const y = niceTicks(y0, y1, Math.floor((bottom - top) / (fontSize * 2.5)));
  const yLabels = y.ticks.map(y.format);
  const left = Math.max(...yLabels.map((s) => ctx.measureText(s).width)) + 2 * gap;
  const right = w - gap;
  const toX = (v: number) => left + ((v - x0) / (x1 - x0)) * (right - left);
  const toY = (v: number) => bottom - ((v - y0) / (y1 - y0)) * (bottom - top);
  const x = niceTicks(x0, x1, Math.floor((right - left) / (60 * dpr)));

  // Grid lines
  ctx.strokeStyle = style.getPropertyValue("--color-border");
  ctx.lineWidth = dpr;
  ctx.beginPath();
  for (const v of y.ticks) {
    ctx.moveTo(left, Math.round(toY(v)) + 0.5);
    ctx.lineTo(right, Math.round(toY(v)) + 0.5);
  }
  for (const v of x.ticks) {
    ctx.moveTo(Math.round(toX(v)) + 0.5, top);
    ctx.lineTo(Math.round(toX(v)) + 0.5, bottom);
  }
  ctx.stroke();

  // Labels: y on the left; x below, with the axis name at the right end. Labels that would
  // overlap the name or the previous label are left out.
  ctx.fillStyle = style.getPropertyValue("--color-text-muted");
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  y.ticks.forEach((v, i) => ctx.fillText(yLabels[i], left - gap, toY(v)));
  ctx.textBaseline = "top";
  const labelY = bottom + gap;
  ctx.fillText(xName, right, labelY);
  let free = left - ctx.measureText(x.format(x.ticks[0] ?? 0)).width; // leftmost allowed position
  const limit = right - ctx.measureText(xName).width - 2 * gap;
  ctx.textAlign = "left";
  for (const v of x.ticks) {
    const s = x.format(v);
    const width = ctx.measureText(s).width;
    const start = Math.max(0, toX(v) - width / 2);
    if (start < free || start + width > limit) continue;
    ctx.fillText(s, start, labelY);
    free = start + width + 2 * gap;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  return { toX, toY };
}

/**
 * Stored points (times, histories) plus the current values at time `now` as the line's end,
 * on a time axis from t0 to t1 (simulation time; labelled as t × scale).
 */
function drawTimePlot(
  canvas: HTMLCanvasElement,
  times: number[],
  histories: (number | null)[][],
  now: number,
  current: (number | null)[],
  t0: number,
  t1: number,
  axis: { name: string; scale: number },
) {
  const c = prepare(canvas);
  const range = c && yRange([...histories, current], false);
  if (!c || !range) return;
  const { ctx, dpr, style } = c;
  const { toX: toAxisX, toY } = drawAxes(c, [t0 * axis.scale, t1 * axis.scale], range, axis.name);
  const toX = (t: number) => toAxisX(t * axis.scale);
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
  ctx.restore();
}

function drawDistribution(
  canvas: HTMLCanvasElement,
  [x0, x1]: [number, number],
  xName: string,
  data: (ArrayLike<number> | null)[],
  lines: DistributionLine[],
) {
  const c = prepare(canvas);
  const range = c && Number.isFinite(x0) && Number.isFinite(x1) && x0 < x1 ? yRange(data, true) : null;
  if (!c || !range) return;
  const { ctx, dpr, style } = c;
  const { toX, toY } = drawAxes(c, [x0, x1], range, xName);
  const base = toY(Math.max(range[0], 0));
  ctx.lineWidth = 1.5 * dpr;
  data.forEach((values, k) => {
    if (!values || values.length === 0) return;
    const n = values.length;
    const color = style.getPropertyValue(lineColor(k));
    if (lines[k].style === "bars") {
      // n bins splitting [x0, x1].
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      const binWidth = (toX(x1) - toX(x0)) / n;
      const gap = Math.min(dpr, binWidth / 4);
      for (let i = 0; i < n; i++) {
        const v = values[i];
        if (!Number.isFinite(v)) continue;
        const y = toY(v);
        ctx.fillRect(toX(x0) + i * binWidth + gap / 2, Math.min(y, base), binWidth - gap, Math.abs(base - y));
      }
      ctx.globalAlpha = 1;
    } else {
      // n points evenly spaced from x0 to x1.
      ctx.strokeStyle = color;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const v = values[i];
        if (!Number.isFinite(v)) continue;
        const x = toX(n > 1 ? x0 + (i / (n - 1)) * (x1 - x0) : (x0 + x1) / 2);
        if (started) ctx.lineTo(x, toY(v));
        else ctx.moveTo(x, toY(v));
        started = true;
      }
      ctx.stroke();
    }
  });
  ctx.restore();
}
