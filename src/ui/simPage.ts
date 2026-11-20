import { onLangChange, t, text } from "../i18n";
import { getSimulation } from "../registry";
import { el } from "./dom";
import { createTopbar } from "./topbar";

/** Renders the page for one simulation into `root`. Returns a cleanup function. */
export function mountSimPage(root: HTMLElement, id: string): () => void {
  const entry = getSimulation(id);
  const render = () => {
    const back = el("a", { class: "btn", href: "#/", "aria-label": t("nav.back") }, "←", el("span", { class: "hide-narrow" }, t("nav.back")));
    const main = entry
      ? el("main", { class: "sim-page" }, el("h1", {}, text(entry.meta.title)))
      : el("main", { class: "sim-page" }, el("p", { class: "message" }, t("sim.notFound")));
    root.replaceChildren(createTopbar(back), main);
  };
  render();
  return onLangChange(render);
}
