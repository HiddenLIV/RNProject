import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise } from '../lib/types';
import RecordsScreen from './RecordsScreen';
import RepsScreen from './RepsScreen';
import TimerScreen from './TimerScreen';
import { fontSize, spacing } from '../theme';

type Tab = 'measure' | 'records';

type Props = {
  exercise: Exercise;
  onBack: () => void;
};

export default function ExerciseScreen({ exercise, onBack }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [tab, setTab] = useState<Tab>('measure');

  return (
    <View style={[styles.container, { backgroundColor: accent.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={accent.primaryText} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: accent.text }]}>{getExerciseDisplayName(exercise, t)}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        {tab === 'measure' ? (
          exercise.measureType === 'time' ? (
            <TimerScreen exercise={exercise} />
          ) : (
            <RepsScreen exercise={exercise} />
          )
        ) : (
          <RecordsScreen exercise={exercise} />
        )}
      </View>
      <View style={[styles.tabBar, { borderTopColor: accent.border, backgroundColor: accent.background }]}>
        <Pressable style={styles.tabButton} onPress={() => setTab('measure')}>
          <Ionicons
            name={tab === 'measure' ? 'timer' : 'timer-outline'}
            size={22}
            color={tab === 'measure' ? accent.primaryText : accent.textFaint}
          />
          <Text style={[styles.tabText, { color: accent.textFaint }, tab === 'measure' && { color: accent.primaryText }]}>
            {t.exerciseScreen.measureTab}
          </Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('records')}>
          <Ionicons
            name={tab === 'records' ? 'list' : 'list-outline'}
            size={22}
            color={tab === 'records' ? accent.primaryText : accent.textFaint}
          />
          <Text style={[styles.tabText, { color: accent.textFaint }, tab === 'records' && { color: accent.primaryText }]}>
            {t.exerciseScreen.recordsTab}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.smd,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
