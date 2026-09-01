import { computeDaysSinceTarget } from './notifications';

describe('computeDaysSinceTarget', () => {
  test('기준일 + N일 뒤, 그날의 hour:minute을 반환한다', () => {
    // computeDaysSinceTarget은 결과가 현재 시각보다 과거면 미래로 앞당기므로, 실제 시계가
    // 기준일을 지나가면(연도가 바뀌는 등) 이 테스트가 깨진다 — 시스템 시간을 기준일로 고정한다.
    const base = '2026-08-23T09:00:00.000Z';
    jest.useFakeTimers().setSystemTime(new Date(base));

    const target = computeDaysSinceTarget(base, 3, 20, 0);

    expect(target.getDate()).toBe(26);
    expect(target.getHours()).toBe(20);
    expect(target.getMinutes()).toBe(0);

    jest.useRealTimers();
  });

  test('계산된 시각이 이미 과거라면(예: N=0이고 자정 시각) 미래로 앞당긴다', () => {
    const now = Date.now();
    // days=0 + hour:minute 00:00 — 자정을 정확히 실행하는 경우가 아니면 항상 오늘 이미 지난 시각이다.
    const target = computeDaysSinceTarget(new Date().toISOString(), 0, 0, 0);

    expect(target.getTime()).toBeGreaterThan(now);
    expect(target.getHours()).toBe(0);
    expect(target.getMinutes()).toBe(0);
  });

  test('반환값은 항상 호출 시점보다 미래다', () => {
    const target = computeDaysSinceTarget(new Date().toISOString(), 1, 0, 0);
    expect(target.getTime()).toBeGreaterThan(Date.now());
  });
});
