import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import RecordItem from '../components/RecordItem';
import RepsRecordItem, { totalReps } from '../components/RepsRecordItem';
import { formatDuration } from '../components/TimeDisplay';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { showAlert } from '../lib/alert';
import { Translations, useTranslation } from '../lib/i18n';
import { getRecords, getRepsRecords, removeRecord, removeRepsRecord } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise, RepsRecord, TimeRecord } from '../lib/types';
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
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);

  useEffect(() => {
    getRecords(exercise.id).then(setRecords);
  }, [exercise.id]);

  const handleDelete = (id: string) => {
    confirmDelete(t, async () => {
      const next = await removeRecord(exercise.id, id);
      setRecords(next);
    });
  };

  const bestRecord =
    records.length > 0
      ? records.reduce((best, r) => (r.durationMs > best.durationMs ? r : best))
      : null;

  const sections = useMemo(() => groupByDate(records, t.weekdays), [records, t.weekdays]);

  return (
    <RecordsScaffold empty={records.length === 0}>
      {bestRecord && (
        <BestCard
          label={t.records.best}
          date={formatDateTitle(bestRecord.measuredAt, t.weekdays)}
          value={formatDuration(bestRecord.durationMs)}
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
            onViewVideo={setViewingAssetId}
          />
        )}
      />
      <VideoPlayerModal assetId={viewingAssetId} onClose={() => setViewingAssetId(null)} />
    </RecordsScaffold>
  );
}

function RepsRecordsScreen({ exercise }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [records, setRecords] = useState<RepsRecord[]>([]);
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);

  useEffect(() => {
    getRepsRecords(exercise.id).then(setRecords);
  }, [exercise.id]);

  const handleDelete = (id: string) => {
    confirmDelete(t, async () => {
      const next = await removeRepsRecord(exercise.id, id);
      setRecords(next);
    });
  };

  const bestRecord =
    records.length > 0
      ? records.reduce((best, r) => (totalReps(r) > totalReps(best) ? r : best))
      : null;

  const sections = useMemo(() => groupByDate(records, t.weekdays), [records, t.weekdays]);

  return (
    <RecordsScaffold empty={records.length === 0}>
      {bestRecord && (
        <BestCard
          label={t.records.best}
          date={formatDateTitle(bestRecord.measuredAt, t.weekdays)}
          value={t.records.setsAndReps(bestRecord.sets.length, totalReps(bestRecord))}
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
            onViewVideo={setViewingAssetId}
          />
        )}
      />
      <VideoPlayerModal assetId={viewingAssetId} onClose={() => setViewingAssetId(null)} />
    </RecordsScaffold>
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

function BestCard({ label, date, value }: { label: string; date: string; value: string }) {
  const accent = useAccentColors();
  return (
    <View style={[styles.bestCard, { backgroundColor: accent.primary }]}>
      <View style={styles.bestInfo}>
        <View style={styles.bestLabelRow}>
          <Ionicons name="trophy" size={14} color={accent.onPrimary} />
          <Text style={[styles.bestLabel, { color: accent.onPrimary }]}>{label}</Text>
        </View>
        <Text style={[styles.bestDate, { color: accent.onPrimary }]}>{date}</Text>
      </View>
      <Text style={[styles.bestValue, { color: accent.onPrimary }]}>{value}</Text>
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
