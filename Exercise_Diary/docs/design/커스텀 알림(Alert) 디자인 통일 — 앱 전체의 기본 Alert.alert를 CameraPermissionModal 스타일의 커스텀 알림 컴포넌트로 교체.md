# 커스텀 알림(Alert) 디자인 통일 — 설계

## 화면 구조

새 화면은 없다. `Alert.alert`처럼 "어디서든 함수 호출 한 번으로 띄우는" 전역 알림이 필요하므로, 컴포넌트 트리 최상단에 한 번만 마운트되는 호스트 컴포넌트를 새로 만든다.

```
App.tsx (AppContent)
├─ SafeAreaView
│   ├─ HomeScreen / ExerciseScreen / AddExerciseScreen (기존, 화면 전환)
│   └─ StatusBar
└─ (신규) AlertHost           ← SafeAreaView와 형제로, 화면 전환과 무관하게 항상 마운트
```

- `src/lib/alert.ts` (신규) — `showAlert(title, message?, buttons?)` 함수와 타입. 이걸 `Alert.alert` 대신 import해서 쓴다. React 컴포넌트가 아닌 순수 모듈이라 훅(`useVideoCapture`)이나 화면 어디서든 그냥 호출할 수 있다(스펙 요구사항 6).
- `src/components/AlertHost.tsx` (신규) — 실제 카드형 알림 UI. `CameraPermissionModal.tsx`의 backdrop/card/buttonRow 스타일을 그대로 가져와 제목·본문·버튼 배열을 범용으로 렌더링한다. `embedded` prop으로 자체 `<Modal>`을 열지, 이미 열린 부모 `<Modal>` 안에 오버레이로만 그려질지 결정한다(아래 "두 Modal이 겹치는 경우" 참고).
- `CameraPermissionModal.tsx`는 UI(허용/설정으로 이동 버튼)는 그대로 두되, 자신의 `<Modal>` 안에 `<AlertHost embedded />`를 함께 마운트한다 — `RepsScreen`/`TimerScreen`에서 권한 요청이 실패하면 이 모달이 열려 있는 동안 `showAlert`가 호출되는 경로가 있어, `EditExerciseModal`/`BackupModal`과 같은 처리가 필요하다(실기기 검증에서 드러난 리스크, 아래 4번 참고).

## 상태 설계

`Alert.alert`와 마찬가지로 전역에서 호출되므로 React Context로는 부족하다(컴포넌트 트리 바깥, 즉 `useVideoCapture.ts` 같은 훅 내부의 콜백에서도 호출해야 함). `ThemeContext`처럼 Provider를 쓰는 대신, 모듈 스코프의 pub-sub으로 만든다. 처음엔 "구독자 하나"로 설계했으나, `EditExerciseModal`/`BackupModal`/`CameraPermissionModal`이 각자 자신만의 `AlertHost` 인스턴스를 두어야 하는 게 드러나(아래 4번) **리스너 스택**으로 바꿨다 — 나중에 마운트된(=화면 최상단에 떠 있는) 리스너가 항상 `showAlert`를 받는다. 동시에 열리는 알림 자체는 여전히 최대 1개뿐이라 알림 큐는 두지 않는다(기존 호출부들도 전부 `busy` 플래그로 중복 호출을 이미 막고 있다).

```ts
// src/lib/alert.ts
type Listener = (request: AlertRequest | null) => void;
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
```

- `AlertHost`는 `useState<AlertRequest | null>(null)`로 현재 알림을 들고 있다가, `useEffect`에서 `registerAlertListener(setRequest)`를 호출하고 그 반환값(해제 함수)을 그대로 cleanup으로 돌려준다.
- 알림 문구에 필요한 번역(`t.common.confirm` 등 버튼 기본 텍스트)은 `AlertHost`가 `useTranslation()`으로 직접 읽는다 — `alert.ts`는 모듈이라 훅을 못 쓰므로, "버튼 배열이 없으면 기본 확인 버튼 하나"라는 기본값 계산은 `AlertHost` 쪽 책임으로 둔다.
- `AlertHost`는 `App.tsx` 루트에 한 번(embedded 아님) + `EditExerciseModal`/`BackupModal`/`CameraPermissionModal` 각각의 `<Modal>` 안에 embedded로 한 번씩, 총 4곳에 마운트된다. `BackupModal`은 `visible` prop이 false일 때도 자식이 마운트될 수 있어 `{visible && <AlertHost embedded />}`로 감싸 안 보이는 상태에서 리스너 우선순위를 가로채지 않게 한다. `EditExerciseModal`/`CameraPermissionModal`은 각자 `if (!exercise) return null` / `if (!state || state === 'granted') return null`로 컴포넌트 자체가 열려 있을 때만 렌더링되므로 별도 가드가 필요 없다.

