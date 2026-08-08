import { Ionicons } from '@expo/vector-icons';
import { Translations } from './i18n';
import { Exercise, MeasureType, PresetKey } from './types';

export type ExercisePreset = {
  key: PresetKey;
  icon: keyof typeof Ionicons.glyphMap;
  measureType: MeasureType;
  usesWeight?: boolean;
};

// 운동 추가 화면에서 보여줄 프리셋 후보. 이미 같은 프리셋의 운동이 있으면 목록에서 걸러진다.
export const PRESET_EXERCISES: ExercisePreset[] = [
  { key: 'plank', icon: 'hourglass-outline', measureType: 'time' },
  { key: 'pullup', icon: 'barbell-outline', measureType: 'reps' },
  { key: 'pushup', icon: 'fitness-outline', measureType: 'reps' },
  { key: 'squat', icon: 'walk-outline', measureType: 'reps', usesWeight: true },
  { key: 'lunge', icon: 'footsteps-outline', measureType: 'reps' },
];

// presetKey가 생기기 전(과거 버전)에 저장된 운동은 이름 문자열이 그 시절 프리셋 이름
// 그대로 박제돼 있다 — 그 옛 한국어 이름과 정확히 일치하면 같은 프리셋으로 간주한다.
const LEGACY_KOREAN_PRESET_NAMES: Record<string, PresetKey> = {
  매달리기: 'hang',
  플랭크: 'plank',
  턱걸이: 'pullup',
  팔굽혀펴기: 'pushup',
  스쿼트: 'squat',
  런지: 'lunge',
};

export function inferPresetKey(name: string): PresetKey | undefined {
  return LEGACY_KOREAN_PRESET_NAMES[name];
}

// 화면에 보여줄 운동 이름 — 프리셋 기반이면(저장값 또는 레거시 이름 추론) 현재 언어로
// 번역된 이름을, 아니면(직접 입력한 운동) 저장된 이름을 그대로 반환한다.
export function getExerciseDisplayName(exercise: Exercise, t: Translations): string {
  const key = exercise.presetKey ?? inferPresetKey(exercise.name);
  return key ? t.exercisePresets[key] : exercise.name;
}

// 이미 존재하는 운동 중 이 프리셋과 같은 운동이 있는지 (직접 입력한 이름은 대상 아님)
export function hasPresetKey(exercises: Exercise[], key: PresetKey): boolean {
  return exercises.some((e) => (e.presetKey ?? inferPresetKey(e.name)) === key);
}

// 직접 입력한 운동을 추가할 때 고를 수 있는 아이콘 후보 — 구기 종목 등 다른 스포츠가 아니라
// 헬스(웨이트·유산소·스트레칭) 운동에 맞는 아이콘만 둔다. Ionicons에 없는 운동 전용 아이콘은
// customIcons.ts에 정의한 커스텀 SVG 키를 쓴다 (icons_claude/*.svg 디자인 기반).
export const CUSTOM_ICON_CHOICES: Exercise['icon'][] = [
  'custom-barbell',
  'custom-dumbbell',
  'custom-kettlebell',
  'custom-weight-plate',
  'custom-bench',
  'custom-squat-rack',
  'custom-pull-up',
  'custom-muscle',
  'custom-stopwatch',
  'custom-watch',
  'custom-pace',
  'custom-track',
  'custom-route',
  'custom-running-person',
  'custom-running-shoe',
  'custom-treadmill',
  'custom-jump-rope',
  'custom-heart-rate',
  'custom-calories',
  'custom-water-bottle',
];

// 직접 입력한 운동의 기본 아이콘 — 아무것도 고르지 않으면 첫 번째 후보를 쓴다
export const CUSTOM_EXERCISE_ICON: Exercise['icon'] = CUSTOM_ICON_CHOICES[0];

// 아이콘 선택 그리드에 실제로 보여줄 전체 후보 — 프리셋 운동(플랭크·턱걸이 등)이 쓰는
// Ionicons도 커스텀 아이콘과 함께 골라 쓸 수 있게 앞쪽에 덧붙인다.
export const ICON_CHOICES: Exercise['icon'][] = [
  ...Array.from(new Set(PRESET_EXERCISES.map((p) => p.icon))),
  ...CUSTOM_ICON_CHOICES,
];

export const EXERCISE_NAME_MAX_LENGTH = 20;
