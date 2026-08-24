# Phase 2-1 사용자 요청 사항 — 설계

> 기준 스펙: `docs/specs/Phase 2-1 사용자 요청 사항.md`. 아래 각 절의 번호는 스펙의 요구사항 그룹 번호(1~9)와 대응한다.

## 화면 구조

새 화면은 없다. 기존 컴포넌트를 수정하고, 설정 섹션 하나와 작은 헬퍼 컴포넌트만 추가한다.

| 파일 | 변경 |
|---|---|
| `src/components/SoundHapticsSettingsSection.tsx` (신규) | "알림음 볼륨"(Android 전용) + "진동" 토글 — `ReminderSettingsSection.tsx`와 같은 패턴(자체 storage 읽기/쓰기, `SettingsSheetContent`에 섹션으로 얹힘) |
| `src/components/SettingsSheetContent.tsx` | 새 섹션 추가 (테마·화면모드와 리마인더 사이) |
| `src/components/MonthCalendar.tsx` | 요구사항 3 — 선택 상태 렌더링 버그 수정 |
| `src/components/NumberStepper.tsx` | 요구사항 2 — −/+ 버튼에 눌림 시각 효과 추가 |
| `src/components/RestTimerBanner.tsx` | 요구사항 9 — 동기부여 문구 표시. 요구사항 2 — 건너뛰기 버튼 눌림 효과 |
| `src/screens/RepsScreen.tsx` | 요구사항 4·5·6·7·9의 화면 로직 대부분. 요구사항 2 — 세트 추가/삭제 버튼 눌림 효과. `forwardRef`로 `save()`를 상위에 노출 |
| `src/screens/TimerScreen.tsx` | 요구사항 2 — 시작/취소/정지/재시작 버튼 눌림 효과 |
| `src/screens/HomeScreen.tsx` | 변경 없음 (FAB는 이미 눌림 효과 있음) |
| `src/screens/ExerciseScreen.tsx` | 요구사항 6 — 뒤로가기 가로채서 미저장 세트 확인 alert 처리 |
| `src/lib/haptics.ts` | 요구사항 2 — 진동 on/off 캐시 반영 |
| `src/lib/alarmVolume.ts` (신규) | 요구사항 1 — Android 시스템 볼륨 일시 상향/복원 헬퍼 |
| `src/lib/useTimerAudio.ts` | 요구사항 1·8 — 사운드 재생 시 볼륨 모드 적용, 재생할 사운드 에셋을 파라미터로 받도록 확장 |
| `src/lib/useTimerSettings.ts` | 요구사항 1 — `alarmVolumeMode` 상태·토글 노출 (voiceGuideEnabled와 같은 자리) |
| `src/lib/storage.ts` | 요구사항 1·2·7 — 새 앱 전체 설정 2개 읽기/쓰기, `DEFAULT_SETTINGS.restEnabled` 기본값 변경 |
| `src/lib/types.ts` | 요구사항 1·2·7 — 새 타입/기본값 |
| `assets/sounds/boxing-bell.wav` (신규) + `scripts/make-boxing-bell-sound.js` (신규) | 요구사항 8 |
| `src/lib/i18n/locales/{ko,en,ja,zh}.ts` | 요구사항 1·2·4·6·7의 신규 문구 |

## 상태 설계

### 앱 전체 공통 설정 (voiceGuideEnabled와 동일한 계층)
- **알림음 볼륨 모드**(`alarmVolumeMode: 'device' | 'max'`) — `storage.ts`에 저장, `useTimerSettings`가 `voiceGuideEnabled`와 나란히 읽고 노출한다. `SoundHapticsSettingsSection`도 설정 화면에서 직접 읽고 쓴다(패턴은 `ReminderSettingsSection`과 동일 — 이 섹션이 자기 storage를 스스로 책임진다).
- **진동 사용 여부**(`hapticsEnabled: boolean`) — `storage.ts`에 저장. 문제는 haptics 호출부가 9개 파일에 흩어진 버튼 각각이라는 점이다. `useTimerSettings`처럼 훅으로 각 화면에 내려주고 프롭으로 relay하는 방식은 호출부마다 배선이 늘어난다. 대신 `haptics.ts`에 모듈 스코프 캐시(`let hapticsEnabledCache = true`)를 두고, `tapLight`/`tapMedium`/`tapHeavy`/`notifySuccess` 내부에서 이 캐시를 먼저 확인한 뒤에만 `Haptics.*`를 호출한다. 캐시는 `App.tsx` 최상단에서 앱 시작 시 한 번 storage에서 읽어 채우고(`initHapticsCache()`), 설정 화면에서 토글을 바꾸면 `setHapticsEnabledCache(value)`로 즉시 갱신 + storage에 저장한다. 이 방식은 이 프로젝트에 이미 있는 다른 전역 캐시 없이도 9곳의 호출부 코드를 전혀 건드리지 않고 끌 수 있다는 게 장점이다.

