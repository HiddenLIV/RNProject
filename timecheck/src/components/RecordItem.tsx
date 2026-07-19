import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import { HangRecord } from '../lib/types';
import { formatDuration } from './TimeDisplay';

type Props = {
  record: HangRecord;
  isBest: boolean;
  onDelete: (id: string) => void;
};

// 날짜는 섹션 헤더가 보여주므로 행에는 시각만 표시한다
function formatMeasuredAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RecordItem({ record, isBest, onDelete }: Props) {
  return (
    <View style={[styles.row, isBest && styles.bestRow]}>
      <View style={styles.info}>
        <View style={styles.durationLine}>
          <Text style={[styles.duration, isBest && styles.bestDuration]}>
            {formatDuration(record.durationMs)}
          </Text>
          {isBest && (
            <View style={styles.bestBadge}>
              <Ionicons name="trophy" size={12} color={colors.white} />
              <Text style={styles.bestBadgeText}>최고</Text>
            </View>
          )}
        </View>
        <Text style={styles.date}>{formatMeasuredAt(record.measuredAt)}</Text>
      </View>
      <Pressable
        style={styles.deleteButton}
        onPress={() => onDelete(record.id)}
        hitSlop={8}
        accessibilityLabel="기록 삭제"
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  bestRow: {
    backgroundColor: colors.accentSoft,
  },
  info: {
    gap: 2,
  },
  durationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  duration: {
    fontSize: fontSize.xl - 2,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  bestDuration: {
    color: colors.primaryPressed,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  bestBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
  },
  date: {
    fontSize: fontSize.sm - 1,
    color: colors.textMuted,
  },
  deleteButton: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
  },
});
