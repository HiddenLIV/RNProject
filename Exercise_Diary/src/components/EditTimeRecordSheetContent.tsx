import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { addRecord, createId, removeRecord, updateRecord } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { TimeRecord } from '../lib/types';
import { MIN_RECORD_MS } from '../lib/useTimerResult';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import TimeDisplay from './TimeDisplay';

type Props = {
  record: TimeRecord;
  exerciseId: string;
  /** 조정될 때마다 즉시 불린다 — 삭제되면(1초 미만) null */
  onChanged: (next: TimeRecord | null) => void;
};

// "기록 시간 보정"(정지 직후 결과 화면)과 완전히 같은 규칙을 오늘 저장된 과거 기록에도 그대로
// 적용한다 — 누를 때마다 즉시 반영되고, 1초 미만으로 내려가면 기록이 삭제되며(다시 1초 이상으로
// 올리면 같은 measuredAt으로 되살아난다), 별도의 저장 버튼은 없다.
export default function EditTimeRecordSheetContent({ record, exerciseId, onChanged }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [durationMs, setDurationMs] = useState(record.durationMs);
  // 1초 미만으로 내려가 삭제된 상태면 null — 이 상태에서 +1초를 누르면 새 id로 다시 저장된다.
  const [savedId, setSavedId] = useState<string | null>(record.id);

  const adjust = (deltaMs: number) => {
    const next = Math.max(0, durationMs + deltaMs);
    setDurationMs(next);
    if (next >= MIN_RECORD_MS) {
      if (savedId) {
        updateRecord(exerciseId, savedId, { durationMs: next });
        onChanged({ ...record, id: savedId, durationMs: next });
      } else {
        const id = createId();
        addRecord(exerciseId, { ...record, id, durationMs: next });
        setSavedId(id);
        onChanged({ ...record, id, durationMs: next });
      }
    } else if (savedId) {
      removeRecord(exerciseId, savedId);
      setSavedId(null);
      onChanged(null);
    }
  };

  return (
    <View style={styles.container}>
      <TimeDisplay ms={durationMs} />
      <View style={styles.adjustRow}>
        <Pressable
          style={[
            styles.adjustButton,
            { borderColor: accent.accent },
            durationMs < MIN_RECORD_MS && styles.adjustButtonDisabled,
          ]}
          onPress={() => adjust(-1000)}
          disabled={durationMs < MIN_RECORD_MS}
        >
          <Text style={[styles.adjustButtonText, { color: accent.accent }]}>
            {t.timer.minusOneSecond}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.adjustButton, { borderColor: accent.accent }]}
          onPress={() => adjust(1000)}
        >
          <Text style={[styles.adjustButtonText, { color: accent.accent }]}>
            {t.timer.plusOneSecond}
          </Text>
        </Pressable>
      </View>
      {durationMs < MIN_RECORD_MS && (
        <Text style={[styles.notSaved, { color: accent.textFaint }]}>{t.timer.notSavedNotice}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  adjustButton: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonDisabled: {
    opacity: 0.4,
  },
  adjustButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  notSaved: {
    fontSize: fontSize.sm,
  },
});
