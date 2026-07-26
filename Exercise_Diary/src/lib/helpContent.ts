import { Ionicons } from '@expo/vector-icons';

// 도움말 섹션 아이콘 — 언어와 무관한 상수. 제목·설명 텍스트는 각 언어의
// locales/*.ts의 help.sections에 있고, 이 배열과 같은 순서로 대응한다.
export const HELP_SECTION_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'add-circle-outline',
  'timer-outline',
  'list-outline',
  'videocam-outline',
  'play-circle-outline',
  'create-outline',
];
