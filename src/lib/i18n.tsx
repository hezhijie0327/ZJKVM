/** UI copy dictionaries (i18n): English (i18n/en.ts) is the baseline; other
 *  locales fall back to EN key by key. Adding a locale takes two steps:
 *    1. Create ./i18n/<tag>.ts exporting Record<TKey, string> (Partial is fine)
 *    2. Register it in CATALOGS below
 *  The React side is I18nProvider + useI18n; non-React modules speak through
 *  state/t.ts, whose translator the provider keeps current. */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EN, type TKey } from "@/lib/i18n/en";
import { ZH } from "@/lib/i18n/zh";
import * as storage from "@/lib/storage";
import { setTranslator } from "@/state/t";

/** UI language. */
export type Lang = "en" | "zh";

/** Wordbooks registered by lang tag; missing keys fall back to EN key by key. */
const CATALOGS: Record<Lang, Partial<Record<TKey, string>>> = {
  en: EN,
  zh: ZH,
};

function detectLang(): Lang {
  const saved = storage.getLanguage();
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    storage.setLanguage(next);
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let text: string = CATALOGS[lang][key] ?? EN[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang],
  );

  // Non-React modules (connection manager, recorder) share the same translator
  useEffect(() => {
    setTranslator(t);
  }, [t]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
