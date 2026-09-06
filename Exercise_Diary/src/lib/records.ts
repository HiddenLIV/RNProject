import { Translations } from './i18n';
import { RepsRecord, TimeRecord } from './types';

export function totalReps(record: RepsRecord): number {
  return record.sets.reduce((sum, s) => sum + s.reps, 0);
}

// 1 lb = 0.45359237 kg (국제 표준 파운드 정의) — bestRepsRecord 내부 비교 전용, 화면 표시 단위·
// 숫자는 그대로 둔다.
const LB_TO_KG = 0.45359237;

function toKg(weight: number, unit?: 'kg' | 'lb'): number {
  return unit === 'lb' ? weight * LB_TO_KG : weight;
}

// 세트별 (무게×횟수)의 합. 무게 없는 세트(weight undefined)는 0으로 취급 — 그 세트의 횟수는
// 볼륨에 기여하지 않지만 기록 자체는 최고 기록 후보 풀에서 배제되지 않는다.
function rawVolume(record: RepsRecord): number {
  return record.sets.reduce((sum, s) => sum + (s.weight ?? 0) * s.reps, 0);
}

// record 저장 당시 단위 그대로 반환한다(화면 표시용). 부동소수점 합산 오차 방지를 위해
// 소수 둘째 자리에서 반올림한다.
export function totalVolume(record: RepsRecord): number {
  return Math.round(rawVolume(record) * 100) / 100;
}

// bestRepsRecord/stats.ts의 PR 판정 등 내부 비교 전용 — kg/lb가 섞인 기록끼리도 정확히
// 비교할 수 있도록 kg으로 환산한다. totalVolume의 반올림된 표시값이 아니라 원본 합산값을
// 환산해, 단위가 다른 기록끼리 비교할 때 이중 반올림으로 인한 오차가 생기지 않게 한다.
// 화면에는 절대 이 값을 쓰지 않는다(표시는 totalVolume을 쓴다).
export function totalVolumeKg(record: RepsRecord): number {
  return toKg(rawVolume(record), record.weightUnit);
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

// usesWeight인 운동만 볼륨(kg 환산) 기준으로 비교하고, 그 외(무게 없는 맨몸 운동)는 기존과
// 동일하게 총 횟수 합으로 비교한다. usesWeight를 생략하면 기존 동작과 완전히 같다(하위 호환).
export function bestRepsRecord(
  records: RepsRecord[],
  resetAt?: string,
  usesWeight?: boolean,
): RepsRecord | null {
  const pool = resetAt ? records.filter((r) => r.measuredAt >= resetAt) : records;
  if (pool.length === 0) return null;
  return usesWeight
    ? pool.reduce((best, r) => (totalVolumeKg(r) > totalVolumeKg(best) ? r : best))
    : pool.reduce((best, r) => (totalReps(r) > totalReps(best) ? r : best));
}

// 최고 기록 카드(RecordsScreen)와 기록 목록 항목(RepsRecordItem)이 같은 형식의 문구를 쓰도록
// 공유하는 헬퍼 — 한쪽만 고치고 다른 쪽을 놓쳐 표시가 어긋나는 것을 방지한다.
export function formatRepsSummary(
  record: RepsRecord,
  usesWeight: boolean | undefined,
  t: Translations,
): string {
  if (!usesWeight) {
    return t.records.setsAndReps(record.sets.length, totalReps(record));
  }
  const unitLabel = record.weightUnit === 'lb' ? t.units.lb : t.units.kg;
  return t.records.setsRepsVolume(
    record.sets.length,
    totalReps(record),
    totalVolume(record),
    unitLabel,
  );
}
