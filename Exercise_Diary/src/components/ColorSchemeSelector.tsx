import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { ColorSchemeOverride } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';

const OPTIONS: ColorSchemeOverride[] = ['system', 'light', 'dark'];

export default function ColorSchemeSelector() {
  const accent = useAccentColors();
  const { colorSchemeOverride, setColorSchemeOverride } = accent;
  const t = useTranslation();

  const labelFor = (value: ColorSchemeOverride) =>
    value === 'system' ? t.settings.modeSystem : value === 'light' ? t.settings.modeLight : t.settings.modeDark;

  return (
    <View style={styles.row}>
      {OPTIONS.map((value) => {
        const selected = value === colorSchemeOverride;
        return (
          <Pressable
            key={value}
            style={[
              styles.segment,
              { borderColor: accent.border, backgroundColor: accent.background },
              selected && { backgroundColor: accent.primary, borderColor: accent.primary },
            ]}
            onPress={() => setColorSchemeOverride(value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.segmentText,
                { color: accent.textMuted },
                selected && { color: accent.onPrimary },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {labelFor(value)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    // adjustsFontSizeToFit이 Text를 부모(segment) 너비만큼 늘려서 측정하기 때문에,
    // 명시하지 않으면 기본 왼쪽 정렬로 보인다.
    textAlign: 'center',
  },
});
