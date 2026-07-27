import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HELP_SECTION_ICONS } from '../lib/helpContent';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  // iOS에서만 호출됨(RN Modal 스펙) — 완전히 닫힌 뒤에 다른 Modal을 열어야 할 때 씀
  onDismiss?: () => void;
};

// 도움말(HelpModal)의 6개 항목 중 앞 5개(운동 커스터마이징 제외)를 그대로 재사용한다
const PAGE_COUNT = 5;

export default function OnboardingModal({ visible, onClose, onDismiss }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  // 렌더 사이 갱신이 스크롤 애니메이션 완료(momentum end) 이후에만 일어나는 setState보다
  // 먼저 필요한 "다음 버튼 연타" 계산에 쓴다 — state는 화면 표시용, ref는 계산의 진실.
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);
  // "다음"을 눌러 스크롤 애니메이션이 도는 동안엔 page state가 이미 다음 값으로 앞서가
  // 마지막 페이지 직전에선 버튼이 곧바로 "시작하기"로 바뀐다 — 그 틈에 연타하면 마지막
  // 장을 못 보고 닫힐 수 있어, 애니메이션이 끝날 때까지 주 버튼을 잠근다.
  const [isScrolling, setIsScrolling] = useState(false);
  // onMomentumScrollEnd 하나에만 의존하면, 사용자가 스크롤 애니메이션 도중 화면을 터치해
  // 감속 없이 드래그가 끝나는 경우(iOS) 그 이벤트가 아예 안 와서 버튼이 영구히 잠길 수
  // 있다 — 안전망으로 애니메이션 예상 시간보다 넉넉하게 지나면 강제로 풀어준다.
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pages = t.help.sections.slice(0, PAGE_COUNT);
  const icons = HELP_SECTION_ICONS.slice(0, PAGE_COUNT);
  const isLast = page === pages.length - 1;

  const clearScrollTimeout = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  };

  // iOS는 Modal이 닫히는 애니메이션 동안에도 내용이 계속 보이므로, 닫을 때 리셋하면
  // 닫히는 도중 1장으로 튕기는 게 보인다 — 그래서 닫을 때가 아니라 열릴 때 리셋한다.
  useEffect(() => {
    if (visible) {
      clearScrollTimeout();
      pageRef.current = 0;
      setPage(0);
      setIsScrolling(false);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  useEffect(() => clearScrollTimeout, []);

  // 감속 없이(빠르게 스크롤하다 손을 뗀 게 아니라 천천히 끌어다 놓은 경우) 드래그가 끝나면
  // iOS에서 onMomentumScrollEnd가 아예 안 온다 — onScrollEndDrag도 같이 받아서 그 경우에도
  // 페이지·인디케이터가 갱신되게 한다. 감속이 있으면 두 이벤트가 모두 오지만, 나중에 오는
  // onMomentumScrollEnd가 최종 정착 위치로 다시 덮어써 결과에 문제가 없다.
  const handleScrollSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    clearScrollTimeout();
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    pageRef.current = next;
    setPage(next);
    setIsScrolling(false);
  };

  const handleNext = () => {
    if (isScrolling) return;
    const next = Math.min(pageRef.current + 1, pages.length - 1);
    if (next === pageRef.current) return;
    setIsScrolling(true);
    pageRef.current = next;
    setPage(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    clearScrollTimeout();
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
      setIsScrolling(false);
    }, 600);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: accent.background }]} edges={['top', 'bottom']}>
        {!isLast && (
          <Pressable style={styles.skipButton} onPress={onClose} hitSlop={8}>
            <Text style={[styles.skipText, { color: accent.textMuted }]}>{t.onboarding.skip}</Text>
          </Pressable>
        )}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollSettled}
          onScrollEndDrag={handleScrollSettled}
        >
          {pages.map((section, index) => (
            <View key={section.title} style={[styles.page, { width }]}>
              <View style={[styles.iconBadge, { backgroundColor: accent.primarySoft }]}>
                <Ionicons name={icons[index]} size={48} color={accent.primary} />
              </View>
              <Text style={[styles.title, { color: accent.text }]}>{section.title}</Text>
              <Text style={[styles.description, { color: accent.textMuted }]}>{section.description}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, { backgroundColor: index === page ? accent.primary : accent.border }]}
            />
          ))}
        </View>
        <Pressable
          style={[styles.button, { backgroundColor: accent.primary }, isScrolling && styles.buttonDisabled]}
          onPress={isLast ? onClose : handleNext}
          disabled={isScrolling}
        >
          <Text style={[styles.buttonText, { color: accent.onPrimary }]}>
            {isLast ? t.onboarding.start : t.onboarding.next}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  button: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
