import { SupportedLanguage } from './types';

// expo-speech(TTS)에 넘길 언어 코드 — 숫자 읽기는 이 코드만 바꾸면 해당 언어 발음으로 읽힌다.
export const SPEECH_LOCALE: Record<SupportedLanguage, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
};
