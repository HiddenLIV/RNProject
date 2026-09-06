/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addDaysToKey,
  countThisWeek,
  daysBetweenKeys,
  getHomeStats,
  getWeekStartKey,
  localDateKey,
} from './stats';
import { addRecord, addRepsRecord } from './storage';
import { Exercise } from './types';

function makeTimeExercise(id: string): Exercise {
  return { id, name: `time-${id}`, icon: 'barbell-outline', measureType: 'time' };
}

function makeRepsExercise(id: string): Exercise {
  return { id, name: `reps-${id}`, icon: 'barbell-outline', measureType: 'reps' };
}

function makeWeightedRepsExercise(id: string, weightUnit: 'kg' | 'lb' = 'kg'): Exercise {
  return {
    id,
    name: `weighted-reps-${id}`,
    icon: 'barbell-outline',
    measureType: 'reps',
    usesWeight: true,
    weightUnit,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('localDateKey', () => {
  test('ISO 문자열을 로컬 달력 날짜(YYYY-MM-DD)로 바꾼다', () => {
    const iso = new Date(2026, 7, 23, 15, 30).toISOString(); // 로컬 2026-08-23 15:30
    expect(localDateKey(iso)).toBe('2026-08-23');
  });
});

describe('daysBetweenKeys / addDaysToKey', () => {
  test('같은 날짜면 0', () => {
    expect(daysBetweenKeys('2026-08-23', '2026-08-23')).toBe(0);
  });

  test('월 경계를 넘어가도 정확한 일수 차를 계산한다', () => {
    expect(daysBetweenKeys('2026-08-30', '2026-09-02')).toBe(3);
  });

  test('addDaysToKey로 며칠 전/후 날짜 키를 구할 수 있다', () => {
    expect(addDaysToKey('2026-08-23', -1)).toBe('2026-08-22');
    expect(addDaysToKey('2026-08-23', 8)).toBe('2026-08-31');
  });
});

describe('getWeekStartKey', () => {
  test('일요일이면 그 주의 월요일을 반환한다', () => {
    expect(getWeekStartKey('2026-08-23')).toBe('2026-08-17'); // 2026-08-23은 일요일
  });

  test('월요일이면 자기 자신을 반환한다', () => {
    expect(getWeekStartKey('2026-08-17')).toBe('2026-08-17');
  });

  test('주 중간 날짜도 같은 주의 월요일로 정규화된다', () => {
    expect(getWeekStartKey('2026-08-20')).toBe('2026-08-17'); // 목요일
  });
});

describe('countThisWeek', () => {
  test('기록이 없으면 0', () => {
    expect(countThisWeek(new Set(), '2026-08-23')).toBe(0);
  });

  test('이번 주(월~일) 안의 날짜만 센다', () => {
    const dates = new Set(['2026-08-21', '2026-08-22', '2026-08-23']);
    expect(countThisWeek(dates, '2026-08-23')).toBe(3);
  });

  test('지난 주 기록은 이번 주 횟수에 포함되지 않는다', () => {
    const dates = new Set(['2026-08-10', '2026-08-22', '2026-08-23']);
    expect(countThisWeek(dates, '2026-08-23')).toBe(2);
  });

  test('이번 주 기록이 전혀 없으면 0', () => {
    const dates = new Set(['2026-08-10', '2026-08-16']);
    expect(countThisWeek(dates, '2026-08-23')).toBe(0);
  });
});

describe('getHomeStats', () => {
  const today = new Date(2026, 7, 23, 12, 0); // 로컬 2026-08-23 정오

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(today);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('기록이 전혀 없으면 hasAnyRecordEver가 false다', async () => {
    const stats = await getHomeStats([makeTimeExercise('a')]);
    expect(stats.hasAnyRecordEver).toBe(false);
    expect(stats.weeklyActiveDays).toBe(0);
    expect(stats.weeklyPrCount).toBe(0);
    expect(stats.weeklyCountsByExerciseId.a).toBe(0);
  });

  test('운동별 이번 주 횟수는 서로 영향을 주지 않는다', async () => {
    const hangExercise = makeTimeExercise('hang');
    const squatExercise = makeRepsExercise('squat');

    // hang: 이번 주 3일 기록
    for (const offset of [0, 1, 2]) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      await addRecord(hangExercise.id, {
        id: `hang-${offset}`,
        measuredAt: date.toISOString(),
        durationMs: 10000 + offset,
      });
    }
    // squat: 오늘 딱 하루만 기록
    await addRepsRecord(squatExercise.id, {
      id: 'squat-0',
      measuredAt: today.toISOString(),
      sets: [{ reps: 10 }],
    });

    const stats = await getHomeStats([hangExercise, squatExercise]);

    expect(stats.hasAnyRecordEver).toBe(true);
    expect(stats.weeklyCountsByExerciseId.hang).toBe(3);
    expect(stats.weeklyCountsByExerciseId.squat).toBe(1);
    expect(stats.weeklyActiveDays).toBe(3); // 두 운동을 합쳐도 활동일수는 겹치는 날짜를 중복 세지 않음
  });

  test('7일보다 오래된 기록은 이번 주 요약에 포함되지 않는다', async () => {
    const exercise = makeTimeExercise('old');
    const oldDate = new Date(today);
    oldDate.setDate(oldDate.getDate() - 10);
    await addRecord(exercise.id, {
      id: 'old-1',
      measuredAt: oldDate.toISOString(),
      durationMs: 5000,
    });

    const stats = await getHomeStats([exercise]);

    expect(stats.weeklyActiveDays).toBe(0);
    expect(stats.weeklyPrCount).toBe(0);
    expect(stats.recordedDates.has(localDateKey(oldDate.toISOString()))).toBe(true); // 기간 제한 없이 전체 기록에 포함
  });

  test('이전 기록보다 큰 값이 나올 때마다 PR 갱신으로 센다', async () => {
    const exercise = makeTimeExercise('pr');
    const earlier = new Date(today.getTime() - 60_000);
    await addRecord(exercise.id, {
      id: 'pr-1',
      measuredAt: earlier.toISOString(),
      durationMs: 5000,
    }); // 첫 기록 — PR 1회
    await addRecord(exercise.id, {
      id: 'pr-2',
      measuredAt: today.toISOString(),
      durationMs: 3000,
    }); // 기존 최고보다 낮음 — PR 아님

    const stats = await getHomeStats([exercise]);

    expect(stats.weeklyPrCount).toBe(1);
  });

  test('무게 있는 운동은 횟수가 적어도 볼륨이 크면 PR로 센다', async () => {
    const exercise = makeWeightedRepsExercise('bench');
    const earlier = new Date(today.getTime() - 60_000);
    await addRepsRecord(exercise.id, {
      id: 'bench-1',
      measuredAt: earlier.toISOString(),
      sets: [{ reps: 20, weight: 10 }], // 볼륨 200
      weightUnit: 'kg',
    });
    await addRepsRecord(exercise.id, {
      id: 'bench-2',
      measuredAt: today.toISOString(),
      sets: [{ reps: 15, weight: 20 }], // 볼륨 300 — 횟수는 더 적지만 볼륨은 더 큼
      weightUnit: 'kg',
    });

    const stats = await getHomeStats([exercise]);

    expect(stats.weeklyPrCount).toBe(2); // 첫 기록 + 볼륨 갱신된 두 번째 기록
  });

  test('무게 있는 운동은 횟수가 많아도 볼륨이 작으면 PR로 세지 않는다', async () => {
    const exercise = makeWeightedRepsExercise('bench');
    const earlier = new Date(today.getTime() - 60_000);
    await addRepsRecord(exercise.id, {
      id: 'bench-1',
      measuredAt: earlier.toISOString(),
      sets: [{ reps: 15, weight: 20 }], // 볼륨 300
      weightUnit: 'kg',
    });
    await addRepsRecord(exercise.id, {
      id: 'bench-2',
      measuredAt: today.toISOString(),
      sets: [{ reps: 30, weight: 5 }], // 볼륨 150 — 횟수는 더 많지만 볼륨은 더 작음
      weightUnit: 'kg',
    });

    const stats = await getHomeStats([exercise]);

    expect(stats.weeklyPrCount).toBe(1); // 첫 기록만 PR
  });

  test('무게 없는 운동은 기존과 동일하게 횟수 기준으로 PR을 센다(회귀 없음)', async () => {
    const exercise = makeRepsExercise('pushup');
    const earlier = new Date(today.getTime() - 60_000);
    await addRepsRecord(exercise.id, {
      id: 'pushup-1',
      measuredAt: earlier.toISOString(),
      sets: [{ reps: 10 }],
    });
    await addRepsRecord(exercise.id, {
      id: 'pushup-2',
      measuredAt: today.toISOString(),
      sets: [{ reps: 8 }], // 이전보다 횟수가 적음 — PR 아님
    });

    const stats = await getHomeStats([exercise]);

    expect(stats.weeklyPrCount).toBe(1);
  });

  test('kg/lb 단위가 섞인 기록도 환산해 올바르게 PR을 판정한다', async () => {
    const exercise = makeWeightedRepsExercise('bench');
    const earlier = new Date(today.getTime() - 60_000);
    await addRepsRecord(exercise.id, {
      id: 'bench-1',
      measuredAt: earlier.toISOString(),
      sets: [{ reps: 10, weight: 20 }], // 200kg
      weightUnit: 'kg',
    });
    await addRepsRecord(exercise.id, {
      id: 'bench-2',
      measuredAt: today.toISOString(),
      sets: [{ reps: 5, weight: 100 }], // 100lb×5 ≈ 226.8kg — 환산하면 더 큼
      weightUnit: 'lb',
    });

    const stats = await getHomeStats([exercise]);

    expect(stats.weeklyPrCount).toBe(2);
  });
});
