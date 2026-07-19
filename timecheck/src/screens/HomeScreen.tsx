import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EXERCISE_MENUS } from '../lib/menu';
import { cardShadow, colors, fontSize, radius, spacing } from '../theme';

export default function HomeScreen({ onSelect }: { onSelect: (menuId: string) => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘도 화이팅!</Text>
      <Text style={styles.subtitle}>운동을 골라 시작해 보세요</Text>
      <FlatList
        data={EXERCISE_MENUS}
        keyExtractor={(menu) => menu.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              !item.available && styles.cardDisabled,
              pressed && item.available && styles.cardPressed,
            ]}
            disabled={!item.available}
            onPress={() => onSelect(item.id)}
          >
            <View style={styles.iconBadge}>
              <Ionicons name={item.icon} size={26} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, !item.available && styles.cardTitleDisabled]}>
                {item.title}
              </Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            {item.available ? (
              <Ionicons name="chevron-forward" size={22} color={colors.textFaint} style={styles.chevron} />
            ) : (
              <Text style={styles.comingSoon}>준비 중</Text>
            )}
          </Pressable>
        )}
      />
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
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.smd,
    paddingBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md + 2,
    ...cardShadow,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardInfo: {
    gap: 4,
    flexShrink: 1,
    flexGrow: 1,
  },
  chevron: {
    marginLeft: spacing.smd,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  cardTitleDisabled: {
    color: colors.textMuted,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  comingSoon: {
    fontSize: fontSize.xs + 1,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: colors.cardMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginLeft: spacing.smd,
  },
});
