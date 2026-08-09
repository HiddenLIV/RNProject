import { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = Omit<TextInputProps, 'placeholder' | 'placeholderTextColor'> & {
  label: string;
  // 라벨이 테두리 위에 걸릴 때 그 자리 배경을 가려서 "끊어" 보이게 하려면, 실제로 놓일
  // 배경색을 알아야 한다(카드 위인지 화면 배경 위인지에 따라 다르므로 호출부에서 넘긴다).
  backgroundColor: string;
  containerStyle?: StyleProp<ViewStyle>;
};

// M3 Outlined Text Field — 비어있고 포커스 없을 땐 라벨이 입력칸 안에 placeholder처럼
// 보이다가, 포커스되거나 값이 생기면 테두리 위로 떠오르며 작아진다.
export default function OutlinedTextField({
  label,
  value,
  backgroundColor,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const accent = useAccentColors();
  const [focused, setFocused] = useState(false);
  const floated = focused || !!value;
  const anim = useRef(new Animated.Value(floated ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: floated ? 1 : 0, duration: 120, useNativeDriver: false }).start();
  }, [floated, anim]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [15, -9] });
  const labelFontSize = anim.interpolate({ inputRange: [0, 1], outputRange: [fontSize.base, fontSize.xs] });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.box, { borderColor: focused ? accent.primary : accent.border, borderWidth: focused ? 2 : 1.5 }]}>
        <TextInput
          {...rest}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: accent.text }, style]}
        />
      </View>
      <Animated.Text
        pointerEvents="none"
        style={[
          styles.label,
          {
            top: labelTop,
            fontSize: labelFontSize,
            color: focused ? accent.primary : accent.textFaint,
            backgroundColor,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  box: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 4,
  },
  input: {
    fontSize: fontSize.base,
    padding: 0,
    fontFamily: 'Pretendard-Regular',
  },
  label: {
    position: 'absolute',
    left: spacing.smd - 4,
    paddingHorizontal: 4,
    fontFamily: 'Pretendard-SemiBold',
  },
});
