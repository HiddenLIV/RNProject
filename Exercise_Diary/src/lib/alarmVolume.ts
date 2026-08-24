import { Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

import { AlarmVolumeMode } from './types';

const VOLUME_CONFIG = { type: 'music' as const, showUI: false, playSound: false };

// 겹쳐 호출되는 동안(예: 이전 호출의 복원 타이머가 아직 끝나지 않았는데 다음 벨이 또 울림) 두
// 호출이 각자 getVolume()을 부르면, 두 번째 호출은 첫 번째가 이미 최대로 올려둔 값을 "원래
// 볼륨"으로 잘못 기억해 버린다 — 그러면 첫 번째 호출의 복원 타이머가 실제 원래 값으로 되돌린
// 직후 두 번째 타이머가 다시 그 잘못된 값(최대)으로 덮어써, 볼륨이 최대에 영구히 고정된다.
// 이를 막기 위해 진짜 원래 볼륨을 모듈 스코프에 한 번만 붙잡아 두고, 이미 붙잡힌 동안 들어오는
// 호출은 다시 읽지 않고 복원 타이머만 이번 호출 기준으로 늦춘다.
let boost: { original: number; timeoutId: ReturnType<typeof setTimeout> } | null = null;

// bell.wav(0.45s)·복싱벨(1.2s)이 재생되는 동안만 미디어 스트림 볼륨을 최대로 올렸다가 되돌린다.
// useTimerAudio.ts의 restoreModeTimeoutRef(오디오 모드 복귀)와 같은 이유로, 재생 완료 콜백 대신
// 고정 지연 후 복원한다 — 이 값은 실제 재생 시간보다 넉넉히 잡아 호출부(useTimerAudio)가 넘긴다.
// iOS는 OS 정책상 앱이 시스템 볼륨을 바꿀 수 없어 이 함수를 아예 호출하지 않는다(요구사항 1-3,
// SoundHapticsSettingsSection도 iOS에는 이 설정 자체를 노출하지 않는다).
export async function withMaxVolume(
  mode: AlarmVolumeMode,
  run: () => void,
  restoreDelayMs: number,
) {
  if (mode !== 'max' || Platform.OS !== 'android') {
    run();
    return;
  }

  if (boost) {
    // 이미 최대로 올라가 있다 — 다시 읽지 않고, 붙잡아 둔 진짜 원래 값으로 복원 타이머만 늦춘다.
    // run()이 던져도(오디오 재생 실패 등) 복원 타이머는 반드시 다시 예약해야 볼륨이 최대에
    // 영구히 고정되지 않으므로 finally에서 예약한다.
    clearTimeout(boost.timeoutId);
    const original = boost.original;
    try {
      run();
    } finally {
      boost.timeoutId = setTimeout(() => {
        boost = null;
        VolumeManager.setVolume(original, VOLUME_CONFIG).catch(() => {});
      }, restoreDelayMs);
    }
    return;
  }

  let original: number;
  try {
    const { volume } = await VolumeManager.getVolume();
    original = volume;
    await VolumeManager.setVolume(1, VOLUME_CONFIG);
  } catch {
    run(); // 볼륨 API 실패 시에도 알림음 자체는 정상 재생한다
    return;
  }
  try {
    run();
  } finally {
    boost = {
      original,
      timeoutId: setTimeout(() => {
        boost = null;
        VolumeManager.setVolume(original, VOLUME_CONFIG).catch(() => {});
      }, restoreDelayMs),
    };
  }
}
