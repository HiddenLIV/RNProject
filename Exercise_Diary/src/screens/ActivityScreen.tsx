import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import ExerciseIcon from '../components/ExerciseIcon';
import MonthCalendar from '../components/MonthCalendar';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { getExercisesRecordedOn, getHomeStats, HomeStats } from '../lib/stats';
import { getExercises } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  onBack: () => void;
  onOpenExerciseRecords: (exercise: Exercise) => void;
};

// RecordsScreen의 날짜 표기와 같은 형식(YYYY.MM.DD (요일)) — 월 이름 없이 숫자만 쓰는 앱 관행 유지.
function formatDateTitle(dateKey: string, weekdays: string[]): string {
  const [y, m, d] = dateKey.split('-');
  const dow = new Date(`${dateKey}T00:00:00`).getDay();
  return `${y}.${m}.${d} (${weekdays[dow]})`;
}

export default function ActivityScreen({ onBack, onOpenExerciseRecords }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [dateExercises, setDateExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    getExercises().then((next) => {
      setExercises(next);
      getHomeStats(next).then(setStats);
    });
  }, []);

  const onSelectDate = (dateKey: string) => {
    if (!stats) return;
    // getHomeStats가 이미 계산해 둔 dateKeysByExerciseId를 동기적으로 필터링할 뿐이라
    // AsyncStorage를 다시 읽지 않는다 — 날짜를 연달아 빠르게 눌러도 나중에 누른 쪽이
    // 먼저 누른 쪽의 결과에 덮어써질 race가 구조적으로 없다.
    setSelectedDateKey(dateKey);
    setDateExercises(getExercisesRecordedOn(dateKey, exercises, stats.dateKeysByExerciseId));
  };

  const clearSelectedDate = () => setSelectedDateKey(null);

  // 선택한 날짜가 있는 채로 화살표나 연월 선택으로 다른 달을 보게 되면, 캘린더엔 아무 선택
  // 표시가 없는데 아래 날짜 섹션만 남아있는 상태가 되므로 그 경우엔 선택을 해제한다.
  const onMonthChange = (year: number, month: number) => {
    if (!selectedDateKey) return;
    const [selectedYear, selectedMonth] = selectedDateKey.split('-').map(Number);
    if (selectedYear !== year || selectedMonth !== month + 1) {
      clearSelectedDate();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: accent.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8} accessibilityLabel={t.common.back}>
          <Ionicons name="chevron-back" size={26} color={accent.primaryText} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: accent.text }]}>{t.activity.title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {stats && (
          <>
            {/* 이번 주 활동일수·PR 갱신 횟수는 홈 화면 요약 카드에만 보여준다(사용자 요청) — 여기는
                캘린더와 날짜별 상세만 다룬다. 기록이 전혀 없어도 캘린더 자체는 계속 보여준다 —
                빈 recordedDates를 받아 점 없이 정상 렌더링될 뿐이고, 캘린더가 통째로 사라지면
                안 된다(요구사항 18). */}
            <MonthCalendar
              recordedDates={stats.recordedDates}
              onSelectDate={onSelectDate}
              selectedDateKey={selectedDateKey}
              onMonthChange={onMonthChange}
            />
            {/* 바텀시트 대신 캘린더 바로 아래에 인라인으로 보여준다 — 날짜를 눌러 그날 한 운동을
                확인하고 다른 날짜를 또 누르면 이 목록만 바뀐다(사용자 요청). */}
            {selectedDateKey && (
              <View style={styles.dateSection}>
                <View style={styles.dateSectionHeader}>
                  <Text style={[styles.dateSectionTitle, { color: accent.text }]}>
                    {formatDateTitle(selectedDateKey, t.weekdays)}
                  </Text>
                  <Pressable
                    onPress={clearSelectedDate}
                    hitSlop={8}
                    accessibilityLabel={t.activity.closeAccessibility}
                  >
                    <Ionicons name="close" size={20} color={accent.textFaint} />
                  </Pressable>
                </View>
                {dateExercises.map((exercise) => {
                  const displayName = getExerciseDisplayName(exercise, t);
                  return (
                    <Pressable
                      key={exercise.id}
                      style={({ pressed }) => [
                        styles.exerciseRow,
                        { backgroundColor: accent.card },
                        pressed && styles.exerciseRowPressed,
                      ]}
                      onPress={() => onOpenExerciseRecords(exercise)}
                    >
                      <View style={[styles.iconBadge, { backgroundColor: accent.primary }]}>
                        <ExerciseIcon icon={exercise.icon} size={22} color={accent.onPrimary} />
                      </View>
                      <Text style={[styles.exerciseName, { color: accent.text }]}>{displayName}</Text>
                      <Ionicons name="chevron-forward" size={20} color={accent.primary} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    padding: spacing.md,
    gap: spacing.smd,
  },
  dateSection: {
    gap: spacing.sm,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  exerciseRowPressed: {
    opacity: 0.85,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
