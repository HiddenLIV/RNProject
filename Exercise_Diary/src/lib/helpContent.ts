import { Ionicons } from '@expo/vector-icons';

export type HelpSection = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    icon: 'add-circle-outline',
    title: '운동 추가',
    description:
      '홈 화면 아래 "운동 추가"를 눌러 새 운동을 만들어요. 프리셋에서 고르거나 이름·아이콘·측정 방식을 직접 입력할 수 있어요.',
  },
  {
    icon: 'timer-outline',
    title: '측정 시작',
    description:
      '운동을 선택하면 "측정" 탭이 열려요. 매달리기처럼 시간을 재는 운동은 타이머로, 턱걸이처럼 횟수를 세는 운동은 세트별 횟수·무게를 입력해 기록해요.',
  },
  {
    icon: 'list-outline',
    title: '기록 확인',
    description:
      '운동 화면 하단의 "기록" 탭에서 날짜별 기록과 최고 기록을 볼 수 있어요. 잘못 남은 기록은 옆의 휴지통 아이콘으로 지울 수 있어요.',
  },
  {
    icon: 'videocam-outline',
    title: '운동 촬영',
    description:
      '측정 화면의 "촬영" 버튼으로 운동하는 모습을 찍을 수 있어요. 영상은 기기 갤러리에 저장되고, 기록을 저장하면 그 기록에 연결돼 나중에 다시 볼 수 있어요.',
  },
  {
    icon: 'play-circle-outline',
    title: '자세 안내 영상',
    description:
      '운동에 유튜브 링크를 등록해두면 측정 화면에 "자세 영상 보기" 버튼이 나타나요. 눌러서 정확한 자세를 확인하며 운동할 수 있어요.',
  },
  {
    icon: 'create-outline',
    title: '운동 커스터마이징',
    description:
      '홈 화면 운동 카드의 연필 아이콘으로 이름·자세 영상 링크를 수정하거나 더 이상 안 쓰는 운동을 삭제할 수 있어요.',
  },
];