## 데이터 모델

```ts
// src/lib/alert.ts
export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text: string;
  style?: AlertButtonStyle; // 생략 시 'default'
  onPress?: () => void;
};

export type AlertRequest = {
  id: number;        // 같은 title/message라도 재요청 시 새 알림으로 인식시키기 위한 값
  title: string;
  message?: string;
  buttons: AlertButton[]; // 빈 배열이면 AlertHost가 [{ text: t.common.confirm }] 기본값을 채움
};
```

- `AsyncStorage`에 저장하는 값은 없다 — 알림은 항상 그 순간의 휘발성 UI 상태다.
- i18n: `common.confirm`("확인"/"OK"/"確認"/"确认") 키를 `src/lib/i18n/locales/{en,ko,ja,zh}.ts`의 `common` 섹션에 추가한다(스펙 요구사항 7). `Translations` 타입이 `en.ts` 기준으로 파생되므로 하나라도 빠지면 `npx tsc --noEmit`이 바로 실패해 누락을 잡아준다.

## 핵심 로직

### 1. 버튼 스타일 매핑 (`CameraPermissionModal`의 2버튼 배치를 N버튼으로 일반화)

```ts
// AlertHost.tsx 내부
const buttonStyleFor = (style: AlertButtonStyle = 'default') => {
  if (style === 'cancel') return { backgroundColor: accent.card };            // 기존 CameraPermissionModal 보조 버튼
  if (style === 'destructive') return { backgroundColor: accent.dangerSoft }; // GuideVideoPanel 삭제 버튼과 동일 배색
  return { backgroundColor: accent.primary };                                 // 기존 CameraPermissionModal 주 버튼
};
const buttonTextColorFor = (style: AlertButtonStyle = 'default') => {
  if (style === 'cancel') return accent.text;
  if (style === 'destructive') return accent.danger;
  return accent.onPrimary;
};
```

버튼은 배열 순서 그대로 가로로 나열한다(현재 모든 2버튼 호출부가 이미 `[취소, 확인/삭제]` 순서로 작성돼 있어 그대로 옮기면 순서가 유지된다).

### 2. 버튼 누름 / 닫기

```ts
const close = () => setRequest(null);

const handlePress = (button: AlertButton) => {
  close();       // 네이티브 Alert처럼 탭 즉시 닫히고
  button.onPress?.(); // 그 뒤에 onPress 실행 (실행 시간이 길어도 닫힘 애니메이션과 무관)
};
```

### 3. 백드롭 탭 / 안드로이드 뒤로가기 = 취소 (스펙 요구사항 5)

```ts
const handleDismiss = () => {
  const cancelButton = request?.buttons.find((b) => b.style === 'cancel');
  close();
  cancelButton?.onPress?.(); // cancel 버튼이 없으면(확인 전용 알림) 아무 것도 실행하지 않고 그냥 닫힘
};
```

`Modal`의 `onRequestClose`(안드로이드 하드웨어 뒤로가기)와 backdrop `Pressable`의 `onPress`에 똑같이 `handleDismiss`를 연결한다. 이 덕분에 **`BackupModal`의 가져오기 확인은 더 이상 별도의 `onDismiss` 옵션이 필요 없다** — 지금 `cancel` 버튼의 `onPress`가 이미 `() => setBusy('idle')`이므로, 백드롭/뒤로가기로 닫아도 같은 콜백이 자동으로 불려 `busy` 상태가 똑같이 풀린다(요구사항 5 충족, 코드는 오히려 단순해짐).

