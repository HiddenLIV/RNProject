# 홈 화면 주간 PR 카운트 볼륨 기준 반영 — 설계

## 화면 구조

새 화면·컴포넌트는 없다. 순수 로직 변경이며 홈 화면의 "PR N회 경신" 표시 자체는 손대지 않는다.

- `src/lib/records.ts` — 기존 비공개 함수 `totalVolumeKg`를 `export`로 바꿔 `stats.ts`에서 재사용(요구사항 3 — 환산 로직 중복 방지)
- `src/lib/stats.ts` — `getExerciseDatedValues()`가 무게 있는 운동은 `totalVolumeKg`, 그 외는 기존 `totalReps`를 쓰도록 분기

## 상태 설계

새 state 없음. `getHomeStats()`는 이미 `exercises: Exercise[]`를 인자로 받아 각 운동의 `usesWeight`에 접근할 수 있으므로, `getExerciseDatedValues(exercise)` 내부에서 그대로 분기하면 된다. PR 카운트는 기존과 동일하게 홈 화면 렌더 시점마다 `getHomeStats()`가 다시 계산한다(캐시나 저장값 없음).

## 데이터 모델

새 타입 없음. `DatedValue`(`stats.ts:57`)의 `value: number`는 그대로 두고, 그 값을 만드는 방식만 바뀐다 — 무게 있는 운동의 `value`는 이제 "kg 환산 볼륨"을 담는다(비교 전용, 화면에 노출되지 않으므로 요구사항의 "표시는 원 단위 유지" 제약이 적용되지 않는다 — PR 이벤트는 발생 여부만 카운트되고 값 자체는 어디에도 표시되지 않기 때문).

## 핵심 로직

`src/lib/records.ts` — 함수 앞에 `export`만 추가(로직 변경 없음):

```ts
// 변경 전: function totalVolumeKg(record: RepsRecord): number {
export function totalVolumeKg(record: RepsRecord): number {
  return toKg(totalVolume(record), record.weightUnit);
}
```

`src/lib/stats.ts` — `getExerciseDatedValues()`만 수정:

```ts
import { totalReps, totalVolumeKg } from './records';

export async function getExerciseDatedValues(exercise: Exercise): Promise<DatedValue[]> {
  if (exercise.measureType === 'time') {
    const records = await getRecords(exercise.id);
    return records.map((r) => ({ measuredAt: r.measuredAt, value: r.durationMs }));
  }
  const records = await getRepsRecords(exercise.id);
  // usesWeight인 운동은 bestRepsRecord(records.ts)와 동일한 기준(kg 환산 볼륨)으로 PR을
  // 판정한다(요구사항 1, 3) — 기록 화면의 "최고 기록"과 홈 화면의 "PR 경신"이 같은 기록을
  // 두고 서로 다른 결론을 내지 않도록 두 곳에서 같은 비교 함수를 쓴다.
  return records.map((r) => ({
    measuredAt: r.measuredAt,
    value: exercise.usesWeight ? totalVolumeKg(r) : totalReps(r),
  }));
}
```

- 요구사항 1: `exercise.usesWeight` 분기 + `totalVolumeKg` 재사용.
- 요구사항 2: `usesWeight`가 false/undefined면 기존과 동일한 `totalReps` 분기 — 코드 변경 없음, 회귀 없음.
- 요구사항 3·4: `totalVolumeKg`가 이미 kg 환산과 무게 0 처리를 포함하고 있으므로 `stats.ts`는 그대로 위임만 한다 — 새 로직을 만들지 않는다.
- 요구사항 5: `getHomeStats()`의 `weeklyActiveDays`, `weeklyCountsByExerciseId`, `recordedDates` 계산부(`stats.ts:107-128`)는 `dateKeys`(날짜 키 집합)만 사용하고 `value`를 보지 않으므로 이번 변경과 무관 — 실제로 코드를 건드리지 않는다.
- 요구사항 6: `measureType === 'time'` 분기는 그대로 `r.durationMs`를 쓰므로 무변경.
- `findPrEventDateKeys()`(stats.ts:71-82)는 `value`가 무엇이든 상관없이 "직전 최댓값보다 큰가"만 보는 범용 로직이라 수정할 필요가 없다 — `value`를 볼륨으로 바꿔 넣는 것만으로 요구사항이 충족된다.

## 의존성

새 패키지 없음.

## 구현 순서

1. `src/lib/records.ts`의 `totalVolumeKg`에 `export` 추가
2. `src/lib/stats.ts`의 `getExerciseDatedValues()` 수정(위 코드)
3. `src/lib/stats.test.ts`에 무게 있는 reps 운동 헬퍼(`makeWeightedRepsExercise`, `usesWeight: true` 포함) 추가 후 `getHomeStats`에 케이스 보강:
   - 볼륨 큰(횟수 적은) 기록이 PR로 카운트되는 케이스
   - 볼륨 작은(횟수 많은) 기록은 PR로 카운트되지 않는 케이스
   - `usesWeight`가 false/undefined인 reps 운동은 기존 테스트(`이전 기록보다 큰 값이 나올 때마다 PR 갱신으로 센다` 패턴)와 동일하게 횟수 기준 유지(회귀 없음)
   - 시간형 운동의 기존 PR 테스트가 그대로 통과하는지 재확인(회귀 없음)
   - kg/lb 혼합 기록에서 환산 후 PR이 올바르게 판정되는 케이스
4. `npm test` 통과 확인
5. `npx tsc --noEmit`, 수정한 파일 대상 `npx eslint`
6. 에뮬레이터에서: 무게 있는 운동에 "10kg×20회" 저장 후 "20kg×15회" 저장 → 기록 화면 최고 기록 이동과 홈 화면 "이번 주 PR N회 경신" 숫자가 함께(+1) 올라가는지, 무게 없는 운동은 기존처럼 횟수 기준으로 PR이 카운트되는지 수동 확인

## 요구사항 대응 확인

| 스펙 요구사항 | 설계 반영 위치 |
|---|---|
| 1. usesWeight=true는 볼륨(kg 환산) 기준 PR 판정 | `getExerciseDatedValues`의 `usesWeight` 분기 → `totalVolumeKg` |
| 2. usesWeight=false는 기존 유지 | 같은 분기의 `else` → 기존 `totalReps` |
| 3. 단위 다르면 환산 후 비교(로직 재사용) | `records.ts`의 `totalVolumeKg` export해 재사용 |
| 4. 무게 없는 세트는 0 | `totalVolumeKg` → `totalVolume` 내부의 `s.weight ?? 0` 그대로 재사용 |
| 5. 다른 통계 값 무변경 | `weeklyActiveDays`/`weeklyCountsByExerciseId`/`recordedDates` 코드 미수정 |
| 6. 시간형 운동 무변경 | `measureType === 'time'` 분기 코드 미수정 |
