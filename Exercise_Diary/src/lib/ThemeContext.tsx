import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { getThemePreset, setThemePreset } from './storage';
import { THEME_PRESETS } from './themePresets';
import { ThemePreset, ThemePresetId } from './types';

type ThemeContextValue = ThemePreset & {
  presetId: ThemePresetId;
  setPresetId: (id: ThemePresetId) => void;
  presets: ThemePreset[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [presetId, setPresetIdState] = useState<ThemePresetId>('default');
  // 저장된 값을 불러오는 동안 사용자가 먼저 스와치를 탭하면, 뒤늦게 끝난 로딩 결과가
  // 방금 고른 색을 덮어쓰지 않도록 막는 가드
  const userChangedRef = useRef(false);

  useEffect(() => {
    getThemePreset().then((stored) => {
      if (!userChangedRef.current) setPresetIdState(stored);
    });
  }, []);

  const setPresetId = (id: ThemePresetId) => {
    userChangedRef.current = true;
    setPresetIdState(id); // 화면엔 즉시 반영
    setThemePreset(id); // 저장은 백그라운드 — 실패해도 사용자에게 노출하지 않음
  };

  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];

  return (
    <ThemeContext.Provider value={{ ...preset, presetId, setPresetId, presets: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAccentColors(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAccentColors must be used within ThemeProvider');
  return ctx;
}
