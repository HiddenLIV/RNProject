import {
  AudioPlayer,
  AudioSource,
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';
import { useEffect, useRef } from 'react';

import { withMaxVolume } from './alarmVolume';
import { stopFeedback } from './feedback';
import { AlarmVolumeMode } from './types';

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

  // asset을 생략하면 기존 벨(측정 화면 간격 알림)을 그대로 쓴다. 세트 간 휴식 종료처럼 다른
  // 사운드를 써야 하는 곳(RepsScreen)만 명시적으로 넘긴다. volumeMode가 'max'면(Android 전용)
  // 재생 순간 시스템 볼륨을 최대로 올렸다가 restoreDelayMs 뒤 되돌린다(alarmVolume.ts).
  // withMaxVolume이 'max' 모드에서는 getVolume/setVolume을 await한 뒤에야 실제로 재생하므로,
  // 반환하는 프로미스를 그대로 넘겨준다 — playBellSoundWithoutFocus처럼 재생이 실제로 시작된
  // 뒤에야 안전하게 다음 단계(복원 타이머 예약)로 넘어가야 하는 호출부가 await할 수 있게 하기
  // 위함이다. TimerScreen처럼 결과를 기다리지 않는 호출부를 위해 여기서 미리 catch해 둔다.
  const playBellSound = (
    asset: AudioSource = require('../../assets/sounds/bell.wav'),
    volumeMode: AlarmVolumeMode = 'device',
    restoreDelayMs = 800,
  ): Promise<void> => {
    return withMaxVolume(
      volumeMode,
      () => {
        releaseBell();
        const player = createAudioPlayer(asset);
        bellRef.current = player;
        player.play();
      },
      restoreDelayMs,
    ).catch(() => {});
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
  // (bell.wav 길이는 0.45초 — 기본 800ms면 재생이 끝나고도 여유 있게 원래 모드로 복귀한다.
  // 더 긴 사운드(복싱 벨 1.2초 등)를 넘길 땐 호출부가 restoreDelayMs도 함께 늘려야 재생 중간에
  // 모드가 바뀌어 소리가 잘리는 일이 없다.)
  const playBellSoundWithoutFocus = async (
    asset?: AudioSource,
    volumeMode: AlarmVolumeMode = 'device',
    restoreDelayMs = 800,
  ) => {
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
    // 'max' 모드에서는 실제 재생이 시작되기 전에 getVolume/setVolume을 await하므로, 그 지연을
    // 포함하지 않으면 restoreDelayMs가 재생 시작 전부터 흘러 재생 도중 인터럽션 모드가 되돌아가
    // 소리가 잘릴 수 있다 — 재생이 실제로 시작된 뒤에 복원 타이머를 예약한다.
    await playBellSound(asset, volumeMode, restoreDelayMs);
    if (unmountedRef.current) return; // 재생 대기 중 화면을 벗어났다 — 새 타이머를 예약하지 않는다
    if (restoreModeTimeoutRef.current != null) clearTimeout(restoreModeTimeoutRef.current);
    restoreModeTimeoutRef.current = setTimeout(() => {
      restoreModeTimeoutRef.current = null;
      restoreInterruptionMode();
    }, restoreDelayMs);
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
