import { ThemePreset } from './types';

// primary는 스펙에서 확정한 브랜드 색 그대로. 나머지 4개 롤(pressed/soft/accent/accentSoft)은
// 기본 팔레트와 같은 방식(검게 섞기=pressed, 배경과 섞기=soft/accentSoft, 희게 섞기=accent)으로
// 배경(#141013) 기준 파생한 값 — 기본(default) 프리셋만 theme.ts의 기존 값을 그대로 유지한다
// (하위 호환, 파생값 아님).
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: '기본',
    primary: '#9B2791',
    primaryPressed: '#6D1B66',
    primarySoft: '#331C31',
    accent: '#C67AC9',
    accentSoft: '#332038',
    onPrimary: '#FFFFFF',
  },
  {
    id: 'orange', // Strava
    name: '오렌지',
    primary: '#FC4C02',
    primaryPressed: '#AB3401',
    primarySoft: '#3E1B10',
    accent: '#FD8553',
    accentSoft: '#2B1611',
    onPrimary: '#FFFFFF',
  },
  {
    id: 'mint', // Whoop
    name: '민트',
    primary: '#00D9A3',
    primaryPressed: '#00946F',
    primarySoft: '#10342D',
    accent: '#52E5C0',
    accentSoft: '#122421',
    // 밝은 민트 위에 흰 텍스트를 얹으면 대비가 약 1.8:1로 거의 안 보인다 —
    // 다른 프리셋과 달리 이 프리셋만 어두운 전경색을 쓴다 (배경색 재사용, 대비 약 10:1)
    onPrimary: '#141013',
  },
  {
    id: 'red', // Peloton
    name: '레드',
    primary: '#E62B2B',
    primaryPressed: '#9C1D1D',
    primarySoft: '#3A1517',
    accent: '#EE6F6F',
    accentSoft: '#291315',
    onPrimary: '#FFFFFF',
  },
  {
    id: 'blue', // MyFitnessPal
    name: '블루',
    primary: '#0072CE',
    primaryPressed: '#004E8C',
    primarySoft: '#102235',
    accent: '#529FDE',
    accentSoft: '#121A26',
    onPrimary: '#FFFFFF',
  },
];
