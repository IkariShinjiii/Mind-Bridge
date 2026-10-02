import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "mindbridge_theme";

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

// One shared value, so the toggle in Settings and the `data-theme` on the layout always agree.
let current: Theme = readTheme();
const listeners = new Set<() => void>();

function setThemeValue(next: Theme) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* private mode: theme just will not persist */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Light/dark theme, remembered in localStorage when available. Returns `[theme, toggle, setTheme]`. */
export function useTheme(): [Theme, () => void, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, () => current);
  const toggle = useCallback(() => setThemeValue(current === "dark" ? "light" : "dark"), []);
  return [theme, toggle, setThemeValue];
}
