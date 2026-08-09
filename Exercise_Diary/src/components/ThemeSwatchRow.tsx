import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { radius, spacing } from '../theme';

export default function ThemeSwatchRow() {
  const accent = useAccentColors();
  const { presetId, setPresetId, presets } = accent;
  const t = useTranslation();

  return (
    <View style={styles.row}>
      {presets.map((preset) => {
        const active = preset.id === presetId;
        const name = t.colorTheme[preset.id];
        return (
          <Pressable
            key={preset.id}
            onPress={() => setPresetId(preset.id)}
            hitSlop={11}
            accessibilityRole="button"
            accessibilityLabel={t.colorTheme.changeAccessibility(name)}
            accessibilityState={{ selected: active }}
            // 선택 표시는 프리셋 색이 아니라 고정된 중립색을 써서, 어떤 프리셋을 골라도 항상 또렷하게 보인다
            style={[styles.dot, { backgroundColor: preset.primary }, active && { borderColor: accent.text }]}
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
    marginBottom: spacing.smd,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
