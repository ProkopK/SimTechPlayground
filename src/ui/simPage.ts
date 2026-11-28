import { getLang, onLangChange, t, text } from "../i18n";
import { getSimulation, resolveInfoUrl, simulations } from "../registry";
import { createCanvas2D, downloadThumbnail } from "../runner/canvas2d";
import { attachPointer } from "../runner/pointer";
import { createRunner, type Runner, type SimView } from "../runner/runner";
import type { Simulation } from "../types";
import { createControls } from "./controls";
import { el } from "./dom";
import { createFooter } from "./footer";
import { createFullscreen } from "./fullscreen";
import { renderMarkdown } from "./info";
import { tile } from "./landing";
import { createMetrics } from "./metrics";
import { createTopbar } from "./topbar";

/** Renders the page for one simulation into `root`. Returns a cleanup function. */
export function mountSimPage(root: HTMLElement, id: string): () => void {
  const entry = getSimulation(id);
  const back = () =>
    el("a", { class: "btn", href: "#/", "aria-label": t("nav.back") }, "←", el("span", { class: "hide-narrow" }, t("nav.back")));

  if (!entry) {
    const render = () =>
      root.replaceChildren(createTopbar(back()), el("main", {}, el("p", { class: "message" }, t("sim.notFound"))));
    render();
    return onLangChange(render);
  }

  const title = el("h1", { class: "sim-title" });
  const stage = el("div", { class: "sim-stage" }, el("p", { class: "message" }, t("sim.loading")));
  const controlsSlot = el("div");
  const metricsSlot = el("div", { class: "sim-metrics-slot" });
  const side = el("aside", { class: "sim-side" }, title, controlsSlot, metricsSlot);
  const top = el("div", { class: "sim-top" }, stage, side);
  // Below the fold: explanation and related simulations. The heading is static so it
  // peeks out under the simulation right away and shows that scrolling reveals more.
  const infoHeading = el("h2");
  const infoBody = el("div");
  const relatedSlot = el("section", { class: "sim-related" });
  const below = el("div", { class: "sim-below" }, el("section", { class: "sim-info" }, infoHeading, infoBody), relatedSlot);
  const topbarSlot = el("div", { class: "topbar-slot" });
  const footerSlot = el("div");
  const page = el("main", { class: "sim-page" }, top, below);
  root.replaceChildren(topbarSlot, page, footerSlot);
  const fullscreen = createFullscreen(top);

  let runner: Runner | undefined;
  let controls: { dispose(): void } | undefined;
  let metrics: ReturnType<typeof createMetrics> | undefined;
  let disposed = false;

  /** (Re)build everything that shows translated text; the running simulation is kept. */
  function renderTexts() {
    topbarSlot.replaceChildren(createTopbar(back()));
    footerSlot.replaceChildren(createFooter(id));
    // Only the short name before the colon, so the title fits on one line.
    title.textContent = text(entry!.meta.title).split(":")[0];
    document.title = `${text(entry!.meta.title)} · ${t("site.title")}`;
    controls?.dispose();
    if (runner) controls = createControls(controlsSlot, stage, runner, [fullscreen.button()]);
    metrics?.relabel();
    infoHeading.textContent = t("sim.explanation");
    renderInfo();
    renderRelated();
  }

  /** Other simulations sharing a tag with this one; hidden if there are none. */
  function renderRelated() {
    const tags = entry!.meta.tags ?? [];
    const related = simulations.filter((s) => s.id !== id && s.meta.tags?.some((tag) => tags.includes(tag)));
    relatedSlot.hidden = related.length === 0;
    relatedSlot.replaceChildren(el("h2", {}, t("sim.related")), el("div", { class: "tiles" }, ...related.map(tile)));
  }

  let infoRequest = 0;
  async function renderInfo() {
    const request = ++infoRequest; // ignore results of outdated requests (fast language switching)
    try {
      const html = await renderMarkdown(await entry!.loadInfo(getLang()), (href) => resolveInfoUrl(id, href));
      if (request !== infoRequest || disposed) return;
      infoBody.innerHTML = html;
    } catch (error) {
      console.error(error);
    }
  }
  renderTexts();
  const offLang = onLangChange(renderTexts);

  entry
    .loadSim()
    .then(async (sim) => {
      if (disposed) return;
      stage.replaceChildren();
      const started = await start(sim, stage);
      if (disposed) return started.dispose(); // left the page while Three.js was loading
      runner = started;
      metrics = createMetrics(metricsSlot, runner);
      renderTexts();
    })
    .catch((error) => {
      console.error(error);
      stage.replaceChildren(el("p", { class: "message message--error" }, t("sim.loadFailed")));
    });

  const onKey = (e: KeyboardEvent) => {
    // Dev helper for contributors: press T to download a thumbnail of the running simulation.
    if (import.meta.env.DEV && e.key === "t" && !(e.target instanceof HTMLInputElement)) {
      const canvas = stage.querySelector("canvas");
      if (canvas) downloadThumbnail(canvas);
    }
  };
  window.addEventListener("keydown", onKey);

  return () => {
    disposed = true;
    offLang();
    window.removeEventListener("keydown", onKey);
    fullscreen.dispose();
    controls?.dispose();
    metrics?.dispose();
    runner?.dispose();
    document.title = t("site.title");
  };
}

async function start(sim: Simulation, stage: HTMLElement): Promise<Runner> {
  stage.style.setProperty("--world-aspect", sim.renderer === "2d" ? `${sim.world.width} / ${sim.world.height}` : "4 / 3");

  // Crash overlay: shown instead of a frozen or blank simulation.
  const crash = el(
    "div",
    { class: "sim-crash", hidden: "" },
    el("p", {}, t("sim.crashed")),
    el("p", {}, t("sim.crashedHint")),
  );
  const crashReset = el("button", { class: "btn btn--primary" }, t("sim.reset"));
  crash.append(crashReset);
  stage.append(crash);

  if (sim.renderer === "3d") {
    // Three.js and its view module are loaded only for 3D simulations.
    const { createThreeView } = await import("../runner/three");
    const view = await createThreeView(stage, sim);
    return finishRunner(createRunner(sim, view, () => (crash.hidden = false)), crash, crashReset);
  }

  const canvas = createCanvas2D(stage, sim);
  let detachPointer = () => {};
  const view: SimView = {
    render: (state, values) => canvas.render((ctx, v) => sim.draw(ctx, state, values, v)),
    dispose: () => {
      detachPointer();
      canvas.dispose();
    },
  };

  const runner = createRunner(sim, view, () => (crash.hidden = false));
  detachPointer = attachPointer(canvas.canvas, canvas.toWorld, runner.pointer);
  return finishRunner(runner, crash, crashReset);
}

function finishRunner(runner: Runner, crash: HTMLElement, crashReset: HTMLElement): Runner {
  crashReset.addEventListener("click", () => {
    crash.hidden = true;
    runner.reset();
  });

  // Dev-only hooks for automated browser checks.
  if (import.meta.env.DEV) Object.assign(window, { __runner: runner, __simSteps: () => runner.stepCount });
  return runner;
}
