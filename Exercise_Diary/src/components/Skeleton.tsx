import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native';

import { useAccentColors } from '../lib/ThemeContext';
import { radius } from '../theme';

type Props = {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

// 데이터 로드 전에 빈 화면 대신 보여주는 자리표시자 — 실제 카드와 같은 자리에 놓고 은은하게
// 깜빡여 "지금 불러오는 중"임을 알린다. 시스템의 동작 줄이기(모션 감소) 설정을 존중해,
// 켜져 있으면 애니메이션 없이 고정된 톤으로만 표시한다.
export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: Props) {
  const accent = useAccentColors();
  // 렌더 중 ref.current를 만들면(react-hooks/refs) 안 되므로 지연 초기화 state로 안정된
  // Animated.Value 인스턴스를 하나만 만든다.
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ]),
      );
      animation.start();
    });

    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: accent.cardMuted, opacity }, style]}
    />
  );
}
