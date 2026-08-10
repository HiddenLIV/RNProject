import { createAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

// active 동안 무음 루프를 재생해 오디오 포커스를 계속 점유한다 —
// doNotMix 모드와 함께 다른 앱의 음악·영상이 측정 시작 시 일시정지되고 측정 내내 재개되지 않는다
export function useAudioFocusHolder(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const holder = createAudioPlayer(require('../../assets/sounds/silence.wav'));
    holder.loop = true;
    holder.play();
    return () => {
      holder.release();
    };
  }, [active]);
}
