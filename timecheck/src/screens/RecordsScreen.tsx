import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import RecordItem from '../components/RecordItem';
import { formatDuration } from '../components/TimeDisplay';
import { getRecords, removeRecord } from '../lib/storage';
import { HangRecord } from '../lib/types';

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
          <Text style={styles.emptyText}>아직 기록이 없습니다.{'\n'}타이머로 첫 측정을 해보세요.</Text>
        </View>
      ) : (
        <>
          {bestRecord && (
            <View style={styles.bestCard}>
              <View>
                <Text style={styles.bestLabel}>최고 기록</Text>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111',
    marginVertical: 16,
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 8,
  },
  bestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  bestLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#bfdbfe',
  },
  bestDate: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 2,
  },
  bestValue: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#fff',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
