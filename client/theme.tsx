import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const THEME_KEY = 'pb-theme';
const MOTION_KEY = 'pb-reduce-motion';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
};
const initialTheme = (): Theme => {
  const stored = read(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
};

interface ThemeValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  reduceMotion: boolean;
  setReduceMotion: (value: boolean) => void;
}
const ThemeContext = createContext<ThemeValue | null>(null);

/* The two theme-color metas from index.html carry the system defaults. When a
   theme is chosen explicitly both are set to the chosen ground so the browser
   chrome follows the app rather than the OS. */
let metaDefaults: string[] | null = null;
function syncThemeColor(theme: Theme) {
  const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  if (!metas.length) return;
  metaDefaults ??= metas.map((m) => m.content);
  if (theme === 'system') {
    metas.forEach((m, i) => {
      m.content = metaDefaults![i] ?? m.content;
    });
    return;
  }
  const ground = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-ground')
    .trim();
  if (ground) metas.forEach((m) => (m.content = ground));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [reduceMotion, setReduceMotion] = useState(() => read(MOTION_KEY) === 'true');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    write(THEME_KEY, theme);
    syncThemeColor(theme);
  }, [theme]);
  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) root.dataset.reduceMotion = 'true';
    else delete root.dataset.reduceMotion;
    write(MOTION_KEY, String(reduceMotion));
  }, [reduceMotion]);
  const value = useMemo(
    () => ({ theme, setTheme, reduceMotion, setReduceMotion }),
    [theme, reduceMotion],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('ThemeProvider is missing.');
  return value;
}
export function useTheme() {
  const { theme, setTheme } = useThemeContext();
  return [theme, setTheme] as const;
}
export function useReduceMotion() {
  const { reduceMotion, setReduceMotion } = useThemeContext();
  return [reduceMotion, setReduceMotion] as const;
}

/** Stamp the stored choices before the first render. Mirrors the inline boot
    script in index.html for environments whose CSP blocks inline scripts. */
export function bootTheme() {
  const root = document.documentElement;
  const theme = read(THEME_KEY);
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  if (read(MOTION_KEY) === 'true') root.dataset.reduceMotion = 'true';
}
