import { Ionicons } from '@expo/vector-icons';
import { MeasureType } from './types';

export type ExercisePreset = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  measureType: MeasureType;
  usesWeight?: boolean;
};

// 운동 추가 화면에서 보여줄 프리셋 후보. 이미 같은 이름의 운동이 있으면 목록에서 걸러진다.
export const PRESET_EXERCISES: ExercisePreset[] = [
  { name: '매달리기', icon: 'body-outline', measureType: 'time' },
  { name: '플랭크', icon: 'hourglass-outline', measureType: 'time' },
  { name: '턱걸이', icon: 'barbell-outline', measureType: 'reps' },
  { name: '팔굽혀펴기', icon: 'fitness-outline', measureType: 'reps' },
  { name: '스쿼트', icon: 'walk-outline', measureType: 'reps' },
  { name: '런지', icon: 'footsteps-outline', measureType: 'reps' },
];

// 직접 입력한 운동을 추가할 때 고를 수 있는 아이콘 후보 — 구기 종목 등 다른 스포츠가 아니라
// 헬스(웨이트·유산소·스트레칭) 운동에 맞는 아이콘만 둔다
export const CUSTOM_ICON_CHOICES: (keyof typeof Ionicons.glyphMap)[] = [
  'barbell-outline',
  'body-outline',
  'walk-outline',
  'footsteps-outline',
  'bicycle-outline',
  'flame-outline',
  'heart-outline',
  'pulse-outline',
  'timer-outline',
  'stopwatch-outline',
  'fitness-outline',
  'accessibility-outline',
  'trophy-outline',
  'add-outline',
];

// 직접 입력한 운동의 기본 아이콘 — 아무것도 고르지 않으면 첫 번째 후보를 쓴다
export const CUSTOM_EXERCISE_ICON: keyof typeof Ionicons.glyphMap = CUSTOM_ICON_CHOICES[0];

export const EXERCISE_NAME_MAX_LENGTH = 20;
