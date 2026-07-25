import { ViewStyle } from 'react-native';

// 다크 + 비비드 오렌지 팔레트 — Strava 등 운동 기록 앱 참고, 큰 숫자·기록에 힘을 싣는 톤
export const colors = {
  primary: '#FF5A1F',
  primaryPressed: '#D9450F',
  primarySoft: '#3A2416',
  accent: '#E8A33D',
  accentSoft: '#3A2E14',
  danger: '#FF453A',
  dangerSoft: '#3A1614',
  background: '#121310',
  card: '#1D1F19',
  cardMuted: '#242620',
  text: '#F5F3EE',
  textMuted: '#9A968C',
  textFaint: '#635F57',
  border: '#2A2B24',
  white: '#FFFFFF',
  shadow: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 24,
  pill: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  display: 72,
  countdown: 96,
};

export const buttonShadow: ViewStyle = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 14,
  elevation: 5,
};

export const cardShadow: ViewStyle = {
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 2,
};
