import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { stopFeedback } from './feedback';

// 측정 화면의 벨 소리 재생을 담당한다. 음성 안내(TTS)는 lib/feedback이 별도로 맡고,
// 여기서는 그걸 함께 멈추는 stopAllSound만 노출해 화면 쪽에서 한 번에 정지한다.
// (측정 중 오디오 포커스를 점유하는 무음 루프는 useAudioFocusHolder가 따로 맡는다 —
// 이 훅은 isMeasuring 여부와 무관하게 언제든 먼저 호출할 수 있어야 useHangTimer의
// onMeasureSecond 콜백에 playBellSound를 안전하게 넘길 수 있다.)
export function useTimerAudio() {
  // 공유 플레이어를 pause/seek로 재사용하면 안드로이드(삼성)에서 첫 재생의
  // AudioTrack이 열리지 않아 무음이 되는 문제가 있다(logcat으로 확인).
  // 벨마다 새 플레이어를 만들어 재생하고 이전 것은 해제한다.
  const bellRef = useRef<AudioPlayer | null>(null);

  const releaseBell = () => {
    bellRef.current?.release();
    bellRef.current = null;
  };

  const playBellSound = () => {
    releaseBell();
    const player = createAudioPlayer(require('../../assets/sounds/bell.wav'));
    bellRef.current = player;
    player.play();
  };

  const stopAllSound = () => {
    stopFeedback();
    releaseBell();
  };

  // 화면 이탈(홈·기록 탭 이동) 시 진행 중이던 음성·벨을 즉시 중단한다
  useEffect(() => stopAllSound, []);

  return { playBellSound, stopAllSound };
}
