import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { EXERCISE_MENUS } from '../lib/menu';

type Props = {
  onSelect: (menuId: string) => void;
};

export default function HomeScreen({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>운동</Text>
      <FlatList
        data={EXERCISE_MENUS}
        keyExtractor={(menu) => menu.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.available && styles.cardDisabled]}
            disabled={!item.available}
            onPress={() => onSelect(item.id)}
          >
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, !item.available && styles.cardTitleDisabled]}>
                {item.title}
              </Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            {item.available ? (
              <Text style={styles.chevron}>›</Text>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginVertical: 20,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardInfo: {
    gap: 4,
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  cardTitleDisabled: {
    color: '#6b7280',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  chevron: {
    fontSize: 28,
    color: '#9ca3af',
    marginLeft: 12,
  },
  comingSoon: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginLeft: 12,
  },
});
