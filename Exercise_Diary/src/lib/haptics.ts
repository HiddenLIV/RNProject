import * as Haptics from 'expo-haptics';

// 손에 땀이 나거나 화면을 안 보고 조작하는 상황(운동 중)이 많아, 버튼 확정감을 촉각으로도 준다.
// impactAsync/selectionAsync는 실패해도 예외를 던지지 않는 게 보장되지 않으므로(기기별 편차),
// 호출부 로직에 영향이 가지 않도록 여기서 한 번 흡수한다.
function safe(fn: () => Promise<void>) {
  fn().catch(() => {});
}

/** 가벼운 조작(스테퍼 증감, 세트 삭제 등) */
export const tapLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** 주요 동작 시작/확정(측정 시작, 세트 추가, FAB) */
export const tapMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** 측정 종료처럼 무게감이 실려야 하는 동작 */
export const tapHeavy = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));

/** 저장 완료 등 성공 피드백 */
export const notifySuccess = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
