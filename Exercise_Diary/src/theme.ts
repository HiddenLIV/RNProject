import { ViewStyle } from 'react-native';
import { BaseColors } from './lib/types';

// 다크 + 마젠타 팔레트 — 직전 톤(#E0459B)이 핑크에 가깝다는 피드백으로
// 빨강·파랑이 균형 잡힌 딥 마젠타(자주)로 교체(팔레트 후보 아티팩트의 B안)
//
// 라이트 모드 지원 이전엔 이 파일이 accent 색(primary 등)까지 들고 있었지만, 지금은
// useAccentColors() 훅이 themePresets.ts를 통해 그 값을 내려준다. 여기 남은 건 화면 배경·카드·
// 텍스트처럼 기기 디스플레이 설정(라이트/다크)에 따라 바뀌는 베이스 톤뿐이다.
export const DARK_COLORS: BaseColors = {
  background: '#141013',
  card: '#211A20',
  cardMuted: '#282029',
  text: '#F5F3EE',
  textMuted: '#9A8F96',
  textFaint: '#635760',
  border: '#2C232A',
  danger: '#FF453A',
  dangerSoft: '#3A1614',
  white: '#FFFFFF',
  shadow: '#000000',
  weekendSaturday: '#2F80ED',
  weekendSunday: '#FF453A', // danger와 같은 값 — 어두운 배경에선 대비 문제가 없어 그대로 재사용
};

export const LIGHT_COLORS: BaseColors = {
  background: '#F7F4F5',
  card: '#FFFFFF',
  cardMuted: '#F0EBEC',
  text: '#1E1A1C',
  textMuted: '#6B6067',
  textFaint: '#8B8085', // QA에서 대비 2.4:1로 너무 흐리다는 지적 반영 — 3.5:1 정도로 조정
  border: '#E4DEE0',
  danger: '#FF453A', // 경고색은 두 모드에서 동일하게 유지(재인식성)
  dangerSoft: '#FFE1DE',
  white: '#FFFFFF',
  shadow: '#000000',
  // danger(#FF453A)를 밝은 배경(#F7F4F5)에 그대로 쓰면 대비가 약 3:1로 WCAG AA(4.5:1) 미달이라
  // 요일 표시 전용으로 더 진한 톤을 쓴다(Material Blue/Red 800 계열, 대비 5:1 이상).
  weekendSaturday: '#1565C0',
  weekendSunday: '#C62828',
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
// M3는 진한 드롭섀도우 대신 옅은 톤 기반 elevation을 쓴다 — opacity를 낮춰 그 느낌에 가깝게.
export const buttonShadowShape: ViewStyle = {
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 3,
};

export const cardShadow: ViewStyle = {
  shadowColor: '#000000', // 라이트/다크 공통 — 두 팔레트의 shadow 값이 같다
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.14,
  shadowRadius: 6,
  elevation: 1,
};
