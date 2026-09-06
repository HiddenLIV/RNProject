/// <reference types="jest" />
import { bestRepsRecord, bestTimeRecord, isToday, totalReps, totalVolume } from './records';
import { RepsRecord, RepsSet, TimeRecord } from './types';

function timeRecord(id: string, durationMs: number, measuredAt: string): TimeRecord {
  return { id, durationMs, measuredAt };
}

function repsRecord(id: string, reps: number[], measuredAt: string): RepsRecord {
  return { id, measuredAt, sets: reps.map((r) => ({ reps: r })) };
}

function weightedRepsRecord(
  id: string,
  sets: RepsSet[],
  measuredAt: string,
  weightUnit?: 'kg' | 'lb',
): RepsRecord {
  return { id, measuredAt, sets, weightUnit };
}

describe('totalReps', () => {
  test('세트별 횟수를 합산한다', () => {
    expect(totalReps(repsRecord('a', [10, 8, 6], '2026-08-01T00:00:00.000Z'))).toBe(24);
  });
});

describe('totalVolume', () => {
  test('세트별 (무게×횟수)를 record 저장 당시 단위 그대로 합산한다(환산 없음)', () => {
    const record = weightedRepsRecord(
      'a',
      [
        { reps: 10, weight: 20 },
        { reps: 8, weight: 22.5 },
      ],
      '2026-08-01T00:00:00.000Z',
      'lb',
    );
    // 20*10 + 22.5*8 = 200 + 180 = 380 (lb 단위 그대로, kg 환산 없음)
    expect(totalVolume(record)).toBe(380);
  });

  test('무게 없는 세트는 0으로 취급한다', () => {
    const record = weightedRepsRecord(
      'a',
      [
        { reps: 10, weight: 20 },
        { reps: 5 }, // weight 없음
      ],
      '2026-08-01T00:00:00.000Z',
      'kg',
    );
    expect(totalVolume(record)).toBe(200);
  });
});

describe('isToday', () => {
  test('오늘 날짜(로컬)면 true', () => {
    expect(isToday(new Date().toISOString())).toBe(true);
  });

  test('어제 날짜면 false', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday.toISOString())).toBe(false);
  });

  test('자정 직전 로컬 날짜와 자정 직후 UTC 경계에서도 로컬 날짜 기준으로 판정한다', () => {
    // 로컬 타임존과 무관하게, "오늘 00:00~23:59" 범위의 임의 시각은 항상 true
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 1);
    expect(isToday(startOfDay.toISOString())).toBe(true);
  });
});

describe('bestTimeRecord', () => {
  test('기록이 없으면 null', () => {
    expect(bestTimeRecord([])).toBeNull();
  });

  test('resetAt 없이 전체 기간 중 가장 긴 기록을 고른다', () => {
    const records = [
      timeRecord('a', 30000, '2026-08-01T00:00:00.000Z'),
      timeRecord('b', 50000, '2026-08-15T00:00:00.000Z'),
      timeRecord('c', 45000, '2026-08-20T00:00:00.000Z'),
    ];
    expect(bestTimeRecord(records)?.id).toBe('b');
  });

  test('resetAt 이전 기록은 후보에서 제외한다', () => {
    const records = [
      timeRecord('a', 50000, '2026-08-01T00:00:00.000Z'), // 리셋 이전의 최고 기록 — 제외돼야 함
      timeRecord('b', 40000, '2026-09-05T00:00:00.000Z'),
    ];
    const resetAt = '2026-09-01T00:00:00.000Z';
    expect(bestTimeRecord(records, resetAt)?.id).toBe('b');
  });

  test('resetAt 이후 기록이 하나도 없으면 null(리셋 이후 기록 없음 상태)', () => {
    const records = [timeRecord('a', 50000, '2026-08-01T00:00:00.000Z')];
    const resetAt = '2026-09-01T00:00:00.000Z';
    expect(bestTimeRecord(records, resetAt)).toBeNull();
  });
});

