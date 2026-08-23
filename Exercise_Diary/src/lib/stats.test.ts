/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDaysToKey, computeStreak, daysBetweenKeys, getHomeStats, localDateKey } from './stats';
import { addRecord, addRepsRecord } from './storage';
import { Exercise } from './types';

function makeTimeExercise(id: string): Exercise {
  return { id, name: `time-${id}`, icon: 'barbell-outline', measureType: 'time' };
}

function makeRepsExercise(id: string): Exercise {
  return { id, name: `reps-${id}`, icon: 'barbell-outline', measureType: 'reps' };
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

describe('computeStreak', () => {
  test('기록이 없으면 0', () => {
    expect(computeStreak(new Set(), '2026-08-23')).toBe(0);
  });

  test('오늘까지 연속 3일 기록이면 3', () => {
    const dates = new Set(['2026-08-21', '2026-08-22', '2026-08-23']);
    expect(computeStreak(dates, '2026-08-23')).toBe(3);
  });

  test('어제까지만 기록해도(오늘 아직 미기록) 스트릭이 유지된다', () => {
    const dates = new Set(['2026-08-20', '2026-08-21', '2026-08-22']);
    expect(computeStreak(dates, '2026-08-23')).toBe(3);
  });

  test('그저께 이전이 마지막 기록이면 0으로 리셋된다', () => {
    const dates = new Set(['2026-08-19', '2026-08-20', '2026-08-21']);
    expect(computeStreak(dates, '2026-08-23')).toBe(0);
  });

  test('중간에 공백이 있으면 마지막 연속 구간만 센다', () => {
    const dates = new Set(['2026-08-10', '2026-08-22', '2026-08-23']);
    expect(computeStreak(dates, '2026-08-23')).toBe(2);
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
    expect(stats.streaksByExerciseId.a).toBe(0);
  });

  test('운동별 스트릭은 서로 영향을 주지 않는다', async () => {
    const hangExercise = makeTimeExercise('hang');
    const squatExercise = makeRepsExercise('squat');

    // hang: 최근 3일 연속 기록
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
    expect(stats.streaksByExerciseId.hang).toBe(3);
    expect(stats.streaksByExerciseId.squat).toBe(1);
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
});
