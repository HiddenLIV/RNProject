import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import { showAlert } from '../lib/alert';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise } from '../lib/types';
import { fontSize, spacing } from '../theme';
import RecordsScreen from './RecordsScreen';
import RepsScreen, { RepsScreenHandle } from './RepsScreen';
import TimerScreen from './TimerScreen';

type Tab = 'measure' | 'records';

type Props = {
  exercise: Exercise;
  onBack: () => void;
  initialTab?: Tab;
};

export default function ExerciseScreen({ exercise, onBack, initialTab }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'measure');
  // 측정 탭(TimerScreen/RepsScreen)은 타이머 단계 전환·탭 전환마다 마운트가 풀렸다 다시 붙는다 —
  // 이 화면(ExerciseScreen)은 그 두 경우 모두에서 계속 떠 있으므로, 측정 화면에서 방금 등록한
  // 자세 안내 영상 링크가 화면 재진입 없이 계속 보이게 하려면 이 값을 여기서 들고 있어야 한다.
  const [exerciseState, setExerciseState] = useState(exercise);

  const handleGuideVideoChange = (guideVideoId: string | undefined) => {
    setExerciseState((prev) => ({ ...prev, guideVideoId }));
  };

  // 무게·횟수 측정 화면에서 저장하지 않은 세트가 있는 채로 뒤로가기를 누르면 저장 여부를
  // 확인한다(요구사항 6). 시간형 운동(TimerScreen)에는 해당하지 않는다.
  const [unsavedRepsCount, setUnsavedRepsCount] = useState(0);
  const repsScreenRef = useRef<RepsScreenHandle>(null);

  const requestBack = () => {
    if (tab === 'measure' && exerciseState.measureType === 'reps' && unsavedRepsCount > 0) {
      showAlert(t.reps.unsavedTitle, t.reps.unsavedBody, [
        { text: t.reps.discardButton, style: 'destructive', onPress: onBack },
        {
          text: t.reps.saveConfirmButton,
          onPress: async () => {
            await repsScreenRef.current?.save();
            onBack();
          },
        },
      ]);
      return;
    }
    onBack();
  };

  // 안드로이드 하드웨어/제스처 뒤로가기 — RN BackHandler는 나중에 등록된 리스너부터 부른다.
  // 이 화면으로 들어오는 시점엔 React가 자식(ExerciseScreen)의 마운트 effect를 부모(App.tsx)의
  // screen 갱신 effect보다 먼저 실행하므로, 이 시점에 한 번만 등록해 두면 오히려 App.tsx가 항상
  // 나중에 등록돼 하드웨어 뒤로가기를 먼저 가로채 버린다(실기기에서 실제로 확인된 회귀 — 세트를
  // 수정하던 중에도 alert 없이 바로 나가졌다). 그래서 마운트 시 한 번이 아니라, 이 리스너가 꼭
  // 필요해지는 시점(unsavedRepsCount가 0에서 1로 바뀌는 순간)에 맞춰 다시 등록해야 한다 — 그
  // 순간은 App.tsx의 screen 갱신과 겹치지 않는 별개의 렌더라, 이때 새로 등록되는 리스너가 항상
  // 더 나중 것이 되어 하드웨어 뒤로가기를 먼저 받는다.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab === 'measure' && exerciseState.measureType === 'reps' && unsavedRepsCount > 0) {
        requestBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestBack은 매 렌더 재생성되지만 위 조건과 같은 값들에만 의존
  }, [tab, exerciseState.measureType, unsavedRepsCount]);

  return (
    <View style={[styles.container, { backgroundColor: accent.background }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={requestBack}
          hitSlop={8}
          accessibilityLabel={t.common.back}
        >
          <Ionicons name="chevron-back" size={26} color={accent.primaryText} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: accent.text }]}>
          {getExerciseDisplayName(exerciseState, t)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        {/* 횟수·세트형 운동은 탭과 무관하게 항상 마운트해 둔다 — 기록 탭으로 전환했다 돌아와도
            세트 목록·입력값·촬영 영상·휴식 타이머가 유지되게 하려면 언마운트되면 안 된다.
            visible로 화면 표시 여부만 넘기고, 실제 표시는 RepsScreen 내부에서 결정한다. */}
        {exerciseState.measureType === 'reps' && (
          <RepsScreen
            ref={repsScreenRef}
            exercise={exerciseState}
            onGuideVideoChange={handleGuideVideoChange}
            onUnsavedCountChange={setUnsavedRepsCount}
            visible={tab === 'measure'}
          />
        )}
        {tab === 'measure' && exerciseState.measureType === 'time' && (
          <TimerScreen exercise={exerciseState} onGuideVideoChange={handleGuideVideoChange} />
        )}
        {tab === 'records' && <RecordsScreen exercise={exerciseState} />}
      </View>
      <View
        style={[
          styles.tabBar,
          { borderTopColor: accent.border, backgroundColor: accent.background },
        ]}
      >
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
          <Text
            style={[
              styles.tabText,
              { color: accent.textFaint },
              tab === 'measure' && { color: accent.primaryText },
            ]}
          >
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
          <Text
            style={[
              styles.tabText,
              { color: accent.textFaint },
              tab === 'records' && { color: accent.primaryText },
            ]}
          >
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
