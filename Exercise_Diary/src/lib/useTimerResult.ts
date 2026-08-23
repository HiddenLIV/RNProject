import { useState } from 'react';

import { useTranslation } from './i18n';
import { notifyReminderRecordSaved, ReminderNotificationContent } from './notifications';
import { addRecord, createId, removeRecord, updateRecord } from './storage';
import { VideoRef } from './types';

// 1초 미만 정지는 오조작으로 보고 기록하지 않는다
export const MIN_RECORD_MS = 1000;

export type PendingResult = {
  // 1초 이상이 되어 실제로 저장된 적이 있으면 그 기록의 id, 아직 저장 대상이 아니면 null
  id: string | null;
  durationMs: number;
  measuredAt: string; // 정지 시각(ISO) — 보정 중 시간이 흘러도 측정 일시는 그대로 유지
};

// 정지 시점의 기록 저장과, 그 이후 ±1초 보정에 따른 추가 저장/갱신/삭제를 함께 관리한다.
// 1초 이상이 되는 순간 즉시 저장하고, 이후 보정마다 그 기록을 계속 갱신한다 — 메모리에만
// 있는 "아직 저장 안 된" 구간을 최소화해 앱이 백그라운드에서 종료돼도 직전까지 보정한 값이
// 이미 기기에 남아있게 한다.
export function useTimerResult(exerciseId: string) {
  const [pending, setPending] = useState<PendingResult | null>(null);
  const t = useTranslation();

  // N일간 미기록 리마인더가 켜져 있으면, 저장이 실제로 일어날 때마다 카운트를 리셋한다
  // (꺼져 있거나 매일 모드면 notifyReminderRecordSaved 내부에서 조용히 무시된다).
  const reminderContent: ReminderNotificationContent = {
    dailyTitle: t.reminder.dailyNotificationTitle,
    dailyBody: t.reminder.dailyNotificationBody,
    daysSinceTitle: t.reminder.daysSinceNotificationTitle,
    daysSinceBody: t.reminder.daysSinceNotificationBody,
  };
  const notifyRecordSaved = () => notifyReminderRecordSaved(reminderContent).catch(() => {});

  const save = (durationMs: number, videoRef?: VideoRef) => {
    const measuredAt = new Date().toISOString();
    if (durationMs >= MIN_RECORD_MS) {
      const id = createId();
      addRecord(exerciseId, { id, measuredAt, durationMs, videoRef });
      notifyRecordSaved();
      setPending({ id, durationMs, measuredAt });
    } else {
      setPending({ id: null, durationMs, measuredAt });
    }
  };

  const adjust = (deltaMs: number, videoRef?: VideoRef) => {
    setPending((prev) => {
      if (!prev) return prev;
      const durationMs = Math.max(0, prev.durationMs + deltaMs);
      if (durationMs >= MIN_RECORD_MS) {
        if (prev.id) {
          updateRecord(exerciseId, prev.id, { durationMs });
          notifyRecordSaved();
          return { ...prev, durationMs };
        }
        const id = createId();
        addRecord(exerciseId, { id, measuredAt: prev.measuredAt, durationMs, videoRef });
        notifyRecordSaved();
        return { ...prev, id, durationMs };
      }
      if (prev.id) removeRecord(exerciseId, prev.id);
      return { ...prev, id: null, durationMs };
    });
  };

  const reset = () => setPending(null);

  return { pending, save, adjust, reset };
}
