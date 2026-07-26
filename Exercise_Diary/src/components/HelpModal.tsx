import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HELP_SECTION_ICONS } from '../lib/helpContent';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HelpModal({ visible, onClose }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* RN Modal은 App.tsx 최상위 SafeAreaView 바깥의 별도 레이어에 뜨기 때문에
          여기서 직접 세이프에어리어를 잡아주지 않으면 헤더가 상태표시줄과 겹친다 */}
      <SafeAreaView style={[styles.container, { backgroundColor: accent.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerTitle, { color: accent.text }]}>{t.help.title}</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel={t.help.closeAccessibility}
          >
            <Ionicons name="close" size={24} color={accent.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {t.help.sections.map((section, index) => (
            <View key={section.title} style={[styles.section, { backgroundColor: accent.card }]}>
              <View style={[styles.iconBadge, { backgroundColor: accent.primarySoft }]}>
                <Ionicons name={HELP_SECTION_ICONS[index]} size={26} color={accent.primary} />
              </View>
              <View style={styles.sectionText}>
                <Text style={[styles.sectionTitle, { color: accent.text }]}>{section.title}</Text>
                <Text style={[styles.sectionDescription, { color: accent.textMuted }]}>{section.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
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
  content: {
    padding: spacing.md,
    gap: spacing.smd,
    paddingBottom: spacing.xl,
  },
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
