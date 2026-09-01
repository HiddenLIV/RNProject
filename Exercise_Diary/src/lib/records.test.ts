/// <reference types="jest" />
import { bestRepsRecord, bestTimeRecord, isToday, totalReps } from './records';
import { RepsRecord, TimeRecord } from './types';

function timeRecord(id: string, durationMs: number, measuredAt: string): TimeRecord {
  return { id, durationMs, measuredAt };
}

function repsRecord(id: string, reps: number[], measuredAt: string): RepsRecord {
  return { id, measuredAt, sets: reps.map((r) => ({ reps: r })) };
}

describe('totalReps', () => {
  test('세트별 횟수를 합산한다', () => {
    expect(totalReps(repsRecord('a', [10, 8, 6], '2026-08-01T00:00:00.000Z'))).toBe(24);
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
});