describe('bestRepsRecord', () => {
  test('기록이 없으면 null', () => {
    expect(bestRepsRecord([])).toBeNull();
  });

  test('총 횟수가 가장 많은 기록을 고른다', () => {
    const records = [
      repsRecord('a', [10, 10], '2026-08-01T00:00:00.000Z'), // 20
      repsRecord('b', [15, 15, 15], '2026-08-15T00:00:00.000Z'), // 45
      repsRecord('c', [10, 10, 10], '2026-08-20T00:00:00.000Z'), // 30
    ];
    expect(bestRepsRecord(records)?.id).toBe('b');
  });

  test('resetAt 이전 기록은 후보에서 제외한다', () => {
    const records = [
      repsRecord('a', [50], '2026-08-01T00:00:00.000Z'),
      repsRecord('b', [40], '2026-09-05T00:00:00.000Z'),
    ];
    const resetAt = '2026-09-01T00:00:00.000Z';
    expect(bestRepsRecord(records, resetAt)?.id).toBe('b');
  });

  test('usesWeight=true면 횟수가 적어도 볼륨이 큰 기록을 고른다', () => {
    const records = [
      // 10kg×20회 = 볼륨 200
      weightedRepsRecord('a', [{ reps: 20, weight: 10 }], '2026-08-01T00:00:00.000Z', 'kg'),
      // 20kg×15회 = 볼륨 300 — 횟수는 더 적지만 볼륨은 더 크다
      weightedRepsRecord('b', [{ reps: 15, weight: 20 }], '2026-08-15T00:00:00.000Z', 'kg'),
    ];
    expect(bestRepsRecord(records, undefined, true)?.id).toBe('b');
  });

  test('usesWeight=true면 횟수가 많아도 볼륨이 작은 기록은 고르지 않는다', () => {
    const records = [
      // 20kg×15회 = 볼륨 300
      weightedRepsRecord('a', [{ reps: 15, weight: 20 }], '2026-08-01T00:00:00.000Z', 'kg'),
      // 5kg×30회 = 볼륨 150 — 횟수는 더 많지만 볼륨은 더 작다
      weightedRepsRecord('b', [{ reps: 30, weight: 5 }], '2026-08-15T00:00:00.000Z', 'kg'),
    ];
    expect(bestRepsRecord(records, undefined, true)?.id).toBe('a');
  });

  test('usesWeight가 false/undefined면 기존과 동일하게 횟수 합으로만 비교한다(회귀 없음)', () => {
    const records = [
      // 볼륨은 a(200)가 b(150)보다 크지만, usesWeight가 아니므로 횟수만 비교해야 한다
      weightedRepsRecord('a', [{ reps: 10, weight: 20 }], '2026-08-01T00:00:00.000Z', 'kg'),
      weightedRepsRecord('b', [{ reps: 30, weight: 5 }], '2026-08-15T00:00:00.000Z', 'kg'),
    ];
    expect(bestRepsRecord(records, undefined, false)?.id).toBe('b');
    expect(bestRepsRecord(records)?.id).toBe('b');
  });

  test('usesWeight=true일 때 무게 없는 세트가 섞인 기록도 후보 풀에 남고 0으로 계산된다', () => {
    const records = [
      weightedRepsRecord('a', [{ reps: 10, weight: 20 }], '2026-08-01T00:00:00.000Z', 'kg'), // 200
      weightedRepsRecord('b', [{ reps: 100 }], '2026-08-15T00:00:00.000Z', 'kg'), // weight 없음 → 0
    ];
    expect(bestRepsRecord(records, undefined, true)?.id).toBe('a');
  });

  test('usesWeight=true면 kg/lb 단위가 섞인 기록도 환산해 올바르게 비교한다', () => {
    const records = [
      // 20kg×10회 = 200kg
      weightedRepsRecord('a', [{ reps: 10, weight: 20 }], '2026-08-01T00:00:00.000Z', 'kg'),
      // 100lb×5회 = 500(lb 단위 숫자), kg 환산하면 500*0.45359237 ≈ 226.8kg — a보다 크다
      weightedRepsRecord('b', [{ reps: 5, weight: 100 }], '2026-08-15T00:00:00.000Z', 'lb'),
    ];
    expect(bestRepsRecord(records, undefined, true)?.id).toBe('b');
  });

  test('resetAt과 usesWeight를 함께 적용하면 리셋 이후 기록끼리만 볼륨으로 비교한다', () => {
    const records = [
      // 리셋 이전의 최고 볼륨(500) — 제외돼야 함
      weightedRepsRecord('a', [{ reps: 10, weight: 50 }], '2026-08-01T00:00:00.000Z', 'kg'),
      weightedRepsRecord('b', [{ reps: 10, weight: 10 }], '2026-09-05T00:00:00.000Z', 'kg'), // 100
      weightedRepsRecord('c', [{ reps: 10, weight: 20 }], '2026-09-06T00:00:00.000Z', 'kg'), // 200
    ];
    const resetAt = '2026-09-01T00:00:00.000Z';
    expect(bestRepsRecord(records, resetAt, true)?.id).toBe('c');
  });
});
