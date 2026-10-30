/** Light/dark theme: class strategy (html.dark), preference stored in
 *  localStorage, auto follows the system. Family module kept in sync with
 *  zjblog's lib/theme.ts (same storage key, same stand-down window). */

export type ThemeStyle = "auto" | "light" | "dark";

const STORAGE_KEY = "zj-theme";

export const THEME_COLOR_LIGHT = "#faf9f6";
export const THEME_COLOR_DARK = "#1b1a18";

function syncThemeColorMeta(dark: boolean): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  const primary = metas.item(0);
  if (!primary) {
    return;
  }
  primary.removeAttribute("media");
  primary.setAttribute("content", dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
  metas.forEach((meta, index) => {
    if (index > 0) {
      meta.remove();
    }
  });
}

export function readThemeStyle(): ThemeStyle {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") {
      return value;
    }
  } catch {
    // localStorage unavailable (private mode etc.) — treat as auto
  }
  return "auto";
}

let paletteAnimTimer: number | undefined;

/** Persist a theme choice and apply it immediately. */
export function setThemeStyle(style: ThemeStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // storage unavailable — still apply for this session
  }
  applyThemeStyle(style);
}

export function applyThemeStyle(style: ThemeStyle) {
  const dark = style === "dark" || (style === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  const changing = root.classList.contains("dark") !== dark;
  if (changing && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("zjs-palette-anim");
    window.clearTimeout(paletteAnimTimer);
    paletteAnimTimer = window.setTimeout(() => root.classList.remove("zjs-palette-anim"), 350);
  }
  root.classList.toggle("dark", dark);
  root.setAttribute("data-theme-mode", style);
  syncThemeColorMeta(dark);
}

export function watchSystemTheme() {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readThemeStyle() === "auto") {
      applyThemeStyle("auto");
    }
  });
}

/** Cycle auto → light → dark → auto */
export function nextThemeStyle(style: ThemeStyle): ThemeStyle {
  const NEXT: Record<ThemeStyle, ThemeStyle> = { auto: "light", light: "dark", dark: "auto" };
  return NEXT[style];
}
