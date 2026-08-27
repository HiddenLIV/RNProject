import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';

type Props = {
  count: number;
};

// 이번 주(달력 기준 월~일) 2회 미만은 강조할 만큼의 빈도가 아니라고 보고 호출부(HomeScreen)에서
// 아예 렌더링하지 않는다.
export default function StreakBadge({ count }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();

  return (
    <View style={[styles.badge, { backgroundColor: accent.primary }]}>
      <Ionicons name="flame" size={12} color={accent.onPrimary} />
      <Text style={[styles.text, { color: accent.onPrimary }]}>{t.home.streakBadge(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
