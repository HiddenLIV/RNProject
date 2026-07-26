import { Pressable, StyleSheet, View } from 'react-native';
import { useAccentColors } from '../lib/ThemeContext';
import { colors, radius, spacing } from '../theme';

export default function ThemeSwatchRow() {
  const { presetId, setPresetId, presets } = useAccentColors();

  return (
    <View style={styles.row}>
      {presets.map((preset) => {
        const active = preset.id === presetId;
        return (
          <Pressable
            key={preset.id}
            onPress={() => setPresetId(preset.id)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${preset.name} 테마로 변경`}
            accessibilityState={{ selected: active }}
            style={[styles.dot, { backgroundColor: preset.primary }, active && styles.dotActive]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dotActive: {
    // 선택 표시는 프리셋 색이 아니라 고정된 중립색을 써서, 어떤 프리셋을 골라도 항상 또렷하게 보인다
    borderColor: colors.text,
  },
});
