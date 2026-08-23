import { totalReps } from './records';
import { getRecords, getRepsRecords } from './storage';
import { Exercise } from './types';

export type HomeStats = {
  hasAnyRecordEver: boolean;
  weeklyActiveDays: number;
  weeklyPrCount: number;
  recordedDates: Set<string>; // 운동 종류 무관, 기록이 하나라도 있었던 모든 로컬 날짜 키 — 활동 기록 화면의 캘린더가 월 이동과 무관하게 항상 정확히 표시하도록 기간 제한 없이 전체를 담는다
  streaksByExerciseId: Record<string, number>;
  // 운동 id -> 그 운동에 기록이 있는 모든 로컬 날짜 키. 캘린더에서 날짜를 눌렀을 때 "그날 한 운동"을
  // 가리는 데 쓴다 — AsyncStorage를 다시 읽지 않고 이미 계산해 둔 값을 동기적으로 필터링만 하면
  // 되므로, 탭할 때마다 재조회하며 생기던 레이스 컨디션(먼저 누른 날짜의 응답이 나중에 도착)이
  // 구조적으로 사라진다.
  dateKeysByExerciseId: Record<string, Set<string>>;
};

const WEEK_DAYS = 7;
const STREAK_RESET_GAP_DAYS = 2;

// new Date(iso)는 로컬 타임존으로 파싱되므로 getFullYear/getMonth/getDate만으로
// 로컬 달력 날짜를 얻을 수 있다(요구사항: 로컬 시간대 기준 날짜 판정).
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

// 두 날짜 키 모두 Date.UTC로 자정 타임스탬프를 만들어 비교한다 — 서머타임 등 지역 규칙과
// 무관하게 항상 정확한 정수 일수 차가 나온다(로컬 자정 시각 자체를 재는 게 아니라
// "그 달력 날짜"를 하나의 절대 기준점으로 재해석해서 뺄셈하는 방식).
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const from = parseKey(fromKey);
  const to = parseKey(toKey);
  const fromUtc = Date.UTC(from.y, from.m - 1, from.d);
  const toUtc = Date.UTC(to.y, to.m - 1, to.d);
  return Math.round((toUtc - fromUtc) / 86400000);
}

export function addDaysToKey(key: string, delta: number): string {
  const { y, m, d } = parseKey(key);
  const next = new Date(Date.UTC(y, m - 1, d + delta));
  const ny = next.getUTCFullYear();
  const nm = `${next.getUTCMonth() + 1}`.padStart(2, '0');
  const nd = `${next.getUTCDate()}`.padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

type DatedValue = { measuredAt: string; value: number };

export async function getExerciseDatedValues(exercise: Exercise): Promise<DatedValue[]> {
  if (exercise.measureType === 'time') {
    const records = await getRecords(exercise.id);
    return records.map((r) => ({ measuredAt: r.measuredAt, value: r.durationMs }));
  }
  const records = await getRepsRecords(exercise.id);
  return records.map((r) => ({ measuredAt: r.measuredAt, value: totalReps(r) }));
}

// 오름차순으로 훑으며 그 시점까지의 최댓값을 갱신한 기록만 "PR 갱신 이벤트"로 센다.
// 맨 첫 기록도 이벤트로 친다 — RecordsScreen이 기록이 하나뿐이어도 그것을 "최고 기록"으로
// 표시하는 것과 같은 기준이다.
function findPrEventDateKeys(datedValues: DatedValue[]): string[] {
  const sorted = [...datedValues].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
  let best = -Infinity;
  const events: string[] = [];
  for (const { measuredAt, value } of sorted) {
    if (value > best) {
      best = value;
      events.push(localDateKey(measuredAt));
    }
  }
  return events;
}

// 가장 최근 기록일부터 거꾸로 하루도 빠짐없이 이어진 날 수. 마지막 기록일이 그저께
// 이전(오늘 기준 이틀 이상 공백)이면 스트릭이 끊긴 것으로 보고 0을 반환한다.
export function computeStreak(dateKeys: Set<string>, today: string): number {
  if (dateKeys.size === 0) return 0;
  const lastKey = [...dateKeys].sort().at(-1) as string;
  if (daysBetweenKeys(lastKey, today) >= STREAK_RESET_GAP_DAYS) return 0;
  let streak = 0;
  let cursor = lastKey;
  while (dateKeys.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

export async function getHomeStats(exercises: Exercise[]): Promise<HomeStats> {
  const today = localDateKey(new Date().toISOString());
  const perExercise = await Promise.all(
    exercises.map(async (exercise) => ({
      exercise,
      datedValues: await getExerciseDatedValues(exercise),
    })),
  );

  const recordedDates = new Set<string>();
  const activeDaysThisWeek = new Set<string>();
  const streaksByExerciseId: Record<string, number> = {};
  const dateKeysByExerciseId: Record<string, Set<string>> = {};
  let weeklyPrCount = 0;
  let hasAnyRecordEver = false;

  for (const { exercise, datedValues } of perExercise) {
    if (datedValues.length > 0) hasAnyRecordEver = true;

    const dateKeys = new Set(datedValues.map((v) => localDateKey(v.measuredAt)));
    dateKeysByExerciseId[exercise.id] = dateKeys;
    for (const key of dateKeys) {
      recordedDates.add(key);
      if (daysBetweenKeys(key, today) < WEEK_DAYS) activeDaysThisWeek.add(key);
    }

    streaksByExerciseId[exercise.id] = computeStreak(dateKeys, today);
    weeklyPrCount += findPrEventDateKeys(datedValues).filter(
      (key) => daysBetweenKeys(key, today) < WEEK_DAYS,
    ).length;
  }

  return {
    hasAnyRecordEver,
    weeklyActiveDays: activeDaysThisWeek.size,
    weeklyPrCount,
    recordedDates,
    streaksByExerciseId,
    dateKeysByExerciseId,
  };
}

// 캘린더에서 특정 날짜를 눌렀을 때, 그날 기록이 있는 운동만 골라 원래 목록 순서 그대로 반환한다.
// getHomeStats가 이미 계산해 둔 dateKeysByExerciseId를 동기적으로 필터링할 뿐, AsyncStorage를
// 다시 읽지 않는다.
export function getExercisesRecordedOn(
  dateKey: string,
  exercises: Exercise[],
  dateKeysByExerciseId: Record<string, Set<string>>,
): Exercise[] {
  return exercises.filter((exercise) => dateKeysByExerciseId[exercise.id]?.has(dateKey));
}
