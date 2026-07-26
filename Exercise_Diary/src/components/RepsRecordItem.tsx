import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColors } from '../lib/ThemeContext';
import { RepsRecord } from '../lib/types';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  record: RepsRecord;
  isBest: boolean;
  onDelete: (id: string) => void;
  onViewVideo: (assetId: string) => void;
};

function formatMeasuredAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function totalReps(record: RepsRecord): number {
  return record.sets.reduce((sum, s) => sum + s.reps, 0);
}

function formatSet(set: RepsRecord['sets'][number], weightUnit?: 'kg' | 'lb'): string {
  if (set.weight != null && weightUnit) {
    const unitLabel = weightUnit === 'lb' ? '파운드' : 'kg';
    return `${set.weight}${unitLabel}×${set.reps}회`;
  }
  return `${set.reps}회`;
}

export default function RepsRecordItem({ record, isBest, onDelete, onViewVideo }: Props) {
  const accent = useAccentColors();
  return (
    <View style={[styles.row, isBest && { backgroundColor: accent.accentSoft }]}>
      <View style={styles.info}>
        <View style={styles.durationLine}>
          <Text style={[styles.duration, isBest && { color: accent.accent }]}>
            {record.sets.length}세트 · {totalReps(record)}회
          </Text>
          {isBest && (
            <View style={[styles.bestBadge, { backgroundColor: accent.primary }]}>
              <Ionicons name="trophy" size={12} color={accent.onPrimary} />
              <Text style={[styles.bestBadgeText, { color: accent.onPrimary }]}>최고</Text>
            </View>
          )}
        </View>
        <Text style={styles.setsText}>
          {record.sets.map((s) => formatSet(s, record.weightUnit)).join(', ')}
        </Text>
        <Text style={styles.date}>{formatMeasuredAt(record.measuredAt)}</Text>
      </View>
      {record.videoRef && (
        <Pressable
          style={styles.videoButton}
          onPress={() => onViewVideo(record.videoRef!.assetId)}
          hitSlop={8}
          accessibilityLabel="촬영 영상 보기"
        >
          <Ionicons name="videocam-outline" size={18} color={accent.accent} />
        </Pressable>
      )}
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
  info: {
    gap: 2,
    flexShrink: 1,
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
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  bestBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
  },
  setsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  date: {
    fontSize: fontSize.sm - 1,
    color: colors.textMuted,
  },
  videoButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  deleteButton: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
  },
});