### 운동별 설정 (`Settings` 확장 없음)
- 이번 기능은 `Settings` 타입에 새 필드를 추가하지 않는다. `restEnabled`는 이미 있는 필드이고, 바뀌는 건 `DEFAULT_SETTINGS.restEnabled`의 기본값(`true` → `false`)뿐이다.

### RepsScreen 로컬 상태 (신규/변경)
- `editingIndex: number | null` — 요구사항 5. 수정 중인 세트의 `loggedSets` 인덱스. `null`이면 "새 세트 추가" 모드.
- `unsavedSetsCount`을 상위(ExerciseScreen)로 알리는 방법은 `loggedSets.length`를 그대로 부모 콜백에 전달하는 것으로 충분해 별도 state를 새로 만들지 않는다(useEffect로 relay).
- `forwardRef`로 `{ save: () => Promise<void> }`를 노출해 ExerciseScreen이 "저장 후 뒤로가기" 흐름에서 기존 `handleSave` 로직을 그대로 재사용할 수 있게 한다.

### ExerciseScreen 로컬 상태 (신규)
- `unsavedRepsCount: number` — RepsScreen이 콜백으로 올려주는 현재 미저장 세트 수. 시간형 운동(TimerScreen)에서는 항상 0.
- `repsScreenRef: RefObject<RepsScreenHandle>` — 뒤로가기 확인 alert에서 "저장"을 선택했을 때 호출.
- 뒤로가기 가로채기: 헤더의 뒤로가기 `Pressable.onPress`와, `App.tsx`가 이미 갖고 있는 하드웨어 뒤로가기 `BackHandler` 리스너 둘 다 처리해야 한다. `ExerciseScreen`이 마운트돼 있는 동안 자체 `BackHandler.addEventListener('hardwareBackPress', ...)`를 등록해, `unsavedRepsCount > 0`이면 confirm alert를 띄우고 `true`(처리함)를 반환해 `App.tsx`의 상위 리스너로 전파되지 않게 막는다(RN `BackHandler`는 나중에 등록된 리스너부터 호출하고, `true`를 반환하면 그 아래로 전파를 멈춘다 — 이미 앱이 이 패턴을 `App.tsx`에서 쓰고 있다). 조건이 거짓이면 `false`를 반환해 기존처럼 `App.tsx`의 `goBack`이 그대로 동작한다. 헤더 버튼도 같은 판단 함수(`requestBack`)를 호출하도록 바꾼다.

## 데이터 모델

```ts
// src/lib/types.ts에 추가

export type AlarmVolumeMode = 'device' | 'max';
export const DEFAULT_ALARM_VOLUME_MODE: AlarmVolumeMode = 'device';

// DEFAULT_SETTINGS 기존 값 변경 (필드 추가 아님)
export const DEFAULT_SETTINGS: Settings = {
  countdownSeconds: 5,
  bellIntervalSeconds: 10,
  restSeconds: 60,
  restEnabled: false, // 기존 true → 변경 (요구사항 7-1)
};
```

