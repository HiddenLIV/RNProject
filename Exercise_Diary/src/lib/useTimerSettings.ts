import { useEffect, useState } from 'react';

import {
  getAlarmVolumeMode,
  getSettings,
  getVoiceGuideEnabled,
  setVoiceGuideEnabled,
  updateSettings as updateSettingsInStorage,
} from './storage';
import { AlarmVolumeMode, DEFAULT_ALARM_VOLUME_MODE, DEFAULT_SETTINGS, Settings } from './types';

export function useTimerSettings(exerciseId: string) {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings(exerciseId).then(setSettingsState);
  }, [exerciseId]);

  const updateSettings = (patch: Partial<Settings>) => {
    // 화면엔 즉시 반영(낙관적 갱신)하고, 실제 저장은 그 시점 저장소의 최신값과 병합한다 — 같은
    // 운동을 동시에 들고 있는 다른 인스턴스가 이미 저장해 둔 다른 필드를 stale한 값으로 덮어쓰지
    // 않기 위함(useTimerSettings 인스턴스가 여러 화면에서 동시에 살아있을 수 있다).
    setSettingsState((prev) => ({ ...prev, ...patch }));
    updateSettingsInStorage(exerciseId, patch).then(setSettingsState);
  };

  // 운동별 설정과 달리 앱 전체에 공통으로 적용되는 값이라 exerciseId와 무관하게 한 번만 읽는다.
  const [voiceGuideEnabled, setVoiceGuideEnabledState] = useState(true);

  useEffect(() => {
    getVoiceGuideEnabled().then(setVoiceGuideEnabledState);
  }, []);

  const onVoiceGuideToggle = (value: boolean) => {
    setVoiceGuideEnabledState(value); // 화면엔 즉시 반영
    setVoiceGuideEnabled(value); // 저장은 백그라운드 — 실패해도 사용자에게 노출하지 않음
  };

  // 알림음 볼륨 모드도 voiceGuideEnabled와 같은 자리 — 운동별이 아니라 앱 전체 공통값이라
  // exerciseId와 무관하게 한 번만 읽는다. 설정 화면(SoundHapticsSettingsSection)에서 값을
  // 바꾸면 다음에 이 훅을 쓰는 측정 화면을 열 때 최신값을 다시 읽어온다.
  const [alarmVolumeMode, setAlarmVolumeModeState] =
    useState<AlarmVolumeMode>(DEFAULT_ALARM_VOLUME_MODE);

  useEffect(() => {
    getAlarmVolumeMode().then(setAlarmVolumeModeState);
  }, []);

  return { settings, updateSettings, voiceGuideEnabled, onVoiceGuideToggle, alarmVolumeMode };
}
