import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from '../components/AppText';
import BackupModal from '../components/BackupModal';
import BottomBannerAd from '../components/BottomBannerAd';
import EditExerciseModal from '../components/EditExerciseModal';
import ExerciseIcon from '../components/ExerciseIcon';
import HelpModal from '../components/HelpModal';
import MeasureTypeTag from '../components/MeasureTypeTag';
import ThemeSwatchRow from '../components/ThemeSwatchRow';
import Toast from '../components/Toast';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { getExercises } from '../lib/storage';
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
  const [helpVisible, setHelpVisible] = useState(false);
  const [backupVisible, setBackupVisible] = useState(false);
  const [restoreToastVisible, setRestoreToastVisible] = useState(false);
  // 도움말을 닫는 애니메이션이 끝나길 기다리는 동안엔 백업 버튼을 막아, 그 사이 백업 모달을
  // 열어 두 Modal이 동시에 visible이 되는 경우를 원천 차단한다.
  const [modalTransitioning, setModalTransitioning] = useState(false);
  // RN Modal 두 개를 동시에 열어두면 iOS에서 표시가 깨지므로, 항상 하나를 완전히 닫은 뒤에
  // 다른 하나를 연다. iOS는 Modal의 onDismiss(닫힘 애니메이션이 끝난 시점)로 이 시점을 정확히
  // 알 수 있어 그걸 쓰고, Android는 visible=false 즉시 내용이 사라지므로 바로 이어서 열어도 된다.
  const pendingModalOpenRef = useRef<(() => void) | null>(null);
  // onDismiss가 어떤 이유로든 안 오면 "?" 버튼이 영구히 막히므로, 안전망으로 일정 시간 뒤
  // 강제로 잠금을 푼다(iOS 전체화면 Modal 전환은 보통 0.5초 안팎이라 여유 있게 잡음).
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadExercises = () => {
    getExercises().then((next) => {
      setExercises(next);
      setExercisesLoaded(true);
    });
  };

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, []);

  // 하나를 닫고(setHide) → 완전히 닫힌 뒤(iOS: onDismiss, Android: 즉시) → 다른 하나를 연다(open).
  // onDismiss와 워치독 타임아웃이 같은 pendingModalOpenRef를 "먼저 도착하는 쪽이 소비"하는
  // 방식으로 다투게 해서, onDismiss가 늦게 와도 open()이 조용히 유실되지 않게 한다
  // (워치독은 안전망으로 직접 실행하고, 그 뒤에 실제로 onDismiss가 오면 이미 null이라 no-op).
  const beginModalTransition = (setHide: (v: boolean) => void, open: () => void) => {
    if (Platform.OS === 'ios') {
      setModalTransitioning(true);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      pendingModalOpenRef.current = () => {
        if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
        setModalTransitioning(false);
        open();
      };
      transitionTimeoutRef.current = setTimeout(() => {
        transitionTimeoutRef.current = null;
        const pending = pendingModalOpenRef.current;
        pendingModalOpenRef.current = null;
        pending?.();
      }, 1000);
      setHide(false);
    } else {
      setHide(false);
      open();
    }
  };

  const consumePendingModalOpen = () => {
    const pending = pendingModalOpenRef.current;
    pendingModalOpenRef.current = null;
    pending?.();
  };

  // "그냥 닫기"(X 버튼)도 beginModalTransition을 거친다 — 그래야 iOS 닫힘 애니메이션이
  // 끝나기 전까지 modalTransitioning이 true로 유지되어, 그 사이 백업 버튼을 눌러 다른 Modal이
  // 겹쳐 뜨는 걸 막을 수 있다(열 대상이 없을 뿐 열기 자체를 건너뛰는 게 아니라 없는 것과
  // 같으므로 open은 no-op).
  const handleCloseHelp = () => {
    beginModalTransition(setHelpVisible, () => {});
  };

  const handleHelpDismiss = () => {
    consumePendingModalOpen();
  };

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
                onPress={() => setBackupVisible(true)}
                hitSlop={8}
                accessibilityLabel={t.backup.title}
                disabled={modalTransitioning || helpVisible}
              >
                <Ionicons name="cloud-outline" size={26} color={accent.primaryText} />
              </Pressable>
              <Pressable
                style={styles.helpButton}
                onPress={() => setHelpVisible(true)}
                hitSlop={8}
                accessibilityLabel={t.home.help}
                disabled={modalTransitioning || backupVisible}
              >
                <Ionicons name="help-circle-outline" size={28} color={accent.primaryText} />
              </Pressable>
            </View>
          </View>
          <ThemeSwatchRow />
          {showSearch && (
            <View style={[styles.searchBox, { borderColor: accent.border, backgroundColor: accent.card }]}>
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
                <Pressable onPress={() => setSearchQuery('')} hitSlop={15} accessibilityLabel={t.home.searchClearAccessibility}>
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
                style={({ pressed }) => [styles.card, { backgroundColor: accent.card }, pressed && styles.cardPressed]}
                onPress={() => onSelectExercise(item)}
                disabled={modalTransitioning}
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
                  disabled={modalTransitioning}
                >
                  <Ionicons name="create-outline" size={20} color={accent.primary} />
                </Pressable>
                <Ionicons name="chevron-forward" size={22} color={accent.primary} style={styles.chevron} />
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
          onPress={onAddExercise}
          disabled={modalTransitioning}
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
      <HelpModal
        visible={helpVisible}
        onClose={handleCloseHelp}
        onDismiss={handleHelpDismiss}
      />
      <BackupModal
        visible={backupVisible}
        onClose={() => setBackupVisible(false)}
        onRestored={() => {
          setBackupVisible(false);
          loadExercises();
          setRestoreToastVisible(true);
        }}
        onRestoreFailed={loadExercises}
      />
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
