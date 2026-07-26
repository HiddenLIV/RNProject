import { ViewStyle } from 'react-native';

// 다크 + 마젠타 팔레트 — 직전 톤(#E0459B)이 핑크에 가깝다는 피드백으로
// 빨강·파랑이 균형 잡힌 딥 마젠타(자주)로 교체(팔레트 후보 아티팩트의 B안)
//
// primary/primaryPressed/primarySoft/accent/accentSoft는 테마 컬러 커스터마이징 기능으로
// 화면에서 더 이상 이 static 값을 직접 쓰지 않는다(useAccentColors() 훅 사용) — 아래 값은
// themePresets.ts의 'default' 프리셋과 동일해야 하는 참고용 상수다. 실제로 적용되는 값을
// 바꾸려면 themePresets.ts를 수정할 것.
export const colors = {
  primary: '#9B2791',
  primaryPressed: '#6D1B66',
  primarySoft: '#331C31',
  accent: '#C67AC9',
  accentSoft: '#332038',
  danger: '#FF453A',
  dangerSoft: '#3A1614',
  background: '#141013',
  card: '#211A20',
  cardMuted: '#282029',
  text: '#F5F3EE',
  textMuted: '#9A8F96',
  textFaint: '#635760',
  border: '#2C232A',
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

// shadowColor는 프리셋마다 달라지므로 여기 넣지 않는다 — 쓰는 쪽에서
// `{ ...buttonShadowShape, shadowColor: accent.primary }`처럼 인라인으로 덧붙인다.
export const buttonShadowShape: ViewStyle = {
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
