import { PROGRAM_URL } from "../config";
import { onLangChange, t, text } from "../i18n";
import { simulations, type SimEntry } from "../registry";
import { simHref } from "../router";
import { el } from "./dom";
import { createFooter } from "./footer";
import { createTopbar } from "./topbar";

export function tile(sim: SimEntry): HTMLElement {
  const image = sim.thumbnail
    ? el("img", { class: "tile__img", src: sim.thumbnail, alt: "", loading: "lazy" })
    : el("div", { class: "tile__img tile__img--placeholder" });
  const tags = el(
    "div",
    { class: "tile__tags" },
    ...(sim.meta.tags ?? []).map((tag) => el("span", { class: "tag" }, t(`tag.${tag}`))),
  );
  return el(
    "a",
    { class: "tile", href: simHref(sim.id) },
    image,
    el(
      "div",
      { class: "tile__body" },
      el("h2", { class: "tile__title" }, text(sim.meta.title)),
      el("p", { class: "tile__desc" }, text(sim.meta.description)),
      tags,
    ),
  );
}

/** Renders the landing page into `root`. Returns a cleanup function. */
export function mountLanding(root: HTMLElement): () => void {
  const render = () => {
    root.replaceChildren(
      createTopbar(),
      el(
        "main",
        { class: "landing" },
        el(
          "section",
          { class: "hero" },
          el("h1", {}, t("site.title")),
          el("p", { class: "hero__lead" }, t("site.intro")),
          el("p", {}, t("site.whatIsSimtech")),
          el("a", { class: "btn btn--primary", href: PROGRAM_URL, target: "_blank", rel: "noopener" }, t("site.programLink")),
        ),
        el("section", { class: "tiles" }, ...simulations.map(tile)),
      ),
      createFooter(),
    );
  };
  render();
  return onLangChange(render);
}
