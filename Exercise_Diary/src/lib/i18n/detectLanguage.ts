import * as Localization from 'expo-localization';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, SupportedLanguage } from './types';

// 기기에 설정된 우선순위 언어 목록에서 지원 언어와 처음 일치하는 것을 쓰고,
// 없으면 영어로 폴백한다.
export function detectLanguage(): SupportedLanguage {
  const codes = Localization.getLocales().map((locale) => locale.languageCode);
  return (
    codes.find((code): code is SupportedLanguage =>
      SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
    ) ?? DEFAULT_LANGUAGE
  );
}
