/**
 * Light/dark theme. Without a stored choice the CSS follows `prefers-color-scheme`;
 * the toggle stores an explicit choice and sets `data-theme` on <html>, which overrides it.
 */
import { t } from "../i18n";

type Theme = "light" | "dark";
const STORAGE_KEY = "simtech-theme";

function storedTheme(): Theme | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage may be blocked (private mode, previews); fall back to the system setting.
  }
  return undefined;
}

function currentTheme(): Theme {
  return storedTheme() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

function applyTheme(theme: Theme | undefined): void {
  if (theme) document.documentElement.dataset.theme = theme;
}

/** A small button that switches between light and dark. */
export function createThemeSwitch(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "btn";
  const label = () => {
    const dark = currentTheme() === "dark";
    btn.textContent = dark ? "☀" : "☾";
    btn.title = t(dark ? "theme.light" : "theme.dark");
    btn.setAttribute("aria-label", btn.title);
  };
  label();
  btn.addEventListener("click", () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not critical: the choice just isn't remembered.
    }
    applyTheme(next);
    label();
  });
  return btn;
}

applyTheme(storedTheme());
