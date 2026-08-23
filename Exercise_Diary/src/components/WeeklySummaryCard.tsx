import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { HomeStats } from '../lib/stats';
import { useAccentColors } from '../lib/ThemeContext';
import { cardShadow, fontSize, radius, spacing } from '../theme';
import Text from './AppText';

type Props = {
  stats: HomeStats;
  onPress: () => void;
};

// 히트맵은 여기 없다 — 홈 화면은 숫자 두 개로 가볍게 유지하고, 들여다보는 성격의 히트맵은
// 이 카드를 눌렀을 때 이동하는 별도의 ActivityScreen이 보여준다.
export default function WeeklySummaryCard({ stats, onPress }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: accent.card }, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.home.weeklySummary.openAccessibility}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: accent.text }]}>{t.home.weeklySummary.title}</Text>
        <Ionicons name="chevron-forward" size={20} color={accent.primary} />
      </View>
      {stats.hasAnyRecordEver ? (
        <View style={styles.statsRow}>
          <Text style={[styles.statText, { color: accent.textMuted }]}>
            {t.home.weeklySummary.activeDays(stats.weeklyActiveDays)}
          </Text>
          <Text style={[styles.statText, { color: accent.textMuted }]}>
            {t.home.weeklySummary.prCount(stats.weeklyPrCount)}
          </Text>
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: accent.textMuted }]}>{t.home.weeklySummary.empty}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.smd,
    gap: spacing.smd,
    ...cardShadow,
  },
  cardPressed: {
    opacity: 0.85,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: fontSize.sm,
  },
});
