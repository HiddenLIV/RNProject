import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import EditExerciseModal from '../components/EditExerciseModal';
import HelpModal from '../components/HelpModal';
import MeasureTypeTag from '../components/MeasureTypeTag';
import ThemeSwatchRow from '../components/ThemeSwatchRow';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { getExercises } from '../lib/storage';
import { Exercise } from '../lib/types';
import { cardShadow, fontSize, radius, spacing } from '../theme';

type Props = {
  onSelectExercise: (exercise: Exercise) => void;
  onAddExercise: () => void;
};

export default function HomeScreen({ onSelectExercise, onAddExercise }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
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
    <View style={[styles.container, { backgroundColor: accent.background }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: accent.text }]}>{t.home.title}</Text>
            <Text style={[styles.subtitle, { color: accent.textMuted }]}>{t.home.subtitle}</Text>
          </View>
          <Pressable
            style={styles.helpButton}
            onPress={() => setHelpVisible(true)}
            hitSlop={8}
            accessibilityLabel={t.home.help}
          >
            <Ionicons name="help-circle-outline" size={28} color={accent.primaryText} />
          </Pressable>
        </View>
        <ThemeSwatchRow />
      </View>
      <FlatList
        data={exercises}
        keyExtractor={(exercise) => exercise.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const displayName = getExerciseDisplayName(item, t);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { backgroundColor: accent.card }, pressed && styles.cardPressed]}
              onPress={() => onSelectExercise(item)}
            >
              <View style={[styles.iconBadge, { backgroundColor: accent.primarySoft }]}>
                <Ionicons name={item.icon} size={26} color={accent.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: accent.text }]}>{displayName}</Text>
                <MeasureTypeTag measureType={item.measureType} />
              </View>
              <Pressable
                style={styles.editButton}
                onPress={() => setEditingExercise(item)}
                hitSlop={8}
                accessibilityLabel={t.home.editAccessibility(displayName)}
              >
                <Ionicons name="pencil" size={18} color={accent.textMuted} />
              </Pressable>
              <Ionicons name="chevron-forward" size={22} color={accent.textFaint} style={styles.chevron} />
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable
            style={({ pressed }) => [
              styles.addCard,
              { backgroundColor: accent.cardMuted, borderColor: accent.border },
              pressed && styles.cardPressed,
            ]}
            onPress={onAddExercise}
          >
            <View style={[styles.iconBadge, { backgroundColor: accent.accentSoft }]}>
              <Ionicons name="add" size={26} color={accent.accent} />
            </View>
            <Text style={[styles.addCardText, { color: accent.text }]}>{t.home.addExercise}</Text>
          </Pressable>
        }
      />
      <EditExerciseModal
        exercise={editingExercise}
        existingNames={exercises
          .filter((e) => e.id !== editingExercise?.id)
          .map((e) => getExerciseDisplayName(e, t))}
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
    paddingHorizontal: spacing.md,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
  },
  subtitle: {
    fontSize: fontSize.base,
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
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md + 2,
  },
  addCardText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
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
  },
});
