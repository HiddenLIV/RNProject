import { useEffect, useState } from 'react';

import {
  getAlarmVolumeMode,
  getSettings,
  getVoiceGuideEnabled,
  saveSettings,
  setVoiceGuideEnabled,
} from './storage';
import { AlarmVolumeMode, DEFAULT_ALARM_VOLUME_MODE, DEFAULT_SETTINGS, Settings } from './types';

export function useTimerSettings(exerciseId: string) {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings(exerciseId).then(setSettingsState);
  }, [exerciseId]);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(exerciseId, next);
      return next;
    });
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
