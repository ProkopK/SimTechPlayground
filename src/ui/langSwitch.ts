import { getLang, setLang, t, LANGS } from "../i18n";

/** A small button that toggles between the available languages. */
export function createLangSwitch(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "btn";
  const next = LANGS[(LANGS.indexOf(getLang()) + 1) % LANGS.length];
  btn.textContent = next.toUpperCase();
  btn.title = `${t("nav.language")}: ${t(`lang.${next}`)}`;
  btn.setAttribute("aria-label", btn.title);
  btn.addEventListener("click", () => setLang(next));
  return btn;
}
