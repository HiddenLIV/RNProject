import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// 측정 중 화면이 자동 잠기면 JS 타이머가 멈춰 음성·벨이 끊기므로 화면을 깨워 둔다
export function useKeepAwakeWhileActive(active: boolean) {
  useEffect(() => {
    if (!active) return;
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, [active]);
}
