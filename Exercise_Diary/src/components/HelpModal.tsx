import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { HELP_SECTION_ICONS } from '../lib/helpContent';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  // iOS에서만 호출됨(RN Modal 스펙) — 완전히 닫힌 뒤에 다른 Modal을 열어야 할 때 씀
  onDismiss?: () => void;
};

export default function HelpModal({ visible, onClose, onDismiss }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
      {/* RN Modal은 App.tsx 최상위 SafeAreaProvider 바깥의 별도 네이티브 창(윈도우)에 뜬다.
          그래서 바깥 SafeAreaProvider의 값을 못 물려받아 top이 0으로 계산되고, 다이나믹
          아일랜드/상태표시줄과 헤더가 겹치는 문제가 있었다 — Modal 내부에 SafeAreaProvider를
          새로 하나 더 둬서 이 창 기준으로 다시 측정하게 한다. */}
      <SafeAreaProvider>
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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {t.help.sections.map((section, index) => (
            <View key={section.title} style={[styles.section, { backgroundColor: accent.card }]}>
              <View style={[styles.iconBadge, { backgroundColor: accent.primary }]}>
                <Ionicons name={HELP_SECTION_ICONS[index]} size={26} color={accent.onPrimary} />
              </View>
              <View style={styles.sectionText}>
                <Text style={[styles.sectionTitle, { color: accent.text }]}>{section.title}</Text>
                <Text style={[styles.sectionDescription, { color: accent.textMuted }]}>{section.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
      </SafeAreaProvider>
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
