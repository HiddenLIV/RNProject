export type ExerciseMenu = {
  id: string;
  title: string;
  description: string;
  available: boolean;
};

// 새 운동 메뉴는 여기에 항목을 추가하면 홈 화면에 표시된다.
// available: false면 "준비 중"으로 비활성 표시된다.
export const EXERCISE_MENUS: ExerciseMenu[] = [
  { id: 'hang', title: '매달리기', description: '데드행 버틴 시간 측정·기록', available: true },
];
