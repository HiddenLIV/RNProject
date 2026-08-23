import {
  AudioPlayer,
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import { useEffect } from 'react';

// active 동안 무음 루프를 재생해 오디오 포커스를 계속 점유한다 —
// doNotMix 모드와 함께 다른 앱의 음악·영상이 측정 시작 시 일시정지된다.
// 측정이 끝나면 setIsAudioActiveAsync(false)로 포커스를 반납해 다른 앱에 재개 신호를 보낸다
// (iOS는 notifyOthersOnDeactivation, Android는 abandonAudioFocusRequest로 매핑됨).
export function useAudioFocusHolder(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let holder: AudioPlayer | null = null;
    let cancelled = false;

    // setIsAudioActiveAsync(false)는 이후 재생을 앱 전역에서 차단하므로,
    // 다음 측정을 시작할 땐 재생 전에 반드시 다시 true로 되돌려야 한다.
    // interruptionMode도 함께 doNotMix로 되돌린다 — 휴식 타이머 벨(playBellSoundWithoutFocus)이
    // 재생 직후 800ms 뒤에 원래 모드로 복귀시키는데, 그 찰나에 측정이 시작되는 드문 경우까지
    // 대비해 측정 시작 시점에 항상 스스로 올바른 모드로 맞춘다.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' })
      .then(() => setIsAudioActiveAsync(true))
      .then(() => {
        if (cancelled) return;
        holder = createAudioPlayer(require('../../assets/sounds/silence.wav'));
        holder.loop = true;
        holder.play();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      holder?.release();
      setIsAudioActiveAsync(false);
    };
  }, [active]);
}
