import { AudioPlayer, createAudioPlayer, setIsAudioActiveAsync } from 'expo-audio';
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
    setIsAudioActiveAsync(true).then(() => {
      if (cancelled) return;
      holder = createAudioPlayer(require('../../assets/sounds/silence.wav'));
      holder.loop = true;
      holder.play();
    });

    return () => {
      cancelled = true;
      holder?.release();
      setIsAudioActiveAsync(false);
    };
  }, [active]);
}
