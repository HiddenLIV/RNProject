import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
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
  // 측정 탭(TimerScreen/RepsScreen)은 타이머 단계 전환·탭 전환마다 마운트가 풀렸다 다시 붙는다 —
  // 이 화면(ExerciseScreen)은 그 두 경우 모두에서 계속 떠 있으므로, 측정 화면에서 방금 등록한
  // 자세 안내 영상 링크가 화면 재진입 없이 계속 보이게 하려면 이 값을 여기서 들고 있어야 한다.
  const [exerciseState, setExerciseState] = useState(exercise);

  const handleGuideVideoChange = (guideVideoId: string | undefined) => {
    setExerciseState((prev) => ({ ...prev, guideVideoId }));
  };

  return (
    <View style={[styles.container, { backgroundColor: accent.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={accent.primaryText} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: accent.text }]}>{getExerciseDisplayName(exerciseState, t)}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        {tab === 'measure' ? (
          exerciseState.measureType === 'time' ? (
            <TimerScreen exercise={exerciseState} onGuideVideoChange={handleGuideVideoChange} />
          ) : (
            <RepsScreen exercise={exerciseState} onGuideVideoChange={handleGuideVideoChange} />
          )
        ) : (
          <RecordsScreen exercise={exerciseState} />
        )}
      </View>
      <View style={[styles.tabBar, { borderTopColor: accent.border, backgroundColor: accent.background }]}>
        <Pressable
          style={styles.tabButton}
          onPress={() => setTab('measure')}
          hitSlop={4}
          android_ripple={{ color: 'rgba(0,0,0,0)' }}
        >
          <Ionicons
            name={tab === 'measure' ? 'timer' : 'timer-outline'}
            size={22}
            color={tab === 'measure' ? accent.primaryText : accent.textFaint}
          />
          <Text style={[styles.tabText, { color: accent.textFaint }, tab === 'measure' && { color: accent.primaryText }]}>
            {t.exerciseScreen.measureTab}
          </Text>
        </Pressable>
        <Pressable
          style={styles.tabButton}
          onPress={() => setTab('records')}
          hitSlop={4}
          android_ripple={{ color: 'rgba(0,0,0,0)' }}
        >
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
    gap: 4,
    paddingVertical: spacing.sm,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
