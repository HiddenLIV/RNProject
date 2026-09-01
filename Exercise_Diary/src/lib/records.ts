import { RepsRecord, TimeRecord } from './types';

export function totalReps(record: RepsRecord): number {
  return record.sets.reduce((sum, s) => sum + s.reps, 0);
}

// new Date(iso)는 로컬 타임존으로 파싱되므로 연/월/일 필드 비교만으로 "오늘(기기 로컬 날짜)"인지
// 판정할 수 있다 — 자정이 지나면 어제 기록은 자연히 false가 된다.
export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// measuredAt은 ISO 8601 문자열이라 Date 파싱 없이 사전순 비교(>=)로 시간순 비교를 대신할 수 있다
// (storage.ts의 getMostRecentRecordAt과 같은 이유).
export function bestTimeRecord(records: TimeRecord[], resetAt?: string): TimeRecord | null {
  const pool = resetAt ? records.filter((r) => r.measuredAt >= resetAt) : records;
  return pool.length > 0
    ? pool.reduce((best, r) => (r.durationMs > best.durationMs ? r : best))
    : null;
}

export function bestRepsRecord(records: RepsRecord[], resetAt?: string): RepsRecord | null {
  const pool = resetAt ? records.filter((r) => r.measuredAt >= resetAt) : records;
  return pool.length > 0
    ? pool.reduce((best, r) => (totalReps(r) > totalReps(best) ? r : best))
    : null;
}
