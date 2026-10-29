import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  // 1) Read the saved / system preference once on the client
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    setReady(true);
  }, []);

  // 2) Only touch the <html> class after step 1, otherwise the inline init script's "dark" class
  //    would be removed on first render (the flash of the wrong theme).
  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme, ready]);

  const toggle = () =>
    setTheme((t) => {
      const n = t === "dark" ? "light" : "dark";
      localStorage.setItem("theme", n);
      return n;
    });
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/** Inline script to avoid a flash of the wrong theme. */
export const themeInitScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;