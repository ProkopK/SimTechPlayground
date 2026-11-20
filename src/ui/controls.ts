/**
 * Builds the control panel from a simulation's `params` and `presets` using lil-gui:
 * range → slider, select → dropdown, boolean → toggle, button → button.
 */
import GUI from "lil-gui";
import { t, text } from "../i18n";
import type { Runner } from "../runner/runner";
import { el } from "./dom";

export function createControls(container: HTMLElement, runner: Runner, extraButtons: HTMLElement[] = []) {
  const { sim, values } = runner;
  const root = el("div", { class: "sim-controls" });
  container.append(root);

  // Pause/resume and reset as large, always-visible buttons.
  const pauseBtn = el("button", { class: "btn" });
  const resetBtn = el("button", { class: "btn" }, `↺ ${t("sim.reset")}`);
  const updatePause = () => (pauseBtn.textContent = runner.paused ? `▶ ${t("sim.resume")}` : `⏸ ${t("sim.pause")}`);
  pauseBtn.addEventListener("click", () => {
    runner.paused = !runner.paused;
    updatePause();
  });
  resetBtn.addEventListener("click", () => runner.reset());
  updatePause();
  root.append(el("div", { class: "sim-toolbar" }, pauseBtn, resetBtn, ...extraButtons));

  const gui = new GUI({ container: root, title: t("sim.controls") });
  const refresh = () => gui.controllersRecursive().forEach((c) => c.updateDisplay());

  if (sim.presets) {
    const choice = { preset: "" };
    const options: Record<string, string> = { "–": "" };
    for (const [key, preset] of Object.entries(sim.presets)) options[text(preset.label)] = key;
    gui
      .add(choice, "preset", options)
      .name(t("sim.preset"))
      .onChange((key: string) => {
        if (!key) return;
        runner.applyPreset(key);
        refresh();
      });
  }

  for (const [key, param] of Object.entries(sim.params ?? {})) {
    const label = text(param.label);
    switch (param.type) {
      case "range":
        gui
          .add(values, key, param.min, param.max, param.step)
          .name(label)
          .onChange((v: number) => runner.setValue(key, v));
        break;
      case "select": {
        // lil-gui wants { label: value } for labelled options, or a plain array.
        const options = Array.isArray(param.options)
          ? param.options
          : Object.fromEntries(Object.entries(param.options).map(([value, l]) => [text(l), value]));
        gui
          .add(values, key, options)
          .name(label)
          .onChange((v: unknown) => runner.setValue(key, v));
        break;
      }
      case "boolean":
        gui
          .add(values, key)
          .name(label)
          .onChange((v: boolean) => runner.setValue(key, v));
        break;
      case "button":
        gui
          .add({ run: () => (runner.runAction(key), refresh()) }, "run")
          .name(label);
        break;
    }
  }

  const speed = { speed: runner.speed };
  gui
    .add(speed, "speed", 0.1, sim.maxSpeed ?? 5, 0.1)
    .name(`${t("sim.speed")} ×`)
    .onChange((v: number) => (runner.speed = v));

  return {
    dispose() {
      gui.destroy();
      root.remove();
    },
  };
}
