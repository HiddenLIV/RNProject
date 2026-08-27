import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import Text from '../components/AppText';
import BottomBannerAd from '../components/BottomBannerAd';
import BottomSheet from '../components/BottomSheet';
import EditExerciseModal from '../components/EditExerciseModal';
import ExerciseIcon from '../components/ExerciseIcon';
import HelpSheetContent from '../components/HelpSheetContent';
import MeasureTypeTag from '../components/MeasureTypeTag';
import SettingsSheetContent from '../components/SettingsSheetContent';
import Skeleton from '../components/Skeleton';
import StreakBadge from '../components/StreakBadge';
import Toast from '../components/Toast';
import WeeklySummaryCard from '../components/WeeklySummaryCard';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { tapLight } from '../lib/haptics';
import { useTranslation } from '../lib/i18n';
import { getHomeStats, HomeStats } from '../lib/stats';
import { getExercises } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise } from '../lib/types';
import { buttonShadowShape, cardShadow, fontSize, radius, spacing } from '../theme';

type Props = {
  onSelectExercise: (exercise: Exercise) => void;
  onAddExercise: () => void;
  onOpenActivity: () => void;
  sharedVideoLink?: string;
  onConsumeSharedVideoLink?: () => void;
};

export default function HomeScreen({
  onSelectExercise,
  onAddExercise,
  onOpenActivity,
  sharedVideoLink,
  onConsumeSharedVideoLink,
}: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  // 도움말·백업/복원은 한 개의 바텀시트(BottomSheet)를 공유하고 내용만 바꿔 끼운다 — 그래서
  // RN Modal 두 개가 동시에 열리는 경우 자체가 구조적으로 생기지 않는다(예전엔 상태 플래그와
  // 타임아웃 워치독으로 이걸 막아야 했다). sheetKind는 닫을 때도 그대로 둬서, 닫힘 슬라이드
  // 애니메이션이 재생되는 동안에도 내용이 갑자기 비어 보이지 않게 한다 — sheetOpen만 시트의
  // 실제 표시 여부(=Modal의 visible)를 담당한다.
  const [sheetKind, setSheetKind] = useState<'help' | 'settings'>('help');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restoreToastVisible, setRestoreToastVisible] = useState(false);

  const loadExercises = () => {
    getExercises().then((next) => {
      setExercises(next);
      setExercisesLoaded(true);
      getHomeStats(next).then(setHomeStats);
    });
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const openHelp = () => {
    setSheetKind('help');
    setSheetOpen(true);
  };
  const openSettings = () => {
    setSheetKind('settings');
    setSheetOpen(true);
  };
  const closeSheet = () => setSheetOpen(false);

  const showSearch = exercises.length > 0;
  const trimmedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredExercises = useMemo(() => {
    if (!showSearch || !trimmedQuery) return exercises;
    return exercises.filter((exercise) =>
      getExerciseDisplayName(exercise, t).toLocaleLowerCase().includes(trimmedQuery),
    );
  }, [exercises, showSearch, trimmedQuery, t]);

  return (
    <View style={[styles.screen, { backgroundColor: accent.background }]}>
      <View style={styles.container}>
        <FlatList
          style={styles.flatList}
          data={exercisesLoaded ? filteredExercises : []}
          keyExtractor={(exercise) => exercise.id}
          showsVerticalScrollIndicator={false}
          // 검색창(TextInput)이 목록 안(ListHeaderComponent)에 있어서, 기본값(never)이면 키보드가
          // 떠 있을 때 첫 탭이 키보드를 닫기만 하고 하위 요소(검색 지우기 ✕, 요약 카드)에 전달되지
          // 않는다 — 이 저장소의 다른 스크롤+입력 화면(AddExerciseScreen 등)과 동일하게 맞춘다.
          keyboardShouldPersistTaps="handled"
          // 안드로이드 기본값(true)은 화면 밖으로 나간 서브뷰를 측정된 레이아웃 기준으로 잘라내는데,
          // 이번 주 요약 카드가 로딩 후(homeStats null → 값) 훨씬 커지면서 그 커진 영역이 옛 측정값
          // 기준으로 잘려나가 히트맵이 안 보이는 문제가 있었다 — 운동 목록이 길지 않아 클리핑
          // 최적화 이득도 크지 않으므로 아예 끈다.
          removeClippedSubviews={false}
          contentContainerStyle={[
            styles.list,
            exercisesLoaded && filteredExercises.length === 0 && styles.listEmpty,
          ]}
          ListHeaderComponent={
            <>
              <View style={styles.headerRow}>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: accent.text }]}>{t.home.title}</Text>
                  <Text style={[styles.subtitle, { color: accent.textMuted }]}>
                    {t.home.subtitle}
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <Pressable
                    style={styles.helpButton}
                    onPress={openHelp}
                    hitSlop={8}
                    accessibilityLabel={t.home.help}
                  >
                    {/* Ionicons의 help-circle-outline 글리프는 같은 size 값에서도
                        settings-outline보다 눈에 띄게 작게 그려진다(측정 결과 실제 픽셀
                        기준 약 53px vs 63px) — 두 아이콘이 나란히 있을 때 시각적으로
                        맞춰 보이도록 살짝 키운다. */}
                    <Ionicons name="help-circle-outline" size={30} color={accent.primaryText} />
                  </Pressable>
                  <Pressable
                    style={styles.helpButton}
                    onPress={openSettings}
                    hitSlop={8}
                    accessibilityLabel={t.settings.title}
                  >
                    <Ionicons name="settings-outline" size={26} color={accent.primaryText} />
                  </Pressable>
                </View>
              </View>
              {homeStats ? (
                <WeeklySummaryCard stats={homeStats} onPress={onOpenActivity} />
              ) : (
                <View style={[styles.summarySkeleton, { backgroundColor: accent.card }]}>
                  <Skeleton width="40%" height={18} />
                  <Skeleton width="70%" height={14} />
                </View>
              )}
              {showSearch && (
                <View
                  style={[
                    styles.searchBox,
                    { borderColor: accent.border, backgroundColor: accent.card },
                  ]}
                >
                  <Ionicons name="search" size={18} color={accent.textFaint} />
                  <TextInput
                    style={[styles.searchInput, { color: accent.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t.home.searchPlaceholder}
                    placeholderTextColor={accent.textFaint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable
                      onPress={() => setSearchQuery('')}
                      hitSlop={15}
                      accessibilityLabel={t.home.searchClearAccessibility}
                    >
                      <Ionicons name="close-circle" size={18} color={accent.textFaint} />
                    </Pressable>
                  )}
                </View>
              )}
              {!exercisesLoaded && (
                // 처음 열었을 때 AsyncStorage 읽기가 끝나기 전까지 빈 화면 대신 보여주는 자리표시자 —
                // 실제 카드 개수를 미리 알 수 없으니 흔한 목록 길이를 가정해 3장만 깜빡인다.
                <View style={styles.skeletonExerciseList}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.card, { backgroundColor: accent.card }]}>
                      <Skeleton
                        width={48}
                        height={48}
                        borderRadius={radius.pill}
                        style={styles.iconBadge}
                      />
                      <View style={styles.cardInfo}>
                        <Skeleton width="60%" height={18} />
                        <Skeleton width={72} height={20} borderRadius={radius.pill} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            exercisesLoaded ? (
              <View style={styles.empty}>
                <Ionicons name="body-outline" size={40} color={accent.textFaint} />
                <Text style={[styles.emptyText, { color: accent.textMuted }]}>
                  {trimmedQuery ? t.home.noSearchResults : t.home.emptyExercises}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const displayName = getExerciseDisplayName(item, t);
            const weeklyCount = homeStats?.weeklyCountsByExerciseId[item.id] ?? 0;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: accent.card },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onSelectExercise(item)}
              >
                <View style={[styles.iconBadge, { backgroundColor: accent.primary }]}>
                  <ExerciseIcon icon={item.icon} size={26} color={accent.onPrimary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: accent.text }]}>{displayName}</Text>
                  <View style={styles.cardTagRow}>
                    <MeasureTypeTag measureType={item.measureType} />
                    {weeklyCount >= 2 && <StreakBadge count={weeklyCount} />}
                  </View>
                </View>
                <Pressable
                  style={styles.editButton}
                  onPress={() => setEditingExercise(item)}
                  hitSlop={12}
                  accessibilityLabel={t.home.editAccessibility(displayName)}
                >
                  <Ionicons name="create-outline" size={20} color={accent.primary} />
                </Pressable>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={accent.primary}
                  style={styles.chevron}
                />
              </Pressable>
            );
          }}
        />
        {/* M3 Extended FAB — 목록 스크롤과 무관하게 항상 같은 자리에 떠 있어서, 운동이 많아져도
            "운동 추가"를 찾으러 스크롤하거나 헤더 공간을 차지할 필요가 없다. */}
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: accent.primary, ...buttonShadowShape, shadowColor: accent.primary },
            pressed && styles.fabPressed,
          ]}
          onPress={() => {
            tapLight();
            onAddExercise();
          }}
          accessibilityLabel={t.home.addExercise}
        >
          <Ionicons name="add" size={22} color={accent.onPrimary} />
          <Text style={[styles.fabText, { color: accent.onPrimary }]}>{t.home.addExercise}</Text>
        </Pressable>
      </View>
      <BottomBannerAd />
      <EditExerciseModal
        exercise={editingExercise}
        existingNames={exercises
          .filter((e) => e.id !== editingExercise?.id)
          .map((e) => getExerciseDisplayName(e, t))}
        sharedVideoLink={sharedVideoLink}
        onConsumeSharedVideoLink={onConsumeSharedVideoLink}
        onClose={() => setEditingExercise(null)}
        onSaved={() => {
          setEditingExercise(null);
          loadExercises();
        }}
      />
      <BottomSheet
        key={sheetKind}
        visible={sheetOpen}
        onClose={closeSheet}
        title={sheetKind === 'settings' ? t.settings.title : t.help.title}
        closeAccessibilityLabel={
          sheetKind === 'settings' ? t.settings.closeAccessibility : t.help.closeAccessibility
        }
      >
        {sheetKind === 'settings' ? (
          <SettingsSheetContent
            onRestored={() => {
              closeSheet();
              loadExercises();
              setRestoreToastVisible(true);
            }}
            onRestoreFailed={loadExercises}
          />
        ) : (
          <HelpSheetContent />
        )}
      </BottomSheet>
      <Toast
        visible={restoreToastVisible}
        message={t.backup.importSuccessToast}
        onHide={() => setRestoreToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // 배너 광고(BottomBannerAd)는 이 안쪽 padding 바깥, screen 최하단에 전체 너비로 배치된다 —
  // 적응형 배너는 기기 전체 너비를 기준으로 크기가 계산되기 때문이다.
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  headerText: {
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    padding: 0,
  },
  flatList: {
    flex: 1,
  },
  list: {
    gap: spacing.smd,
    paddingBottom: spacing.xl + 56, // 떠 있는 FAB에 마지막 카드가 가리지 않도록 여유를 둔다
  },
  // 운동 목록 로딩 중에는 ListHeaderComponent 안에서 렌더링되므로(실제 FlatList data는 아직 빈
  // 배열) styles.list의 gap이 적용되지 않는다 — 자리표시자 카드 사이 간격을 직접 준다.
  skeletonExerciseList: {
    gap: spacing.smd,
    marginTop: spacing.md,
  },
  // 헤더(타이틀+요약카드+검색창)가 ListHeaderComponent로 목록과 같은 contentContainer 안에
  // 있으므로, 여기서 justifyContent:'center'를 주면 헤더까지 통째로 화면 중앙으로 쏠린다 —
  // flexGrow만 줘서 컨테이너가 화면을 채우게 하고, 실제 중앙 정렬은 empty 쪽에서 flex:1로
  // 스스로 담당하게 한다(헤더는 그대로 위쪽에 고정).
  listEmpty: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.smd,
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
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
  // M3 Extended FAB — 화면 우하단에 항상 같은 위치로 떠 있는 주 액션 버튼.
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 4,
    height: 56,
    borderRadius: radius.pill,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabText: {
    fontSize: fontSize.base,
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
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summarySkeleton: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.smd,
    gap: spacing.sm,
    ...cardShadow,
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
