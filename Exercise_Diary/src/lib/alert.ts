// 앱 전체의 테마 적용 알림창(AlertHost)을 어디서든 Alert.alert처럼 호출하기 위한 모듈.
// AlertHost는 컴포넌트 트리 최상단에 한 번만 마운트되어 자신을 리스너로 등록하고,
// showAlert()는 그 리스너에게 알림 요청을 넘긴다 — 화면/컴포넌트뿐 아니라
// useVideoCapture 같은 훅에서도 훅이 아닌 이 함수를 그냥 import해서 호출할 수 있다.
export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
};

export type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Listener = (request: AlertRequest | null) => void;

// EditExerciseModal·BackupModal처럼 이미 자체 <Modal>을 띄운 화면은 그 안에 자신만의
// AlertHost(embedded)를 마운트해 리스너 스택 맨 위를 차지한다 — iOS는 이미 present된 Modal
// 위에 또 다른 Modal을 present하려 하면 조용히 실패하므로(경고만 찍히고 아무 일도 안 일어남),
// 그 경우엔 새 네이티브 Modal을 열지 않고 이미 떠 있는 화면 안에 겹쳐 그리는 쪽으로 처리해야 한다.
// 가장 나중에 마운트된(=화면 최상단에 있는) 리스너가 항상 showAlert를 받는다.
const listeners: Listener[] = [];
let nextId = 0;

export function registerAlertListener(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const index = listeners.indexOf(fn);
    if (index !== -1) listeners.splice(index, 1);
  };
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const topListener = listeners[listeners.length - 1];
  topListener?.({ id: ++nextId, title, message, buttons: buttons ?? [] });
}
