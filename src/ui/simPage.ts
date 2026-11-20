import { onLangChange, t, text } from "../i18n";
import { getSimulation } from "../registry";
import { createCanvas2D, downloadThumbnail } from "../runner/canvas2d";
import { createRunner, type Runner, type SimView } from "../runner/runner";
import type { Simulation } from "../types";
import { el } from "./dom";
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
  const side = el("aside", { class: "sim-side" }, title);
  const topbarSlot = el("div", { class: "topbar-slot" });
  root.replaceChildren(topbarSlot, el("main", { class: "sim-page" }, stage, side));

  let runner: Runner | undefined;
  let disposed = false;

  function renderTexts() {
    topbarSlot.replaceChildren(createTopbar(back()));
    title.textContent = text(entry!.meta.title);
    document.title = `${text(entry!.meta.title)} · ${t("site.title")}`;
  }
  renderTexts();
  const offLang = onLangChange(renderTexts);

  entry.loadSim().then(
    (sim) => {
      if (disposed) return;
      stage.replaceChildren();
      runner = start(sim, stage);
    },
    (error) => {
      console.error(error);
      stage.replaceChildren(el("p", { class: "message message--error" }, t("sim.loadFailed")));
    },
  );

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
    runner?.dispose();
    document.title = t("site.title");
  };
}

function start(sim: Simulation, stage: HTMLElement): Runner {
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

  if (sim.renderer !== "2d") throw new Error("3D simulations are not supported yet");
  const canvas = createCanvas2D(stage, sim);
  const view: SimView = {
    render: (state, values) => canvas.render((ctx, v) => sim.draw(ctx, state, values, v)),
    dispose: () => canvas.dispose(),
  };

  const runner = createRunner(sim, view, () => (crash.hidden = false));
  crashReset.addEventListener("click", () => {
    crash.hidden = true;
    runner.reset();
  });

  if (import.meta.env.DEV) (window as any).__simSteps = () => runner.stepCount;
  return runner;
}
