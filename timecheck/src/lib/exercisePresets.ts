import { Ionicons } from '@expo/vector-icons';
import { MeasureType } from './types';

export type ExercisePreset = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  measureType: MeasureType;
  usesWeight?: boolean;
};

// 운동 추가 화면에서 보여줄 프리셋 후보. 이미 같은 이름의 운동이 있으면 목록에서 걸러진다
// (매달리기는 항상 존재하므로 자연히 프리셋 목록에 뜨지 않는다) — 그래도 5개 이상 보이도록
// 매달리기를 포함해 6개를 정의해 둔다.
export const PRESET_EXERCISES: ExercisePreset[] = [
  { name: '매달리기', icon: 'body-outline', measureType: 'time' },
  { name: '플랭크', icon: 'hourglass-outline', measureType: 'time' },
  { name: '턱걸이', icon: 'barbell-outline', measureType: 'reps' },
  { name: '팔굽혀펴기', icon: 'fitness-outline', measureType: 'reps' },
  { name: '스쿼트', icon: 'walk-outline', measureType: 'reps' },
  { name: '런지', icon: 'footsteps-outline', measureType: 'reps' },
];

// 직접 입력한 운동에 쓰는 공용 기본 아이콘 (아이콘 직접 선택은 이번 범위 밖)
export const CUSTOM_EXERCISE_ICON: keyof typeof Ionicons.glyphMap = 'add-circle-outline';

export const EXERCISE_NAME_MAX_LENGTH = 20;
