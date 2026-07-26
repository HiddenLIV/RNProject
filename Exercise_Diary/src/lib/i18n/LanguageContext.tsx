import { createContext, ReactNode, useContext, useState } from 'react';
import { detectLanguage } from './detectLanguage';
import en, { Translations } from './locales/en';
import ja from './locales/ja';
import ko from './locales/ko';
import zh from './locales/zh';
import { SupportedLanguage } from './types';

const TRANSLATIONS: Record<SupportedLanguage, Translations> = { ko, en, ja, zh };

const LanguageContext = createContext<SupportedLanguage | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 기기 언어는 앱 실행 중 바뀌지 않는다고 보고 최초 렌더 시 한 번만 감지한다
  // (기기 언어를 바꾸면 앱 재시작 후 반영 — 스펙의 제외 범위).
  const [language] = useState<SupportedLanguage>(detectLanguage);

  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): SupportedLanguage {
  const language = useContext(LanguageContext);
  if (!language) throw new Error('useLanguage must be used within LanguageProvider');
  return language;
}

export function useTranslation(): Translations {
  const language = useLanguage();
  return TRANSLATIONS[language];
}