```ts
// src/lib/storage.ts에 추가 — voiceGuideEnabled/colorSchemeOverride와 같은 패턴, 큐 불필요(단순 덮어쓰기)

const ALARM_VOLUME_MODE_KEY = 'timecheck:alarmVolumeMode:v1';
const HAPTICS_ENABLED_KEY = 'timecheck:hapticsEnabled:v1';

export async function getAlarmVolumeMode(): Promise<AlarmVolumeMode> {
  const raw = await readJson<AlarmVolumeMode | null>(ALARM_VOLUME_MODE_KEY, null);
  return raw === 'max' ? 'max' : 'device';
}
export function setAlarmVolumeMode(mode: AlarmVolumeMode): Promise<void> {
  return AsyncStorage.setItem(ALARM_VOLUME_MODE_KEY, JSON.stringify(mode));
}

export async function getHapticsEnabled(): Promise<boolean> {
  return readJson<boolean>(HAPTICS_ENABLED_KEY, true);
}
export function setHapticsEnabled(enabled: boolean): Promise<void> {
  return AsyncStorage.setItem(HAPTICS_ENABLED_KEY, JSON.stringify(enabled));
}
```

`RepsSet`, `RepsRecord`, `BackupPayload` 등 기존 저장 데이터 구조는 이번 기능으로 바뀌지 않는다 — `BACKUP_SCHEMA_VERSION`을 올릴 필요가 없다(새 설정 2개는 운동별 데이터가 아니라 앱 전체 공통 값이라 지금도 백업 파일 스키마 밖에 있는 `voiceGuideEnabled`와 동일하게 백업 대상에서 제외한다).

## 핵심 로직

### 1. 알림음 볼륨 — Android 시스템 볼륨 일시 상향

```ts
// src/lib/alarmVolume.ts (신규)
import { Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

// bell.wav(0.45s)·복싱벨(예상 1~2s)이 재생되는 동안만 미디어 스트림 볼륨을 최대로 올렸다가
// 되돌린다. useTimerAudio.ts의 restoreModeTimeoutRef(오디오 모드 복귀, 800ms)와 같은 이유로
// 고정 지연 후 복원한다 — 재생 완료 콜백 대신 타임아웃을 쓰는 게 기존 관례.
export async function withMaxVolume(mode: 'device' | 'max', run: () => void, restoreDelayMs = 1500) {
  if (mode !== 'max' || Platform.OS !== 'android') {
    run();
    return;
  }
  let original: number | null = null;
  try {
    const { volume } = await VolumeManager.getVolume();
    original = volume;
    await VolumeManager.setVolume(1, { type: 'music', showUI: false, playSound: false });
  } catch {
    run(); // 볼륨 API 실패 시에도 알림음 자체는 정상 재생한다
    return;
  }
  run();
  setTimeout(() => {
    if (original != null) {
      VolumeManager.setVolume(original, { type: 'music', showUI: false, playSound: false }).catch(() => {});
    }
  }, restoreDelayMs);
}
```

`useTimerAudio.ts`의 `playBellSound`/`playBellSoundWithoutFocus`가 이 헬퍼로 실제 재생(`player.play()`)을 감싸도록 바뀐다. 호출부(TimerScreen, RepsScreen)는 `useTimerSettings`가 내려주는 `alarmVolumeMode`를 그대로 전달한다.

### 8. 재생 사운드 에셋 파라미터화

`playBellSound`가 지금은 `require('../../assets/sounds/bell.wav')`를 하드코딩한다. 파라미터로 받게 바꾼다:

```ts
const playBellSound = (asset = require('../../assets/sounds/bell.wav')) => {
  releaseBell();
  const player = createAudioPlayer(asset);
  bellRef.current = player;
  player.play();
};
```

`RepsScreen`의 `rest = useRestTimer(() => { timerAudio.playBellSoundWithoutFocus(require('../../assets/sounds/boxing-bell.wav'), settings.alarmVolumeMode) ... })`처럼 휴식 종료 시에만 새 에셋을 넘긴다. `TimerScreen`은 인자를 생략해 기존 `bell.wav`를 그대로 쓴다.

### 2. 진동 캐시

```ts
// src/lib/haptics.ts 변경
let hapticsEnabledCache = true;

export function setHapticsEnabledCache(value: boolean) {
  hapticsEnabledCache = value;
}

function safe(fn: () => Promise<void>) {
  if (!hapticsEnabledCache) return;
  fn().catch(() => {});
}
```

`App.tsx`가 시작 시 `getHapticsEnabled().then(setHapticsEnabledCache)`를 한 번 호출한다(기존 강제 업데이트·리마인더 재동기화와 같은 자리, 콜드 스타트 초기화 목록에 추가). `SoundHapticsSettingsSection`은 토글이 바뀌면 `setHapticsEnabledCache(value)`(즉시 캐시 반영) + `setHapticsEnabled(value)`(storage 저장)를 함께 호출한다.

