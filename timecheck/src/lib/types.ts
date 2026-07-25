import { Ionicons } from '@expo/vector-icons';

export type MeasureType = 'time' | 'reps';

export type Exercise = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  measureType: MeasureType;
  usesWeight?: boolean; // measureType === 'reps'일 때만 의미 있음
  weightUnit?: 'kg' | 'lb'; // usesWeight가 true일 때만
  builtin: boolean; // true면 수정·삭제 불가 (매달리기)
};

// 시간형 운동 기록 — 기존 HangRecord와 구조가 완전히 같다 (이름만 일반화, 기존 JSON과 100% 호환)
export type TimeRecord = {
  id: string;
  measuredAt: string;
  durationMs: number;
};

export type RepsSet = {
  reps: number;
  weight?: number; // exercise.usesWeight인 운동만
};

export type RepsRecord = {
  id: string;
  measuredAt: string;
  sets: RepsSet[];
  weightUnit?: 'kg' | 'lb'; // 저장 당시 단위 스냅샷 — 나중에 단위를 바꿔도 과거 기록엔 영향 없음
};

export type Settings = {
  countdownSeconds: number;
  bellIntervalSeconds: number;
};

export const DEFAULT_SETTINGS: Settings = {
  countdownSeconds: 5,
  bellIntervalSeconds: 10,
};

export const COUNTDOWN_MIN_SECONDS = 3;
export const COUNTDOWN_MAX_SECONDS = 30;

export const BELL_INTERVAL_STEP_SECONDS = 10;
export const BELL_INTERVAL_MIN_SECONDS = 10;
export const BELL_INTERVAL_MAX_SECONDS = 120;
