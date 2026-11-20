import { t } from "../i18n";
import { el } from "./dom";
import { createLangSwitch } from "./langSwitch";

/** Top bar shared by all pages. `extra` elements are placed before the language switch. */
export function createTopbar(...extra: Node[]): HTMLElement {
  return el(
    "header",
    { class: "topbar" },
    el("a", { class: "topbar__title", href: "#/" }, t("site.title")),
    ...extra,
    createLangSwitch(),
  );
}
