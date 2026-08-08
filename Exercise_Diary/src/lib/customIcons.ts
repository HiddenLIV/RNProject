// Ionicons에 없는 운동 전용 아이콘 — src/components/CustomWeightIcons.tsx에서 실제로 그린다.
export const CUSTOM_ICON_KEYS = [
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
] as const;

export type CustomIconKey = (typeof CUSTOM_ICON_KEYS)[number];

export function isCustomIconKey(value: string): value is CustomIconKey {
  return (CUSTOM_ICON_KEYS as readonly string[]).includes(value);
}
