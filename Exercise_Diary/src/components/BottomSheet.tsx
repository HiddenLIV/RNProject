import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import AlertHost from './AlertHost';
import Text from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeAccessibilityLabel: string;
  children: ReactNode;
};

const COLLAPSED_HEIGHT_RATIO = 0.85; // 내용이 이보다 길면 여기서 스크롤, 짧으면 내용 크기로
const FLING_VELOCITY = 0.5; // px/ms, 이보다 빠르게 튕기면 위치와 무관하게 그 방향으로 스냅
const STALE_VELOCITY_MS = 80; // 마지막 move 이후 이만큼 지나 손가락을 멈췄다면 튕긴 것으로 안 친다

// 도움말·백업복원처럼 홈 화면에서 여는 보조 화면을 한 종류의 바텀시트로 통일한다.
// 항상 이 컴포넌트 하나만 마운트해 두고 내용(children)만 바꿔 끼우는 방식이라, RN Modal(각각
// 별도 네이티브 창)이 두 개 동시에 열리는 상황 자체가 구조적으로 생기지 않는다 — 예전에는
// 이걸 상태 플래그와 타임아웃 워치독으로 일일이 막아야 했다.
//
// insets(useSafeAreaInsets)는 반드시 아래 SafeAreaProvider 안쪽, BottomSheetContent에서 읽어야
// 한다 — 이 Modal은 별도 네이티브 창이라 바깥(App 루트) SafeAreaProvider의 인셋을 물려받지
// 않는데, 여기서 바로 읽으면 그 값을 쓰게 돼 화면 구성에 따라 잘못된 인셋으로 계산된다.
export default function BottomSheet(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider>
        <BottomSheetContent {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function BottomSheetContent({ visible, onClose, title, closeAccessibilityLabel, children }: Props) {
  const accent = useAccentColors();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const maxCollapsedHeight = windowHeight * COLLAPSED_HEIGHT_RATIO;
  const expandedHeight = windowHeight - insets.top;

  // 시트 내용(헤더 영역 + 스크롤 콘텐츠)의 실제 크기를 재서, 짧은 내용(설정 등)은 그 크기만큼만,
  // 긴 내용(도움말 등)은 화면의 85%까지만 차지하게 한다 — 기존 maxHeight:'85%' 동작과 동일한
  // 결과를 내면서, 드래그로 끝까지 끌어올리는 애니메이션 높이값도 같이 계산할 수 있게 한다.
  // SafeAreaView(edges=['bottom'])가 안쪽에 insets.bottom만큼 padding을 더 먹으므로, 그만큼도
  // 자연 높이에 포함해야 짧은 시트가 하단 인셋에 밀려 스크롤이 생기는 걸 막을 수 있다.
  const [headerHeight, setHeaderHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const naturalHeight = headerHeight + contentHeight > 0 ? headerHeight + contentHeight + insets.bottom : 0;
  const collapsedHeight = naturalHeight > 0 ? Math.min(naturalHeight, maxCollapsedHeight) : maxCollapsedHeight;

  const onHeaderLayout = (e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height);
  const onContentSizeChange = (_width: number, height: number) => setContentHeight(height);

  // 시트가 닫히면 다음에 열릴 내용의 실측 전까지 지난 내용의 치수를 들고 있지 않도록 비운다.
  // "prop이 바뀌면 state를 조정한다"는 React의 공식 패턴 — 렌더 중 이전 visible과 비교해 즉시
  // 반영하므로(useEffect가 아니라) 커밋 전에 리셋이 끝나 한 프레임도 지난 치수가 보이지 않는다.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) {
      setHeaderHeight(0);
      setContentHeight(0);
    }
  }

  // heightAnim은 리렌더와 무관하게 안정적인 인스턴스 하나만 있어야 한다 — useRef().current를 렌더
  // 중에 바로 읽는 대신(React Compiler가 금지) useState의 지연 초기화로 만든다.
  const [heightAnim] = useState(() => new Animated.Value(collapsedHeight));

  // 아래 ref들은 전부 이펙트나 제스처 이벤트 핸들러 안에서만 읽고 쓴다 — 렌더 중에는 절대
  // 접근하지 않는다(그래야 값이 바뀌어도 리렌더를 유발하지 않는 ref 본연의 용도에 맞다).
  const expandedRef = useRef(false);
  const boundsRef = useRef({ collapsedHeight, expandedHeight });
  const dragRef = useRef({ startY: 0, startHeight: collapsedHeight, lastY: 0, lastT: 0, velocity: 0 });

  useEffect(() => {
    boundsRef.current = { collapsedHeight, expandedHeight };
  }, [collapsedHeight, expandedHeight]);

  // 다시 열릴 때는 항상 기본(내용 크기 또는 85%) 높이로 돌아온다 — 지난번에 끝까지 끌어올린
  // 채로 닫았어도 다음엔 기본값부터 시작한다. 네이티브 슬라이드 인 애니메이션이 커밋되기 전에
  // 값을 맞춰야 순간적으로 이전 높이가 한 프레임 보이는 걸 막을 수 있어 useLayoutEffect를 쓴다.
  useLayoutEffect(() => {
    if (visible) expandedRef.current = false;
  }, [visible]);

  useLayoutEffect(() => {
    if (visible && !expandedRef.current) {
      heightAnim.setValue(collapsedHeight);
    }
  }, [visible, collapsedHeight, heightAnim]);

  // 핸들(또는 헤더)을 위로 끌면 시트가 화면 끝까지 확장되고, 다시 내리면 기본 높이로 돌아온다.
  // 기본 높이보다 더 내려가진 않는다 — 닫기는 기존대로 백드롭 탭·닫기 버튼의 몫이다.
  // PanResponder.create 대신 View의 네이티브 responder prop을 직접 쓴다 — PanResponder.create가
  // 반환하는 객체를 렌더 중(useState 지연 초기화 포함) 만들면, 그 콜백들이 ref를 참조한다는
  // 이유만으로 "렌더 중 ref 접근" 린트가 오탐한다(콜백은 실제로는 나중에 제스처가 발생할 때만
  // 실행되는데도). 아래 핸들러들은 JSX prop으로 직접 전달돼 별도 "생성 호출"을 거치지 않는다.
  const onDragGrant = (evt: GestureResponderEvent) => {
    const drag = dragRef.current;
    drag.startY = evt.nativeEvent.pageY;
    drag.lastY = evt.nativeEvent.pageY;
    drag.lastT = Date.now();
    drag.velocity = 0;
    heightAnim.stopAnimation((value) => {
      drag.startHeight = value;
    });
  };

  const onDragMove = (evt: GestureResponderEvent) => {
    const { pageY } = evt.nativeEvent;
    const drag = dragRef.current;
    const now = Date.now();
    const dt = now - drag.lastT;
    if (dt > 0) {
      drag.velocity = (pageY - drag.lastY) / dt;
    }
    drag.lastY = pageY;
    drag.lastT = now;

    const { collapsedHeight: minHeight, expandedHeight: maxHeight } = boundsRef.current;
    const dy = pageY - drag.startY;
    const next = drag.startHeight - dy;
    heightAnim.setValue(Math.min(Math.max(next, minHeight), maxHeight));
  };

  const onDragEnd = () => {
    const { collapsedHeight: minHeight, expandedHeight: maxHeight } = boundsRef.current;
    const drag = dragRef.current;
    // 손가락을 멈춘 채로 잠시 있다 뗀 경우, 마지막 move 시점의 속도가 그대로 남아있으면 안
    // 움직였는데도 튕긴 것으로 오판한다 — 일정 시간 지난 속도는 0으로 취급한다.
    const velocity = Date.now() - drag.lastT > STALE_VELOCITY_MS ? 0 : drag.velocity;
    const dy = drag.lastY - drag.startY;
    const draggedTo = Math.min(Math.max(drag.startHeight - dy, minHeight), maxHeight);
    const midpoint = (minHeight + maxHeight) / 2;
    // 빠르게 위/아래로 튕기면 위치와 무관하게 그 방향으로, 아니면 중간 지점 기준으로 스냅한다.
    const shouldExpand = velocity < -FLING_VELOCITY || (Math.abs(velocity) <= FLING_VELOCITY && draggedTo > midpoint);
    const target = shouldExpand ? maxHeight : minHeight;
    expandedRef.current = shouldExpand;
    Animated.spring(heightAnim, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {/* accent.background(화면 배경)을 그대로 쓰면 뒤에 어둡게 깔린 백드롭과 거의 같은 톤이라
          시트 경계가 안 보인다 — 화면 배경보다 한 단계 밝은/어두운 cardMuted로 구분한다. */}
      <Animated.View style={[styles.sheet, { height: heightAnim, backgroundColor: accent.cardMuted }]}>
        <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
          <View
            onLayout={onHeaderLayout}
            onStartShouldSetResponder={() => true}
            onResponderGrant={onDragGrant}
            onResponderMove={onDragMove}
            onResponderRelease={onDragEnd}
            onResponderTerminate={onDragEnd}
          >
            <View style={[styles.handleBar, { backgroundColor: accent.textFaint }]} />
            <View style={styles.header}>
              <View style={styles.headerSpacer} />
              <Text style={[styles.headerTitle, { color: accent.text }]}>{title}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel={closeAccessibilityLabel}
              >
                <Ionicons name="close" size={22} color={accent.text} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={onContentSizeChange}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
      {/* BackupSheetContent의 가져오기 확인 alert처럼, 이 시트가 떠 있는 동안엔 전역
          AlertHost(App.tsx) 대신 이 창 안에 겹쳐 그려야 한다 — 별도 네이티브 창 위에 또
          다른 Modal을 present하는 건 iOS에서 조용히 실패한다(alert.ts 참고). */}
      {visible && <AlertHost embedded />}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  sheetInner: {
    flex: 1,
  },
  handleBar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 시트 전체 높이는 heightAnim(애니메이션 값)으로 제한하고, ScrollView는 flexShrink로 그
  // 안에서만 줄어들게 해 내용이 짧으면(백업) 시트가 내용 크기로, 길면(도움말) 스크롤되게 한다.
  scroll: {
    flexShrink: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.smd,
    paddingBottom: spacing.xl,
  },
});
