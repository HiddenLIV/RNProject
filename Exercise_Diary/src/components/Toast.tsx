import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Text from './AppText';
import { useAccentColors } from '../lib/ThemeContext';
import { buttonShadowShape, fontSize, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  message: string;
  onHide: () => void;
};

const DISPLAY_MS = 2000;
const FADE_MS = 200;

export default function Toast({ visible, message, onHide }: Props) {
  const accent = useAccentColors();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(onHide);
    }, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: accent.primary, opacity, ...buttonShadowShape, shadowColor: accent.primary },
      ]}
    >
      <Text style={[styles.text, { color: accent.onPrimary }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg + 64, // 하단 저장 버튼과 겹치지 않게 그 위에 띄운다
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
