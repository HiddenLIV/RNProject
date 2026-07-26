import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import EditExerciseModal from '../components/EditExerciseModal';
import HelpModal from '../components/HelpModal';
import MeasureTypeTag from '../components/MeasureTypeTag';
import { getExercises } from '../lib/storage';
import { Exercise } from '../lib/types';
import { cardShadow, colors, fontSize, radius, spacing } from '../theme';

type Props = {
  onSelectExercise: (exercise: Exercise) => void;
  onAddExercise: () => void;
};

export default function HomeScreen({ onSelectExercise, onAddExercise }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);

  const loadExercises = () => {
    getExercises().then(setExercises);
  };

  useEffect(() => {
    loadExercises();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>나의 운동 일지</Text>
          <Text style={styles.subtitle}>운동을 골라 시작해 보세요</Text>
        </View>
        <Pressable
          style={styles.helpButton}
          onPress={() => setHelpVisible(true)}
          hitSlop={8}
          accessibilityLabel="도움말"
        >
          <Ionicons name="help-circle-outline" size={28} color={colors.primary} />
        </Pressable>
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(exercise) => exercise.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onSelectExercise(item)}
          >
            <View style={styles.iconBadge}>
              <Ionicons name={item.icon} size={26} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <MeasureTypeTag measureType={item.measureType} />
            </View>
            <Pressable
              style={styles.editButton}
              onPress={() => setEditingExercise(item)}
              hitSlop={8}
              accessibilityLabel={`${item.name} 수정`}
            >
              <Ionicons name="pencil" size={18} color={colors.textMuted} />
            </Pressable>
            <Ionicons name="chevron-forward" size={22} color={colors.textFaint} style={styles.chevron} />
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable
            style={({ pressed }) => [styles.addCard, pressed && styles.cardPressed]}
            onPress={onAddExercise}
          >
            <View style={[styles.iconBadge, styles.addIconBadge]}>
              <Ionicons name="add" size={26} color={colors.accent} />
            </View>
            <Text style={styles.addCardText}>운동 추가</Text>
          </Pressable>
        }
      />
      <EditExerciseModal
        exercise={editingExercise}
        existingNames={exercises.filter((e) => e.id !== editingExercise?.id).map((e) => e.name)}
        onClose={() => setEditingExercise(null)}
        onSaved={() => {
          setEditingExercise(null);
          loadExercises();
        }}
      />
      <HelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerText: {
    flexShrink: 1,
  },
  helpButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginTop: 4,
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
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardMuted,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md + 2,
  },
  addIconBadge: {
    backgroundColor: colors.accentSoft,
  },
  addCardText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
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
  editButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
});
