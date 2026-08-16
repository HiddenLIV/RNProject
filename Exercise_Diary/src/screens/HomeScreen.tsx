import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import Text from '../components/AppText';
import BackupSheetContent from '../components/BackupSheetContent';
import BottomBannerAd from '../components/BottomBannerAd';
import BottomSheet from '../components/BottomSheet';
import EditExerciseModal from '../components/EditExerciseModal';
import ExerciseIcon from '../components/ExerciseIcon';
import HelpSheetContent from '../components/HelpSheetContent';
import MeasureTypeTag from '../components/MeasureTypeTag';
import ThemeSwatchRow from '../components/ThemeSwatchRow';
import Toast from '../components/Toast';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { tapLight } from '../lib/haptics';
import { useTranslation } from '../lib/i18n';
import { getExercises } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise } from '../lib/types';
import { buttonShadowShape, cardShadow, fontSize, radius, spacing } from '../theme';

type Props = {
  onSelectExercise: (exercise: Exercise) => void;
  onAddExercise: () => void;
  sharedVideoLink?: string;
  onConsumeSharedVideoLink?: () => void;
};

export default function HomeScreen({
  onSelectExercise,
  onAddExercise,
  sharedVideoLink,
  onConsumeSharedVideoLink,
}: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  // 도움말·백업/복원은 한 개의 바텀시트(BottomSheet)를 공유하고 내용만 바꿔 끼운다 — 그래서
  // RN Modal 두 개가 동시에 열리는 경우 자체가 구조적으로 생기지 않는다(예전엔 상태 플래그와
  // 타임아웃 워치독으로 이걸 막아야 했다). sheetKind는 닫을 때도 그대로 둬서, 닫힘 슬라이드
  // 애니메이션이 재생되는 동안에도 내용이 갑자기 비어 보이지 않게 한다 — sheetOpen만 시트의
  // 실제 표시 여부(=Modal의 visible)를 담당한다.
  const [sheetKind, setSheetKind] = useState<'help' | 'backup'>('help');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [restoreToastVisible, setRestoreToastVisible] = useState(false);

  const loadExercises = () => {
    getExercises().then((next) => {
      setExercises(next);
      setExercisesLoaded(true);
    });
  };

  useEffect(() => {
    loadExercises();
  }, []);

  const openHelp = () => {
    setSheetKind('help');
    setSheetOpen(true);
  };
  const openBackup = () => {
    setSheetKind('backup');
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
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: accent.text }]}>{t.home.title}</Text>
              <Text style={[styles.subtitle, { color: accent.textMuted }]}>{t.home.subtitle}</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={styles.helpButton}
                onPress={openBackup}
                hitSlop={8}
                accessibilityLabel={t.backup.title}
              >
                <Ionicons name="cloud-outline" size={26} color={accent.primaryText} />
              </Pressable>
              <Pressable
                style={styles.helpButton}
                onPress={openHelp}
                hitSlop={8}
                accessibilityLabel={t.home.help}
              >
                <Ionicons name="help-circle-outline" size={28} color={accent.primaryText} />
              </Pressable>
            </View>
          </View>
          <ThemeSwatchRow />
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
        </View>
        <FlatList
          style={styles.flatList}
          data={filteredExercises}
          keyExtractor={(exercise) => exercise.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, filteredExercises.length === 0 && styles.listEmpty]}
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
                  <MeasureTypeTag measureType={item.measureType} />
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
        visible={sheetOpen}
        onClose={closeSheet}
        title={sheetKind === 'backup' ? t.backup.title : t.help.title}
        closeAccessibilityLabel={
          sheetKind === 'backup' ? t.backup.closeAccessibility : t.help.closeAccessibility
        }
      >
        {sheetKind === 'backup' ? (
          <BackupSheetContent
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
  // 목록이 비었을 때 empty 컴포넌트가 화면 세로 중앙에 오도록 content container 자체를 채운다.
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
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