### 2. 버튼 눌림 시각 효과

진동 유무와 무관하게 항상 보이는 `pressed` 스타일을 추가한다(설정값을 각 leaf 컴포넌트까지 내려보내지 않아도 되므로 배선이 단순해지고, 켜짐 상태에서도 촉각+시각 피드백이 같이 있는 게 자연스럽다). 기존에 이미 pressed 스타일이 있는 FAB·ActivityScreen 카드 등은 그대로 둔다. 대상: `NumberStepper`의 증감 버튼, `RepsScreen`의 세트 추가/삭제 버튼, `RestTimerBanner`의 건너뛰기 버튼, `TimerScreen`의 시작/취소/정지/재시작 버튼. `Pressable`의 함수형 `style={({ pressed }) => [...]}`로 `opacity: 0.7`(기존 다른 곳의 관례인 `pressed && { opacity: 0.85~0.9 }`와 톤을 맞춤)을 추가한다.

### 3. 캘린더 선택 렌더링 버그

`MonthCalendar.tsx`의 `dayCircle` 스타일 배열이 원인 후보다: `isToday && !isSelected && {...}`와 `isSelected && { backgroundColor: accent.primary }`가 같은 배열에 조건부로 들어가는데, `dayNumberColor` 계산은 `isSelected ? accent.onPrimary : weekdayTextColor(...)`로 별도 분기라 로직상 사각지대는 안 보인다 — `/dev` 단계에서 실제로 어느 조합에서 텍스트가 사라지는지 실기기(Android)로 먼저 재현한다(라이트/다크 각 프리셋). 유력한 원인 두 가지를 우선 확인한다: (a) `dayNumberColor`가 `accent.onPrimary`인데 이 값이 현재 프리셋에서 `accent.primary`와 색 차이가 거의 없는 경우, (b) 스타일 배열에서 두 조건부 객체가 같은 배열 안에 있을 때 안드로이드 RN이 병합 순서를 다르게 적용하는 경우. 재현되면 `isToday`/`isSelected` 두 상태를 하나의 스타일 객체로 합쳐 배열 병합 자체에 의존하지 않게 고친다.

### 4. "이번 세트" 라벨의 세트 번호

기존에 기록된 세트 행에 이미 쓰이는 `t.reps.setNumberLabel(index + 1)`(예: `No.1`)을 그대로 재사용한다. 라벨 문구는 `t.reps.currentSetLabel`(고정 "이번 세트")과 `t.reps.setNumberLabel(loggedSets.length + 1)`을 조합해 만든다(레이블 문자열 자체는 4개 언어 파일에서 "OO : " 형태로 유지하되, 정확한 구두점은 `/dev`에서 각 언어 파일의 문구 관례에 맞춘다).

### 5. 세트 수정 모드

```ts
const [editingIndex, setEditingIndex] = useState<number | null>(null);

const startEdit = (index: number) => {
  const set = loggedSets[index];
  setEditingIndex(index);
  setCurrentReps(set.reps);
  setCurrentWeightText(set.weight != null ? String(set.weight) : '');
};

const confirmEdit = () => {
  if (editingIndex == null) return;
  setLoggedSets((prev) =>
    prev.map((s, i) =>
      i === editingIndex
        ? { reps: currentReps, weight: exercise.usesWeight ? parseFloat(currentWeightText) || 0 : undefined }
        : s,
    ),
  );
  setEditingIndex(null);
  setCurrentReps(1);
  setCurrentWeightText('');
};
```

`addSet`(기존 함수)은 `editingIndex != null`이면 `confirmEdit`을 호출하고 종료하도록 앞부분에 분기를 추가한다 — "+와 체크는 같은 버튼이 상태만 바뀐 것"이라는 요구사항과 맞아, 별도 버튼을 새로 만들지 않고 기존 `addSet` 핸들러 하나를 재사용한다. 버튼 아이콘은 `editingIndex != null ? 'checkmark' : 'add'`로 바꾼다. 세트 목록의 각 행을 `Pressable`로 감싸 `onPress={() => startEdit(index)}` 추가(기존 삭제 버튼 `Pressable`은 그대로 두고, 그 바깥 행 전체에 새 `Pressable`을 씌운다 — 삭제 버튼 탭이 행 전체의 onPress와 겹치지 않도록 삭제 버튼 쪽에 `hitSlop`은 유지하고 이벤트 버블링만 확인).

