/**
 * Fullscreen / projector mode for the simulation page: the simulation fills the screen,
 * the explanation text is hidden and the controls float on top.
 *
 * Uses the Fullscreen API where available. Where it isn't (e.g. iPhone Safari), the CSS class
 * alone still maximizes the simulation within the browser window.
 */
import { t } from "../i18n";
import { el } from "./dom";

const CLASS = "is-fullscreen";

export function createFullscreen(target: HTMLElement) {
  let button: HTMLButtonElement | undefined;
  const isOn = () => target.classList.contains(CLASS);
  const updateButton = () => {
    if (button) button.textContent = isOn() ? `✕ ${t("sim.exitFullscreen")}` : `⛶ ${t("sim.fullscreen")}`;
  };

  function set(on: boolean) {
    target.classList.toggle(CLASS, on);
    if (on && target.requestFullscreen && !document.fullscreenElement) {
      target.requestFullscreen().catch(() => {}); // the CSS class still applies
    } else if (!on && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    updateButton();
  }

  // Leaving real fullscreen with Esc or a browser gesture also leaves our mode.
  const onFullscreenChange = () => {
    if (!document.fullscreenElement && isOn()) set(false);
  };
  // Esc for the CSS-only fallback.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOn() && !document.fullscreenElement) set(false);
  };
  document.addEventListener("fullscreenchange", onFullscreenChange);
  window.addEventListener("keydown", onKey);

  return {
    /** A (new) toggle button, e.g. after the controls were rebuilt for another language. */
    button(): HTMLButtonElement {
      button = el("button", { class: "btn" });
      button.addEventListener("click", () => set(!isOn()));
      updateButton();
      return button;
    },
    dispose() {
      if (isOn()) set(false);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKey);
    },
  };
}
