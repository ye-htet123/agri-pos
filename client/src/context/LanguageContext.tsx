import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '../i18n/translations';
import type { Lang } from '../i18n/translations';

export type { Lang };

const LANG_STORAGE_KEY = 'agri-pos-lang';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** Translate a dot-namespaced key; {token} placeholders are replaced from params. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getInitialLang = (): Lang => {
  if (typeof window === 'undefined') return 'mm';
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'mm' || stored === 'en') return stored;
  } catch {
    /* localStorage unavailable */
  }
  return 'mm';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* ignore persistence errors */
    }
  }, [lang]);

  const setLang = (next: Lang) => setLangState(next);
  const toggleLang = () => setLangState((l) => (l === 'mm' ? 'en' : 'mm'));

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[lang][key] ?? translations.mm[key] ?? key;
    if (params) {
      for (const [token, value] of Object.entries(params)) {
        text = text.replaceAll(`{${token}}`, String(value));
      }
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
