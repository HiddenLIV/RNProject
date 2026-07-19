import { ViewStyle } from 'react-native';

// 다크 네이비 + 타나 하이라이트 팔레트 — 프리미엄하고 차분한 톤
export const colors = {
  primary: '#22344F',
  primaryPressed: '#182534',
  primarySoft: '#DCE2E8',
  accent: '#C08552',
  accentSoft: '#F2E1CE',
  danger: '#B2453A',
  dangerSoft: '#F3D9D5',
  background: '#F4F1EC',
  card: '#EAE6DE',
  cardMuted: '#E1DBD0',
  text: '#24211E',
  textMuted: '#6B6459',
  textFaint: '#A79E90',
  border: '#DDD5C8',
  white: '#FFFFFF',
  shadow: '#3A342C',
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
  shadowColor: colors.primaryPressed,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 5,
};

export const cardShadow: ViewStyle = {
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};
