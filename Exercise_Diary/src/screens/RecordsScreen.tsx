import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import RecordItem from '../components/RecordItem';
import RepsRecordItem, { totalReps } from '../components/RepsRecordItem';
import { formatDuration } from '../components/TimeDisplay';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { useAccentColors } from '../lib/ThemeContext';
import { getRecords, getRepsRecords, removeRecord, removeRepsRecord } from '../lib/storage';
import { Exercise, RepsRecord, TimeRecord } from '../lib/types';
import { cardShadow, colors, fontSize, radius, spacing } from '../theme';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateTitle(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`;
}

// 기록이 최신순이므로 삽입 순서를 보존하는 Map으로 묶으면 섹션도 최신 날짜부터 나온다
function groupByDate<T extends { measuredAt: string }>(records: T[]): { title: string; data: T[] }[] {
  const byDate = new Map<string, T[]>();
  for (const record of records) {
    const title = formatDateTitle(record.measuredAt);
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
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);

  useEffect(() => {
    getRecords(exercise.id).then(setRecords);
  }, [exercise.id]);

  const handleDelete = async (id: string) => {
    const next = await removeRecord(exercise.id, id);
    setRecords(next);
  };

  const bestRecord =
    records.length > 0 ? records.reduce((best, r) => (r.durationMs > best.durationMs ? r : best)) : null;

  const sections = useMemo(() => groupByDate(records), [records]);

  return (
    <RecordsScaffold empty={records.length === 0}>
      {bestRecord && (
        <BestCard label="최고 기록" date={formatDateTitle(bestRecord.measuredAt)} value={formatDuration(bestRecord.durationMs)} />
      )}
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
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
  const [records, setRecords] = useState<RepsRecord[]>([]);
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);

  useEffect(() => {
    getRepsRecords(exercise.id).then(setRecords);
  }, [exercise.id]);

  const handleDelete = async (id: string) => {
    const next = await removeRepsRecord(exercise.id, id);
    setRecords(next);
  };

  const bestRecord =
    records.length > 0 ? records.reduce((best, r) => (totalReps(r) > totalReps(best) ? r : best)) : null;

  const sections = useMemo(() => groupByDate(records), [records]);

  return (
    <RecordsScaffold empty={records.length === 0}>
      {bestRecord && (
        <BestCard
          label="최고 기록"
          date={formatDateTitle(bestRecord.measuredAt)}
          value={`${bestRecord.sets.length}세트 · ${totalReps(bestRecord)}회`}
        />
      )}
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>기록</Text>
      {empty ? (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyText}>아직 기록이 없습니다.{'\n'}측정으로 첫 기록을 남겨보세요.</Text>
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
        <Text style={[styles.bestDate, { color: accent.accentSoft }]}>{date}</Text>
      </View>
      <Text style={[styles.bestValue, { color: accent.onPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginVertical: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
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
    color: colors.white,
  },
  bestDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  bestValue: {
    fontSize: fontSize.xl + 4,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: colors.white,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.smd,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