### 6. 뒤로가기 미저장 확인

```ts
// RepsScreen: 상위에 세트 수 relay + save 노출
useEffect(() => {
  onUnsavedCountChange?.(loggedSets.length);
}, [loggedSets.length, onUnsavedCountChange]);

useImperativeHandle(ref, () => ({ save: handleSave }));
```

```ts
// ExerciseScreen
const requestBack = () => {
  if (tab === 'measure' && unsavedRepsCount > 0) {
    showAlert(t.reps.unsavedTitle, t.reps.unsavedBody, [
      { text: t.reps.discardButton, style: 'destructive', onPress: onBack },
      { text: t.reps.saveButton, onPress: async () => { await repsScreenRef.current?.save(); onBack(); } },
    ]);
    return;
  }
  onBack();
};
```

기존 `showAlert`(`lib/alert.ts` — `AlertHost` 임베드 패턴)를 그대로 쓴다. `handleSave`는 이미 `saving` 가드가 있어 중복 호출에도 안전하다.

### 7. 휴식 타이머 숨김

`RepsScreen`의 `restSection` JSX에서 `NumberStepper`(휴식 시간)를 `{settings.restEnabled && <NumberStepper .../>}`로 감싼다. 스위치 행(`restEnabledRow`)은 조건 없이 항상 보인다 — 꺼짐 상태에서 이 스위치가 유일한 진입점이 된다.

### 9. 휴식 중 동기부여 문구

```ts
// RepsScreen
const restQuote = useMotivationalQuote(rest.phase === 'resting', t.quotes);
// ...
<RestTimerBanner remainingSec={rest.remainingSec} totalSec={settings.restSeconds} quote={restQuote} onSkip={handleSkipRest} />
```

`RestTimerBanner`에 `quote: string` prop을 추가하고, `TimerScreen`의 `styles.quote`(`color: accent.accent`, `backgroundColor: accent.accentSoft`)와 같은 톤으로 카드 안에 문구 `Text`를 하나 더 그린다.

## 의존성

| 패키지 | 이유 |
|---|---|
| `react-native-volume-manager` | Android 시스템 볼륨(STREAM_MUSIC) 읽기/쓰기 — Expo에는 이 기능을 제공하는 공식 모듈이 없다. RN 0.76+ 지원(이 프로젝트는 RN 0.86), 활발히 유지보수됨. 네이티브 코드가 있어 `npx expo prebuild`/dev client 재빌드가 필요하다(이 프로젝트는 이미 `expo-dev-client`+커스텀 `android`/`ios` 폴더를 쓰고 있어 Expo Go 제약이 없다). iOS 쪽 API(MPVolumeView 기반)는 이번 스코프(Android 전용)에서는 아예 호출하지 않는다. |

그 외 신규 의존성 없음 — 진동 캐시, 세트 수정, 뒤로가기 확인, 휴식 문구는 모두 기존 라이브러리(`expo-haptics`, React 자체 상태/ref)로 구현된다.

## 구현 순서

각 단계가 끝날 때마다 앱에서 바로 확인 가능하도록 잡았다.

