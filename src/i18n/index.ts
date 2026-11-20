/**
 * Minimal i18n: German is the default and the fallback for everything.
 * A missing translation never throws; it falls back to German, then to the key.
 */
import de from "./de.json";
import en from "./en.json";

export type Lang = "de" | "en";
export const LANGS: Lang[] = ["de", "en"];

/** User-facing text: a plain string (language-neutral) or one string per language. German is required. */
export type Text = string | { de: string; en?: string };

const dictionaries: Record<Lang, Record<string, string>> = { de, en };
const STORAGE_KEY = "simtech-lang";

let current: Lang = detectLang();
const listeners = new Set<() => void>();

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    // Storage may be blocked (private mode, previews); fall through.
  }
  // Only switch to English if the browser clearly prefers it over German.
  for (const l of navigator.languages ?? []) {
    if (l.startsWith("de")) return "de";
    if (l.startsWith("en")) return "en";
  }
  return "de";
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not critical: the choice just isn't remembered.
  }
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

/** Register a callback for language changes. Returns an unsubscribe function. */
export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a UI string key from src/i18n/<lang>.json. */
export function t(key: string): string {
  return dictionaries[current][key] ?? dictionaries.de[key] ?? key;
}

/** Resolve a multilingual Text value for the current language. */
export function text(value: Text | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[current] ?? value.de ?? "";
}

document.documentElement.lang = current;
