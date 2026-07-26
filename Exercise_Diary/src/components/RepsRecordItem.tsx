import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Translations, useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { RepsRecord } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';

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

function formatSet(set: RepsRecord['sets'][number], t: Translations, weightUnit?: 'kg' | 'lb'): string {
  const unitLabel = weightUnit === 'lb' ? t.units.lb : t.units.kg;
  return t.records.setSummary(set.reps, set.weight, set.weight != null ? unitLabel : undefined);
}

export default function RepsRecordItem({ record, isBest, onDelete, onViewVideo }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <View style={[styles.row, { backgroundColor: accent.card }, isBest && { backgroundColor: accent.accentSoft }]}>
      <View style={styles.info}>
        <View style={styles.durationLine}>
          <Text style={[styles.duration, { color: accent.text }, isBest && { color: accent.accent }]}>
            {t.records.setsAndReps(record.sets.length, totalReps(record))}
          </Text>
          {isBest && (
            <View style={[styles.bestBadge, { backgroundColor: accent.primary }]}>
              <Ionicons name="trophy" size={12} color={accent.onPrimary} />
              <Text style={[styles.bestBadgeText, { color: accent.onPrimary }]}>{t.records.bestBadge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.setsText, { color: accent.textMuted }, isBest && { color: accent.accent }]}>
          {record.sets.map((s) => formatSet(s, t, record.weightUnit)).join(', ')}
        </Text>
        <Text style={[styles.date, { color: accent.textMuted }, isBest && { color: accent.accent }]}>
          {formatMeasuredAt(record.measuredAt)}
        </Text>
      </View>
      {record.videoRef && (
        <Pressable
          style={styles.videoButton}
          onPress={() => onViewVideo(record.videoRef!.assetId)}
          hitSlop={8}
          accessibilityLabel={t.records.videoAccessibility}
        >
          <Ionicons name="videocam-outline" size={18} color={isBest ? accent.accent : accent.accentText} />
        </Pressable>
      )}
      <Pressable
        style={styles.deleteButton}
        onPress={() => onDelete(record.id)}
        hitSlop={8}
        accessibilityLabel={t.records.deleteAccessibility}
      >
        <Ionicons name="trash-outline" size={18} color={accent.danger} />
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
  },
  setsText: {
    fontSize: fontSize.sm,
  },
  date: {
    fontSize: fontSize.sm - 1,
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
