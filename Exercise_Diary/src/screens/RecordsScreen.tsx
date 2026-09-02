import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import BottomSheet from '../components/BottomSheet';
import EditRepsRecordSheetContent from '../components/EditRepsRecordSheetContent';
import EditTimeRecordSheetContent from '../components/EditTimeRecordSheetContent';
import RecordItem from '../components/RecordItem';
import RepsRecordItem from '../components/RepsRecordItem';
import { formatDuration } from '../components/TimeDisplay';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { showAlert } from '../lib/alert';
import { Translations, useTranslation } from '../lib/i18n';
import { bestRepsRecord, bestTimeRecord, totalReps } from '../lib/records';
import { getRecords, getRepsRecords, removeRecord, removeRepsRecord } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise, RepsRecord, TimeRecord } from '../lib/types';
import { useTimerSettings } from '../lib/useTimerSettings';
import { cardShadow, fontSize, radius, spacing } from '../theme';

function formatDateTitle(iso: string, weekdays: string[]): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${weekdays[d.getDay()]})`;
}

// 삭제는 되돌릴 수 없으므로(최고 기록이 걸린 세트일 수도 있다) 항상 확인을 받는다
function confirmDelete(t: Translations, onConfirm: () => void) {
  showAlert(t.records.deleteConfirmTitle, t.records.deleteConfirmBody, [
    { text: t.common.cancel, style: 'cancel' },
    { text: t.common.delete, style: 'destructive', onPress: onConfirm },
  ]);
}

// 최고 기록 리셋은 되돌릴 수 없으므로(리셋 이전 기록은 다시는 최고 기록으로 안 뜬다) 항상 확인을 받는다
function confirmResetBest(t: Translations, onConfirm: () => void) {
  showAlert(t.records.resetBestConfirmTitle, t.records.resetBestConfirmBody, [
    { text: t.common.cancel, style: 'cancel' },
    { text: t.records.resetBestButton, style: 'destructive', onPress: onConfirm },
  ]);
}

// 기록이 최신순이므로 삽입 순서를 보존하는 Map으로 묶으면 섹션도 최신 날짜부터 나온다
function groupByDate<T extends { measuredAt: string }>(
  records: T[],
  weekdays: string[],
): { title: string; data: T[] }[] {
  const byDate = new Map<string, T[]>();
  for (const record of records) {
    const title = formatDateTitle(record.measuredAt, weekdays);
    const group = byDate.get(title);
    if (group) {
      group.push(record);
    } else {
      byDate.set(title, [record]);
    }
  }
  return [...byDate.entries()].map(([title, data]) => ({ title, data }));
}

type Props = {
  exercise: Exercise;
};

export default function RecordsScreen({ exercise }: Props) {
  if (exercise.measureType === 'time') {
    return <TimeRecordsScreen exercise={exercise} />;
  }
  return <RepsRecordsScreen exercise={exercise} />;
}

function TimeRecordsScreen({ exercise }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [viewingUri, setViewingUri] = useState<string | null>(null);
  // editingRecord는 시트를 여는 시점의 초기값 + "시트가 열려 있는지"만 나타낸다 — 값이 바뀌어도
  // (아래 handleRecordChanged) 다시 갱신하지 않는다. 1초 미만으로 내려가 기록이 삭제돼도 시트가
  // 즉시 닫혀버리지 않고 열린 채로 남아있어야 "기록 시간 보정"과 동일하게 +1초로 되살릴 수 있다.
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  // 시트가 열려있는 동안 EditTimeRecordSheetContent 내부에서 삭제→재생성으로 id가 바뀔 수 있어,
  // records 목록에서 어느 항목을 갱신/제거해야 하는지는 이 ref로 계속 추적한다.
  const editingIdRef = useRef<string | null>(null);
  const { settings, updateSettings } = useTimerSettings(exercise.id);

  useEffect(() => {
    getRecords(exercise.id).then(setRecords);
  }, [exercise.id]);

  const handleDelete = (id: string) => {
    confirmDelete(t, async () => {
      const next = await removeRecord(exercise.id, id);
      setRecords(next);
    });
  };

  const handleStartEdit = (record: TimeRecord) => {
    editingIdRef.current = record.id;
    setEditingRecord(record);
  };

  const handleCloseEdit = () => {
    setEditingRecord(null);
    editingIdRef.current = null;
  };

  const handleRecordChanged = (next: TimeRecord | null) => {
    setRecords((prev) => {
      const targetId = editingIdRef.current;
      const index = prev.findIndex((r) => r.id === targetId);
      if (index === -1) return next ? [next, ...prev] : prev;
      const copy = [...prev];
      if (next) {
        copy[index] = next;
      } else {
        copy.splice(index, 1);
      }
      return copy;
    });
    editingIdRef.current = next?.id ?? null;
  };

  const handleResetBest = () => {
    confirmResetBest(t, () => updateSettings({ bestRecordResetAt: new Date().toISOString() }));
  };

  const bestRecord = bestTimeRecord(records, settings.bestRecordResetAt);
  const bestState: BestCardState | null =
    records.length === 0
      ? null
      : bestRecord
        ? {
            kind: 'value',
            date: formatDateTitle(bestRecord.measuredAt, t.weekdays),
            value: formatDuration(bestRecord.durationMs),
          }
        : { kind: 'emptySinceReset' };

  const sections = useMemo(() => groupByDate(records, t.weekdays), [records, t.weekdays]);

  return (
    <>
      <RecordsScaffold empty={records.length === 0}>
        {bestState && (
          <BestCard
            label={t.records.best}
            state={bestState}
            onReset={handleResetBest}
            resetAccessibilityLabel={t.records.resetBestAccessibility}
          />
        )}
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: accent.textMuted }]}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <RecordItem
              record={item}
              isBest={item.id === bestRecord?.id}
              onDelete={handleDelete}
              onEdit={handleStartEdit}
              onViewVideo={setViewingUri}
            />
          )}
        />
      </RecordsScaffold>
      {/* records.length가 0이 되어도(예: 수정 시트 안에서 1초 미만으로 내려가 유일한 기록이
          지워진 경우) 시트가 함께 사라지면 안 되므로 RecordsScaffold의 빈 상태 분기 밖에 둔다. */}
      <VideoPlayerModal uri={viewingUri} onClose={() => setViewingUri(null)} />
      <BottomSheet
        visible={editingRecord != null}
        onClose={handleCloseEdit}
        title={t.records.editSheetTitle}
        closeAccessibilityLabel={t.records.closeAccessibility}
      >
        {editingRecord && (
          <EditTimeRecordSheetContent
            key={editingRecord.id}
            record={editingRecord}
            exerciseId={exercise.id}
            onChanged={handleRecordChanged}
          />
        )}
      </BottomSheet>
    </>
  );
}

function RepsRecordsScreen({ exercise }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [records, setRecords] = useState<RepsRecord[]>([]);
  const [viewingUri, setViewingUri] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<RepsRecord | null>(null);
  const { settings, updateSettings } = useTimerSettings(exercise.id);

  useEffect(() => {
    getRepsRecords(exercise.id).then(setRecords);
  }, [exercise.id]);

  const handleDelete = (id: string) => {
    confirmDelete(t, async () => {
      const next = await removeRepsRecord(exercise.id, id);
      setRecords(next);
    });
  };

  const handleRecordSaved = (next: RepsRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === next.id ? next : r)));
    setEditingRecord(null);
  };

  const handleResetBest = () => {
    confirmResetBest(t, () => updateSettings({ bestRecordResetAt: new Date().toISOString() }));
  };

  const bestRecord = bestRepsRecord(records, settings.bestRecordResetAt);
  const bestState: BestCardState | null =
    records.length === 0
      ? null
      : bestRecord
        ? {
            kind: 'value',
            date: formatDateTitle(bestRecord.measuredAt, t.weekdays),
            value: t.records.setsAndReps(bestRecord.sets.length, totalReps(bestRecord)),
          }
        : { kind: 'emptySinceReset' };

  const sections = useMemo(() => groupByDate(records, t.weekdays), [records, t.weekdays]);

  return (
    <>
      <RecordsScaffold empty={records.length === 0}>
        {bestState && (
          <BestCard
            label={t.records.best}
            state={bestState}
            onReset={handleResetBest}
            resetAccessibilityLabel={t.records.resetBestAccessibility}
          />
        )}
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionHeader, { color: accent.textMuted }]}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <RepsRecordItem
              record={item}
              isBest={item.id === bestRecord?.id}
              onDelete={handleDelete}
              onEdit={setEditingRecord}
              onViewVideo={setViewingUri}
            />
          )}
        />
      </RecordsScaffold>
      {/* BottomSheet/VideoPlayerModal은 RecordsScaffold의 빈 상태 분기 밖에 둔다 — records가
          0이 되어도 열려 있던 시트·모달이 함께 사라지면 안 된다(TimeRecordsScreen과 동일 이유). */}
      <VideoPlayerModal uri={viewingUri} onClose={() => setViewingUri(null)} />
      <BottomSheet
        visible={editingRecord != null}
        onClose={() => setEditingRecord(null)}
        title={t.records.editSheetTitle}
        closeAccessibilityLabel={t.records.closeAccessibility}
      >
        {editingRecord && (
          <EditRepsRecordSheetContent
            key={editingRecord.id}
            exercise={exercise}
            record={editingRecord}
            onSaved={handleRecordSaved}
          />
        )}
      </BottomSheet>
    </>
  );
}

function RecordsScaffold({ empty, children }: { empty: boolean; children: ReactNode }) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <View style={[styles.container, { backgroundColor: accent.background }]}>
      <Text style={[styles.title, { color: accent.text }]}>{t.records.title}</Text>
      {empty ? (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={40} color={accent.textFaint} />
          <Text style={[styles.emptyText, { color: accent.textMuted }]}>{t.records.empty}</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

type BestCardState = { kind: 'value'; date: string; value: string } | { kind: 'emptySinceReset' };

function BestCard({
  label,
  state,
  onReset,
  resetAccessibilityLabel,
}: {
  label: string;
  state: BestCardState;
  onReset: () => void;
  resetAccessibilityLabel: string;
}) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <View style={[styles.bestCard, { backgroundColor: accent.primary }]}>
      <View style={styles.bestInfo}>
        <View style={styles.bestLabelRow}>
          <Ionicons name="trophy" size={14} color={accent.onPrimary} />
          <Text style={[styles.bestLabel, { color: accent.onPrimary }]}>{label}</Text>
        </View>
        {state.kind === 'value' ? (
          <>
            <Text style={[styles.bestDate, { color: accent.onPrimary }]}>{state.date}</Text>
            <Text style={[styles.bestValue, { color: accent.onPrimary }]}>{state.value}</Text>
          </>
        ) : (
          <Text style={[styles.bestEmptyText, { color: accent.onPrimary }]}>
            {t.records.emptySinceReset}
          </Text>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
        onPress={onReset}
        hitSlop={8}
        accessibilityLabel={resetAccessibilityLabel}
      >
        <Ionicons name="refresh-outline" size={18} color={accent.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginVertical: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  bestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  bestInfo: {
    gap: 2,
    flexShrink: 1,
  },
  bestLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bestLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  bestDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  bestValue: {
    fontSize: fontSize.xl + 4,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  bestEmptyText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  resetButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  resetButtonPressed: {
    opacity: 0.7,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.smd,
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 24,
  },
});
