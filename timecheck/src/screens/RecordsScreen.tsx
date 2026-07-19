import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import RecordItem from '../components/RecordItem';
import { formatDuration } from '../components/TimeDisplay';
import { getRecords, removeRecord } from '../lib/storage';
import { HangRecord } from '../lib/types';
import { cardShadow, colors, fontSize, radius, spacing } from '../theme';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateTitle(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAYS[d.getDay()]})`;
}

export default function RecordsScreen() {
  const [records, setRecords] = useState<HangRecord[]>([]);

  useEffect(() => {
    getRecords().then(setRecords);
  }, []);

  const handleDelete = async (id: string) => {
    const next = await removeRecord(id);
    setRecords(next);
  };

  const bestRecord =
    records.length > 0
      ? records.reduce((best, r) => (r.durationMs > best.durationMs ? r : best))
      : null;

  // 기록이 최신순이므로 삽입 순서를 보존하는 Map으로 묶으면 섹션도 최신 날짜부터 나온다
  const sections = useMemo(() => {
    const byDate = new Map<string, HangRecord[]>();
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
  }, [records]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>기록</Text>
      {records.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="body-outline" size={40} color={colors.textFaint} />
          <Text style={styles.emptyText}>아직 기록이 없습니다.{'\n'}타이머로 첫 측정을 해보세요.</Text>
        </View>
      ) : (
        <>
          {bestRecord && (
            <View style={styles.bestCard}>
              <View style={styles.bestInfo}>
                <View style={styles.bestLabelRow}>
                  <Ionicons name="trophy" size={14} color={colors.white} />
                  <Text style={styles.bestLabel}>최고 기록</Text>
                </View>
                <Text style={styles.bestDate}>{formatDateTitle(bestRecord.measuredAt)}</Text>
              </View>
              <Text style={styles.bestValue}>{formatDuration(bestRecord.durationMs)}</Text>
            </View>
          )}
          <SectionList
            sections={sections}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            renderItem={({ item }) => (
              <RecordItem record={item} isBest={item.id === bestRecord?.id} onDelete={handleDelete} />
            )}
          />
        </>
      )}
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
    backgroundColor: colors.primary,
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
    color: colors.accentSoft,
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
