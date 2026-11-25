import { t } from "../i18n";
import { el } from "./dom";
import { createLangSwitch } from "./langSwitch";
import { createThemeSwitch } from "./theme";

/** Top bar shared by all pages. `extra` elements are placed before the theme and language switches. */
export function createTopbar(...extra: Node[]): HTMLElement {
  return el(
    "header",
    { class: "topbar" },
    el("a", { class: "topbar__title", href: "#/" }, t("site.title")),
    ...extra,
    createThemeSwitch(),
    createLangSwitch(),
  );
}