`embedded` 모드는 자체 `<Modal>`이 없어 `onRequestClose`가 없다 — RN의 `<Modal>`은 안드로이드 하드웨어 뒤로가기를 자동으로 `onRequestClose`에 연결해주지만, 이 혜택을 embedded 인스턴스는 못 받는다. 그대로 두면 뒤로가기가 부모 `<Modal>`(예: `EditExerciseModal`)의 `onRequestClose`로 그대로 전달되어 **알림이 아니라 부모 화면 전체가 닫힌다.** 그래서 embedded이고 알림이 떠 있을 때만 `BackHandler.addEventListener('hardwareBackPress', ...)`로 뒤로가기를 가로채 `handleDismiss`를 실행하고 `true`(이벤트 소비)를 반환한다. 알림이 없을 때는 리스너를 등록하지 않아, 그때는 뒤로가기가 평소처럼 부모 `<Modal>`로 전달된다.

### 4. 두 Modal이 겹치는 경우 (EditExerciseModal 삭제 확인, BackupModal 가져오기 확인, CameraPermissionModal 권한 실패)

`EditExerciseModal`·`BackupModal`·`CameraPermissionModal`은 이미 자체 `<Modal>`을 열어둔 상태에서 알림을 띄울 수 있다. 처음엔 "RN에서 Modal 위에 또 다른 transparent Modal을 여는 건 흔히 쓰이는 안정적인 패턴"이라 보고 `AlertHost`를 항상 자체 `<Modal>`로만 구현했는데, **iOS 실기기 검증에서 반증됐다** — 이미 present된 Modal 위에 또 다른 Modal을 present하려 하면 iOS가 조용히 거부한다(`Attempt to present <RCTFabricModalHostViewController> ... which is already presenting <RCTFabricModalHostViewController>` 경고만 찍히고 알림이 아예 뜨지 않음). 크래시는 안 나서 겉보기엔 "버튼을 눌러도 반응 없음"처럼 보인다.

해결책은 `AlertHost`에 `embedded` prop을 추가하는 것이다 — `embedded`면 새 네이티브 `<Modal>`을 열지 않고 `position: absolute` 오버레이로 부모 `<Modal>`의 콘텐츠 맨 아래(=시각적으로 맨 위) 자식으로 그린다. 새 UIViewController를 present하지 않으므로 "이미 present 중" 문제 자체가 생기지 않는다. `EditExerciseModal.tsx`·`BackupModal.tsx`·`CameraPermissionModal.tsx` 세 곳 모두 자신의 `<Modal>` 안 마지막 자식으로 `<AlertHost embedded />`를 둔다(리스너 스택 덕분에 이 인스턴스가 해당 화면이 열려 있는 동안 `showAlert`를 대신 받는다).

이 처리가 필요한 실제 호출 경로:
- `EditExerciseModal.tsx`의 "이 운동 삭제" 확인.
- `BackupModal.tsx`의 가져오기 확인(및 내보내기/가져오기 실패).
- `RepsScreen.tsx`/`useVideoCapture.ts`의 권한 요청 실패 — `CameraPermissionModal`이 열려 있는 동안(`handleGrantPermission`이 `requestVideoPermissions()` 실패 시) `showAlert`가 호출된다.

`HomeScreen.tsx`에 있는 "Modal 두 개 동시 노출 금지" 로직(`modalTransitioning`)은 이것과는 다른 문제(서로 다른 두 개의 풀스크린 `slide` Modal을 열고 닫는 전환 타이밍이 겹치는 경우)를 막기 위한 것이라 이 패턴과 무관하다.

## 의존성

새로 추가하는 패키지는 없다. `react-native`의 `Modal`/`Pressable`(이미 `CameraPermissionModal.tsx`에서 사용 중), 기존 `ThemeContext`/`useTranslation`/`theme.ts`(`spacing`/`radius`/`fontSize`)만으로 구현한다.

## 구현 순서

