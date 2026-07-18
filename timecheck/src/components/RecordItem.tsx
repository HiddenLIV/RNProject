import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HangRecord } from '../lib/types';
import { formatDuration } from './TimeDisplay';

type Props = {
  record: HangRecord;
  isBest: boolean;
  onDelete: (id: string) => void;
};

function formatMeasuredAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RecordItem({ record, isBest, onDelete }: Props) {
  return (
    <View style={[styles.row, isBest && styles.bestRow]}>
      <View style={styles.info}>
        <View style={styles.durationLine}>
          <Text style={[styles.duration, isBest && styles.bestDuration]}>
            {formatDuration(record.durationMs)}
          </Text>
          {isBest && <Text style={styles.bestBadge}>최고</Text>}
        </View>
        <Text style={styles.date}>{formatMeasuredAt(record.measuredAt)}</Text>
      </View>
      <Pressable style={styles.deleteButton} onPress={() => onDelete(record.id)}>
        <Text style={styles.deleteText}>삭제</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  bestRow: {
    backgroundColor: '#dbeafe',
  },
  info: {
    gap: 2,
  },
  durationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duration: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#111',
  },
  bestDuration: {
    color: '#1d4ed8',
  },
  bestBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  date: {
    fontSize: 13,
    color: '#6b7280',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#dc2626',
  },
});
