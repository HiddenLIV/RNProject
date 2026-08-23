import {
  AudioPlayer,
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
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
  // playBellSoundWithoutFocus가 예약한 "원래 모드로 복귀" 타이머 — 화면을 벗어나 훅이 정리될
  // 때 이 타이머가 남아있으면 stopAllSound에서 함께 취소한다.
  const restoreModeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // await 두 번(setIsAudioActiveAsync/setAudioModeAsync)을 거치는 동안 화면을 벗어날 수 있어,
  // 그 사이 언마운트됐으면 재생을 포기하도록 표시해 둔다.
  const unmountedRef = useRef(false);

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

  // interruptionMode를 'mixWithOthers'로 남겨둔 채 화면을 벗어나면 그 뒤로 앱 전역에서 다른 앱
  // 음악을 계속 안 건드리게 돼 버리므로, 타이머를 취소할 땐 반드시 즉시 원래 모드로 되돌린다.
  const restoreInterruptionMode = () => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => {});
  };

  const stopAllSound = () => {
    stopFeedback();
    releaseBell();
    if (restoreModeTimeoutRef.current != null) {
      clearTimeout(restoreModeTimeoutRef.current);
      restoreModeTimeoutRef.current = null;
      restoreInterruptionMode();
    }
  };

  // 세트 간 휴식 타이머처럼 오디오 포커스를 계속 쥐고 있지 않는 화면에서 짧게 알림음만 낼 때 쓴다.
  // 다른 화면(TimerScreen)이 측정을 마치며 setIsAudioActiveAsync(false)로 재생을 앱 전역에서
  // 잠가 놨을 수 있어 먼저 풀고, 다른 앱 음악을 붙잡지 않도록(포커스를 요청하지 않도록)
  // interruptionMode를 벨이 나는 동안만 'mixWithOthers'로 바꿨다가 되돌린다. 두 설정 모두 네이티브
  // 쪽에 실제로 반영된 뒤에 재생해야 하므로 await로 순서를 보장한다.
  // (bell.wav 길이는 0.45초 — 800ms면 재생이 끝나고도 여유 있게 원래 모드로 복귀한다.)
  const playBellSoundWithoutFocus = async () => {
    try {
      await setIsAudioActiveAsync(true);
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    } catch {
      return;
    }
    if (unmountedRef.current) {
      // 재생 전에 화면을 벗어났다 — 소리는 포기하고, 바꿔둔 모드만 되돌린다.
      restoreInterruptionMode();
      return;
    }
    playBellSound();
    if (restoreModeTimeoutRef.current != null) clearTimeout(restoreModeTimeoutRef.current);
    restoreModeTimeoutRef.current = setTimeout(() => {
      restoreModeTimeoutRef.current = null;
      restoreInterruptionMode();
    }, 800);
  };

  // 화면 이탈(홈·기록 탭 이동) 시 진행 중이던 음성·벨을 즉시 중단한다
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      stopAllSound();
    };
  }, []);

  return { playBellSound, playBellSoundWithoutFocus, stopAllSound };
}
