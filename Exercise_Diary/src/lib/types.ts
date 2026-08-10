import { Ionicons } from '@expo/vector-icons';
import { CustomIconKey } from './customIcons';

export type MeasureType = 'time' | 'reps';

// 프리셋으로 추가된 운동을 식별하는 키 — 이 값이 있으면 표시할 때 저장된 name 대신
// 현재 언어의 번역된 프리셋 이름을 쓴다 (사용자가 언어를 바꿔도 이름이 그 언어로 보이게).
export type PresetKey = 'hang' | 'plank' | 'pullup' | 'pushup' | 'squat' | 'lunge';

export type Exercise = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap | CustomIconKey;
  measureType: MeasureType;
  usesWeight?: boolean; // measureType === 'reps'일 때만 의미 있음
  weightUnit?: 'kg' | 'lb'; // usesWeight가 true일 때만
  guideVideoId?: string; // 자세 안내용 유튜브 영상 ID(11자리). 없으면 측정 화면에 영상 버튼이 안 보임
  presetKey?: PresetKey;
};

export type VideoRef = {
  assetId: string; // expo-media-library Asset id — 기기 갤러리 상의 영상을 가리키는 참조. 영상 파일 자체는 앱이 보관하지 않는다.
};

// 시간형 운동 기록 — 기존 HangRecord와 구조가 완전히 같다 (이름만 일반화, 기존 JSON과 100% 호환)
export type TimeRecord = {
  id: string;
  measuredAt: string;
  durationMs: number;
  videoRef?: VideoRef;
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
  videoRef?: VideoRef;
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

// 테마 컬러 커스터마이징 — 포인트 컬러 프리셋
export type ThemePresetId = 'default' | 'orange' | 'mint' | 'red' | 'blue';
// storage.ts(저장값 검증)와 backup.ts(백업 파일 검증)가 같은 유효값 목록을 공유한다.
export const THEME_PRESET_IDS: ThemePresetId[] = ['default', 'orange', 'mint', 'red', 'blue'];

export type ThemePreset = {
  id: ThemePresetId;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  onPrimary: string; // primary 배경 위에 얹는 텍스트·아이콘 색 — 밝은 primary(민트 등)에서도 대비 확보
};

// 데이터 백업 및 내보내기
export const BACKUP_SCHEMA_VERSION = 1;

// 운동별 기록·설정을 exercise.id로 묶어, 내부 AsyncStorage 키 네이밍(레거시 'hang' 특례 포함)이
// 백업 파일 형식에 그대로 노출되지 않게 한다 — storage.ts의 키 구조가 바뀌어도 백업 형식은 안정적이다.
export type BackupExerciseData = {
  records: TimeRecord[];
  repsRecords: RepsRecord[];
  settings: Settings;
};

export type BackupPayload = {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string; // ISO 8601
  appVersion: string; // Constants.expoConfig?.version — 문제 리포트 시 참고용
  exercises: Exercise[];
  theme: ThemePresetId;
  exerciseData: Record<string, BackupExerciseData>;
};

// 라이트 모드 지원 — 기기 디스플레이 설정에 따라 바뀌는 베이스 톤
export type ColorScheme = 'light' | 'dark';

export type BaseColors = {
  background: string;
  card: string;
  cardMuted: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  danger: string;
  dangerSoft: string;
  white: string;
  shadow: string;
};