1. `src/lib/i18n/locales/en.ts`의 `common`에 `confirm` 키를 추가하고 `npx tsc --noEmit`으로 `ko.ts`/`ja.ts`/`zh.ts`의 타입 에러를 확인 → 세 파일에 번역값을 채운다.
2. `src/lib/alert.ts`를 작성한다(타입 + `registerAlertListener` + `showAlert`). 이 시점엔 UI가 없어 호출해도 아무 일도 안 일어나지만 타입체크는 통과해야 한다.
3. `src/components/AlertHost.tsx`를 작성한다. `CameraPermissionModal.tsx`의 스타일(backdrop/card/buttonRow)을 복사해 제목·본문·버튼 배열 렌더링 + `buttonStyleFor`/`handlePress`/`handleDismiss`를 구현한다.
4. `App.tsx`의 `AppContent`에 `<AlertHost />`를 추가한다. 아직 아무도 `showAlert`를 호출하지 않으니 화면상 변화는 없다 — 임시로 아무 버튼에 `showAlert('테스트', '본문', [{text:'취소',style:'cancel'},{text:'확인',style:'destructive'}])`를 붙여 카드 디자인·버튼 색·백드롭 탭 닫힘을 눈으로 확인한 뒤 제거한다.
5. 가장 단순한 호출부부터 순서대로 `Alert.alert` → `showAlert`로 교체하며 매번 실제로 눌러 확인한다:
   1. `YoutubeSearchButton.tsx` (버튼 1개, 부모 Modal 없음 — 가장 단순한 케이스로 먼저 검증)
   2. `RepsScreen.tsx`의 촬영 실패 알림 3곳 (버튼 1개)
   3. `useVideoCapture.ts`의 촬영 실패 알림 3곳 (컴포넌트가 아닌 훅에서 호출 — `showAlert`가 훅 밖에서도 동작하는지 확인하는 핵심 케이스)
   4. `GuideVideoPanel.tsx`의 삭제 확인 (버튼 2개, cancel+destructive, 부모 Modal 없음)
   5. `EditExerciseModal.tsx`의 삭제 확인 (버튼 2개, **부모 Modal 위에서** 뜨는 첫 케이스 — 두 Modal 겹침을 실기기로 확인)
   6. `BackupModal.tsx`의 내보내기 실패/가져오기 실패/가져오기 확인 4곳 (가져오기 확인은 **부모 Modal 위 + cancel 버튼의 `busy` 초기화**까지 함께 확인, 기존 `onDismiss` 옵션 제거)
6. 각 파일에서 더 이상 쓰지 않는 `Alert` import(`from 'react-native'`)를 제거한다.
7. `grep -rn "Alert.alert" src`로 남은 호출이 없는지 확인.
8. `npx tsc --noEmit` 최종 통과 확인.

## 스펙 요구사항 대응

| 스펙 요구사항 | 설계 대응 |
|---|---|
| 1. 앱 내 모든 `Alert.alert` 호출(13곳) 교체, 잔여 호출 없음 | 구현 순서 5~7 — 파일별 순차 교체 + 최종 `grep` 검증 |
| 2. 문구·확인/취소 흐름은 그대로 유지 | `showAlert(title, message, buttons)` 시그니처가 `Alert.alert`와 1:1 대응되어 호출부 로직(문구, `onPress`)을 그대로 옮기기만 함 |
| 3. 버튼 1개 알림은 "확인" 하나만 표시 | 데이터 모델 — `buttons` 생략/빈 배열 시 `AlertHost`가 `[{ text: t.common.confirm }]` 기본값 적용 |
| 4. 버튼 2개 알림, 삭제는 위험색 | 핵심 로직 1 — `buttonStyleFor('destructive')`가 `accent.dangerSoft`/`accent.danger` 적용 |
| 5. 백드롭 탭/뒤로가기 = 취소, 파괴적 동작 미실행, `BackupModal` busy 복구 | 핵심 로직 3 — `handleDismiss`가 `cancel` 버튼의 `onPress`만 실행 |
| 6. 화면·컴포넌트·훅 어디서든 호출 가능 | 상태 설계 — 모듈 스코프 pub-sub(`registerAlertListener`/`showAlert`)로 React 트리 바깥에서도 호출 가능; 구현 순서 5-3에서 `useVideoCapture.ts`로 검증 |
| 7. 테마 색상 적용 + 4개 언어 번역 | 핵심 로직 1 — `useAccentColors()` 사용; 데이터 모델 — `common.confirm` 4개 로케일 추가, 타입 파생으로 누락 시 컴파일 에러 |
| 8. 다른 모달과 동시에 떠도 표시 안 깨짐 | 핵심 로직 4 — `embedded` prop으로 부모 Modal 위에 새 네이티브 Modal을 열지 않고 오버레이로 그림(EditExerciseModal·BackupModal·CameraPermissionModal 3곳), embedded 전용 `BackHandler`로 안드로이드 뒤로가기도 알림만 닫도록 처리. iOS/Android 실기기로 직접 확인 |
