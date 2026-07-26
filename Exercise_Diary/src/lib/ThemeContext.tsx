import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemePreset, setThemePreset } from './storage';
import { THEME_PRESETS } from './themePresets';
import { BaseColors, ColorScheme, ThemePreset, ThemePresetId } from './types';
import { DARK_COLORS, LIGHT_COLORS } from '../theme';

type ThemeContextValue = ThemePreset & BaseColors & {
  presetId: ThemePresetId;
  setPresetId: (id: ThemePresetId) => void;
  presets: ThemePreset[];
  colorScheme: ColorScheme;
  // primary/accent는 밝은 프리셋(민트 등)에서 라이트 배경 위 텍스트로 쓰면 대비가 무너진다 —
  // "카드·배경처럼 색이 고정되지 않은 페이지 표면 위에 직접 얹는 텍스트·아이콘"엔 이 값을 쓴다.
  // primarySoft/accentSoft(항상 어두운 칩)처럼 배경 자체가 어두운 곳에 얹는 글자는 그대로
  // primary/accent를 써도 된다 — 칩이 라이트/다크 모두 같은 어두운 톤이라 문제 없다.
  primaryText: string;
  accentText: string;
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

  // 라이트/다크는 저장하지 않는다 — useColorScheme()이 시스템 설정을 실시간 구독하므로
  // 그 값을 그대로 쓰면 재시작 없이 즉시 반영된다.
  const systemScheme = useColorScheme();
  const colorScheme: ColorScheme = systemScheme === 'light' ? 'light' : 'dark';
  const base = colorScheme === 'light' ? LIGHT_COLORS : DARK_COLORS;

  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];
  // 라이트 모드에선 primaryPressed(항상 어둡게 파생된 값)로 대체해 페이지 배경 위에서도
  // 읽히게 한다. 다크 모드는 지금까지 검증된 모습 그대로 유지.
  const primaryText = colorScheme === 'light' ? preset.primaryPressed : preset.primary;
  const accentText = colorScheme === 'light' ? preset.primaryPressed : preset.accent;

  return (
    <ThemeContext.Provider
      value={{
        ...base,
        ...preset,
        presetId,
        setPresetId,
        presets: THEME_PRESETS,
        colorScheme,
        primaryText,
        accentText,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAccentColors(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAccentColors must be used within ThemeProvider');
  return ctx;
}
