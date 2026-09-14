/**
 * The document-level display settings: theme, accent scheme, interface style.
 *
 * All three live as attributes on `<html>` rather than in React state, because
 * CSS selects on them (`[data-theme="dark"]`) and they have to be correct
 * before the first paint — a dark-mode user must never see a white flash.
 * `ThemeScript` sets them from an inline script for exactly that reason.
 *
 * **Why this module exists as well.** `<html>` is rendered by the locale
 * layout, which is a server component and knows nothing about localStorage. So
 * the attributes are only ever added at runtime, and the server's idea of that
 * element has none of them. Navigating between two locales re-renders that
 * layout, React reconciles `<html>` against a version with no `data-theme`,
 * and removes it — which is why switching language used to flip a dark page to
 * light. (Navigating *within* a locale keeps the same layout instance, so the
 * attributes survive; that is why only the language toggle showed the bug.)
 *
 * The values here and the inline script in `ThemeScript` must agree. The test
 * suite asserts they do, rather than trusting two copies of a string.
 */

export const THEME_KEY = "masar.theme";
export const SCHEME_KEY = "masar.scheme";
export const UI_KEY = "masar.ui";

export const THEMES = ["light", "dark"] as const;
export const SCHEMES = ["uae", "gulf", "sand", "royal", "sunset", "teal"] as const;
export const UI_STYLES = ["default", "glass", "minimal"] as const;

export type Theme = (typeof THEMES)[number];
export type Scheme = (typeof SCHEMES)[number];
export type UiStyle = (typeof UI_STYLES)[number];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private windows and blocked site data both throw rather than return null.
    return null;
  }
}

/** The stored theme, or the operating system's preference. */
export function resolveTheme(): Theme {
  const stored = read(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveScheme(): Scheme {
  const stored = read(SCHEME_KEY);
  return (SCHEMES as readonly string[]).includes(stored ?? "")
    ? (stored as Scheme)
    : "uae";
}

export function resolveUiStyle(): UiStyle {
  const stored = read(UI_KEY);
  return (UI_STYLES as readonly string[]).includes(stored ?? "")
    ? (stored as UiStyle)
    : "default";
}

/**
 * Puts all three back on `<html>`.
 *
 * Idempotent and cheap: it writes only when a value actually differs, so
 * calling it on every navigation costs three string comparisons and does not
 * invalidate style unless something really changed.
 */
export function applyDisplaySettings(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const wanted: Record<string, string> = {
    theme: resolveTheme(),
    scheme: resolveScheme(),
    ui: resolveUiStyle(),
  };
  for (const [key, value] of Object.entries(wanted)) {
    if (root.dataset[key] !== value) root.dataset[key] = value;
  }
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be unavailable; the toggle still works for this session.
  }
}
