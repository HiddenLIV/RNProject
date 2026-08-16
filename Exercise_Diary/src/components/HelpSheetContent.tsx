import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { HELP_SECTION_ICONS } from '../lib/helpContent';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';

export default function HelpSheetContent() {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <>
      {t.help.sections.map((section, index) => (
        <View key={section.title} style={[styles.section, { backgroundColor: accent.card }]}>
          <View style={[styles.iconBadge, { backgroundColor: accent.primary }]}>
            <Ionicons name={HELP_SECTION_ICONS[index]} size={26} color={accent.onPrimary} />
          </View>
          <View style={styles.sectionText}>
            <Text style={[styles.sectionTitle, { color: accent.text }]}>{section.title}</Text>
            <Text style={[styles.sectionDescription, { color: accent.textMuted }]}>
              {section.description}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    gap: spacing.smd,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
