import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import EditExerciseModal from '../components/EditExerciseModal';
import HelpModal from '../components/HelpModal';
import MeasureTypeTag from '../components/MeasureTypeTag';
import OnboardingModal from '../components/OnboardingModal';
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
  const [exercisesLoaded, setExercisesLoaded] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  // 온보딩을 도움말 안의 "다시보기"로 열었는지 — 닫을 때 도움말로 돌아가야 하는지 판단에 쓴다.
  const [onboardingReplay, setOnboardingReplay] = useState(false);
  // 도움말↔온보딩 전환 중(닫히는 애니메이션이 끝나길 기다리는 동안)엔 "?" 버튼을 막아,
  // 그 사이 도움말을 다시 열어 두 Modal이 동시에 visible이 되는 경우를 원천 차단한다.
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

  const handleReplayOnboarding = () => {
    setOnboardingReplay(true);
    beginModalTransition(setHelpVisible, () => setOnboardingVisible(true));
  };

  const handleHelpDismiss = () => {
    consumePendingModalOpen();
  };

  const handleCloseOnboarding = () => {
    if (onboardingReplay) {
      setOnboardingReplay(false);
      beginModalTransition(setOnboardingVisible, () => setHelpVisible(true));
    } else {
      setOnboardingVisible(false);
    }
  };

  const handleOnboardingDismiss = () => {
    consumePendingModalOpen();
  };

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
            disabled={modalTransitioning}
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
        ListEmptyComponent={
          exercisesLoaded ? (
            <View style={styles.empty}>
              <Ionicons name="body-outline" size={40} color={accent.textFaint} />
              <Text style={[styles.emptyText, { color: accent.textMuted }]}>{t.home.emptyExercises}</Text>
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
                <Ionicons name={item.icon} size={26} color={accent.onPrimary} />
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
                disabled={modalTransitioning}
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
            disabled={modalTransitioning}
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
      <HelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        onReplayOnboarding={handleReplayOnboarding}
        onDismiss={handleHelpDismiss}
      />
      <OnboardingModal visible={onboardingVisible} onClose={handleCloseOnboarding} onDismiss={handleOnboardingDismiss} />
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
