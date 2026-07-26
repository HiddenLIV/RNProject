import * as Speech from 'expo-speech';
import { SPEECH_LOCALE, SupportedLanguage } from './i18n';

function speak(text: string, language: SupportedLanguage) {
  // 이전 발화가 남아 있으면 끊고 최신 것만 말한다 (1초 간격 발화 밀림 방지)
  Speech.stop();
  Speech.speak(text, { language: SPEECH_LOCALE[language] });
}

export function speakCountdown(remainingSec: number, language: SupportedLanguage) {
  speak(String(remainingSec), language);
}

export function speakStart(language: SupportedLanguage, startWord: string) {
  speak(startWord, language);
}

export function speakSecond(second: number, language: SupportedLanguage) {
  speak(String(second), language);
}

export function stopFeedback() {
  Speech.stop();
}
