import { useEffect, useState } from 'react';
import { getSettings, getVoiceGuideEnabled, saveSettings, setVoiceGuideEnabled } from './storage';
import { DEFAULT_SETTINGS, Settings } from './types';

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

  return { settings, updateSettings, voiceGuideEnabled, onVoiceGuideToggle };
}
