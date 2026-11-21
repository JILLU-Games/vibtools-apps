/**
 * Theme Manager for Dual-Theme System (Dark / Light).
 * Persists user preference in localStorage under 'vib_theme' and
 * applies the attribute [data-theme="dark|light"] to document.documentElement.
 */

const STORAGE_KEY = "vib_theme";
const DEFAULT_THEME = "dark";

/**
 * Returns the currently active theme ('dark' or 'light').
 * @returns {"dark"|"light"}
 */
export function getTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") {
    return saved;
  }
  return DEFAULT_THEME;
}

/**
 * Sets the active theme, updates the DOM, and dispatches a 'themechange' event.
 * @param {"dark"|"light"} theme
 */
export function setTheme(theme) {
  const targetTheme = theme === "light" ? "light" : "dark";
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", targetTheme);
    const themeColor = targetTheme === "light" ? "#ffffff" : "#090b0f";
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement("meta");
      metaTheme.setAttribute("name", "theme-color");
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute("content", themeColor);
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, targetTheme);
    } catch (_) {
      // Handle private browsing or localStorage disabled
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("themechange", { detail: { theme: targetTheme } })
    );
  }
}

/**
 * Toggles between dark and light themes.
 * @returns {"dark"|"light"} The newly applied theme.
 */
export function toggleTheme() {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

/**
 * Initializes the theme on initial application load.
 */
export function initTheme() {
  const initial = getTheme();
  setTheme(initial);
}
