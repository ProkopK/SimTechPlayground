/**
 * Shows a simulation's metrics as numbers with a small time-series plot (sparkline).
 * Samples a few times per second, independent of the frame rate.
 */
import { t, text } from "../i18n";
import type { Runner } from "../runner/runner";
import { el } from "./dom";

const SAMPLE_MS = 100;
const HISTORY = 300; // 30 s at 10 samples per second

export function createMetrics(container: HTMLElement, runner: Runner) {
  const entries = Object.entries(runner.sim.metrics ?? {});
  if (entries.length === 0) return { relabel() {}, dispose() {} };

  const heading = el("h2", {});
  const rows = entries.map(([, metric]) => {
    const label = el("span", { class: "metric__label" });
    const value = el("span", { class: "metric__value" }, "–");
    const canvas = metric.plot === false ? undefined : el("canvas", { class: "metric__plot" });
    const row = el("div", { class: "metric" }, label, value);
    if (canvas) row.append(canvas);
    return { metric, label, value, canvas, history: [] as number[] };
  });
  const root = el("section", { class: "sim-metrics" }, heading, ...rows.map((r) => r.label.parentElement!));
  container.append(root);

  function relabel() {
    heading.textContent = t("sim.metrics");
    for (const r of rows) r.label.textContent = text(r.metric.label);
  }
  relabel();

  function sample() {
    if (runner.paused || runner.state === undefined) return;
    for (const r of rows) {
      let v: number;
      try {
        v = r.metric.value(runner.state, runner.values);
      } catch {
        v = NaN;
      }
      r.value.textContent = Number.isFinite(v) ? v.toFixed(r.metric.digits ?? 3) : "–";
      if (!r.canvas) continue;
      r.history.push(v);
      if (r.history.length > HISTORY) r.history.shift();
      drawSparkline(r.canvas, r.history);
    }
  }
  const timer = setInterval(sample, SAMPLE_MS);
  sample();

  return {
    relabel,
    dispose() {
      clearInterval(timer);
      root.remove();
    },
  };
}

function drawSparkline(canvas: HTMLCanvasElement, values: number[]) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (w === 0 || h === 0) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) return;
  // Minimum span of 1% of the magnitude, so tiny numerical noise doesn't look like a big wave.
  const span = Math.max(1e-9, 0.01 * Math.max(Math.abs(min), Math.abs(max)));
  if (max - min < span) {
    const mid = (min + max) / 2;
    min = mid - span / 2;
    max = mid + span / 2;
  }
  const pad = 2 * dpr;
  ctx.strokeStyle = getComputedStyle(canvas).color;
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const x = (i / (HISTORY - 1)) * w;
    const y = pad + (1 - (v - min) / (max - min)) * (h - 2 * pad);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
