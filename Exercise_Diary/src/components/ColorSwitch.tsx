import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';

import { useAccentColors } from '../lib/ThemeContext';

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const TRACK_WIDTH = 48;
const TRACK_INSET = 3;

type Props = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  color: string; // 켜짐 상태 색 — 보통 accent.primary
  label?: string;
  disabled?: boolean;
};

export default function ColorSwitch({ value, onValueChange, color, label, disabled }: Props) {
  const accent = useAccentColors();
  const p = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    Animated.timing(p, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false, // 색상 보간이 있어 false
    }).start();
  }, [value, p]);

  const knobW = pressed ? 24 : 20;
  const travel = TRACK_WIDTH - TRACK_INSET - knobW - TRACK_INSET;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={8}
      style={[s.row, disabled && { opacity: 0.45 }]}
    >
      <Animated.View
        style={[
          s.track,
          {
            borderColor: p.interpolate({
              inputRange: [0, 1],
              outputRange: [accent.textFaint, color],
            }),
            backgroundColor: p.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(0,0,0,0)', hexA(color, 0.2)],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            s.knob,
            {
              width: knobW,
              transform: [
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) },
              ],
              backgroundColor: p.interpolate({
                inputRange: [0, 1],
                outputRange: [accent.textMuted, color],
              }),
              shadowColor: color,
              shadowOpacity: value ? 0.65 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
      </Animated.View>
      {label ? <Text style={[s.label, { color: accent.text }]}>{label}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  track: {
    width: TRACK_WIDTH,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  knob: { position: 'absolute', left: TRACK_INSET, height: 20, borderRadius: 999 },
  label: { fontSize: 13 },
});