1. **타입·storage 기반 다지기** — `types.ts`에 `AlarmVolumeMode` 추가, `DEFAULT_SETTINGS.restEnabled` → `false`. `storage.ts`에 `getAlarmVolumeMode`/`setAlarmVolumeMode`/`getHapticsEnabled`/`setHapticsEnabled` 추가. (확인: 기존 `storage.test.ts`가 여전히 통과하는지, 신규 운동을 열면 휴식 타이머가 꺼짐으로 시작하는지)
2. **요구사항 7 (휴식 타이머 숨김)** — `RepsScreen`의 조건부 렌더링만 바꾸는 가장 작은 변경. (확인: 새 운동은 스위치만, 켜면 스테퍼 등장)
3. **요구사항 4 (세트 번호 라벨)** — 순수 라벨 텍스트 조합. (확인: 세트 추가/삭제할 때마다 번호 갱신)
4. **요구사항 5 (세트 수정)** — `editingIndex` 상태와 `addSet`/`confirmEdit` 분기. (확인: 세트 탭 → 값 채워짐 → 체크로 확정 → 개수 안 늘어남)
5. **요구사항 9 (동기부여 문구)** — `useMotivationalQuote` 재사용, `RestTimerBanner`에 prop 추가. (확인: 휴식 중 문구가 3초마다 바뀜)
6. **요구사항 8 (복싱 벨 사운드)** — `scripts/make-boxing-bell-sound.js` 작성 → `npm run assets:boxing-bell`로 생성 → `useTimerAudio`에 asset 파라미터 추가 → RepsScreen 휴식 종료 콜백에서 새 에셋 사용. (확인: 휴식 종료음이 바뀌고, 시간형 운동 벨은 그대로)
7. **요구사항 2 (진동 on/off + 눌림 효과)** — `haptics.ts` 캐시, `App.tsx` 초기화, 9개 버튼에 pressed 스타일 추가, 설정 섹션에 토글 배치. (확인: 토글 끄면 각 버튼에서 진동 없이 하이라이트만)
8. **요구사항 1 (알림음 볼륨)** — `react-native-volume-manager` 설치 및 prebuild, `alarmVolume.ts`, `useTimerAudio`/`useTimerSettings` 연결, 설정 섹션에 Android 전용 옵션 추가. (확인: Android 실기기에서 볼륨을 낮춰도 "최대" 선택 시 벨이 크게 울리고 원래 볼륨으로 복귀)
9. **요구사항 6 (뒤로가기 확인)** — `RepsScreen`을 `forwardRef`로 전환, `ExerciseScreen`의 `requestBack`/자체 `BackHandler` 리스너. (확인: 세트 1개 이상 상태로 헤더 뒤로가기·하드웨어 뒤로가기 각각에서 alert가 뜨고, 저장/저장 안 함 분기가 정확히 동작)
10. **요구사항 3 (캘린더 버그)** — 실기기 재현 후 렌더링 수정. 다른 항목과 독립적이라 마지막에 별도로 처리해도 무방. (확인: 오늘 날짜 선택 시 숫자가 항상 보임, 라이트/다크·여러 프리셋)
11. **i18n 4개 언어 채우기** — 위 단계들에서 새로 참조한 `t.*` 키를 `ko/en/ja/zh` 모두에 채운다.
12. **`npx tsc --noEmit` + `npm run lint`(신규/수정 파일만) + Android 에뮬레이터 실기기 확인** — 스펙의 성공 기준 체크리스트를 훑는다.

## 스펙 요구사항 ↔ 설계 대응

| 요구사항 | 설계 위치 |
|---|---|
| 1-1~1-7 (알림음 볼륨) | `alarmVolumeMode` 상태, `alarmVolume.ts`, `useTimerAudio` 연결, `SoundHapticsSettingsSection`(Android 전용 렌더링) |
| 2-1~2-5 (진동 on/off) | `hapticsEnabledCache`(`haptics.ts`), `App.tsx` 초기화, `SoundHapticsSettingsSection`, 9개 버튼 pressed 스타일 |
| 3-1~3-3 (캘린더 버그) | `MonthCalendar.tsx` 렌더링 수정 (구현 순서 10단계에서 실기기 재현 후 확정) |
| 4-1~4-4 (세트 번호 라벨) | `t.reps.setNumberLabel` 재사용, `RepsScreen` 라벨 조합 |
| 5-1~5-4 (세트 수정) | `editingIndex` state, `startEdit`/`confirmEdit`, `addSet` 분기 |
| 6-1~6-6 (뒤로가기 확인) | `RepsScreen` `forwardRef`+`onUnsavedCountChange`, `ExerciseScreen` `requestBack`+자체 `BackHandler` |
| 7-1~7-5 (휴식 기본값·숨김) | `DEFAULT_SETTINGS.restEnabled = false`, `RepsScreen` 조건부 `NumberStepper` |
| 8-1~8-3 (복싱 벨) | `assets/sounds/boxing-bell.wav`+생성 스크립트, `playBellSound` asset 파라미터화 |
| 9-1~9-4 (휴식 중 문구) | `useMotivationalQuote` 재사용, `RestTimerBanner`의 `quote` prop |
