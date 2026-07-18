import * as Speech from 'expo-speech';

function speak(text: string) {
  // 이전 발화가 남아 있으면 끊고 최신 것만 말한다 (1초 간격 발화 밀림 방지)
  Speech.stop();
  Speech.speak(text, { language: 'ko-KR' });
}

export function speakCountdown(remainingSec: number) {
  speak(String(remainingSec));
}

export function speakStart() {
  speak('시작');
}

export function speakSecond(second: number) {
  speak(String(second));
}

export function stopFeedback() {
  Speech.stop();
}
