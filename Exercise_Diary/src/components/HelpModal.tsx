import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HELP_SECTIONS } from '../lib/helpContent';
import { useAccentColors } from '../lib/ThemeContext';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HelpModal({ visible, onClose }: Props) {
  const accent = useAccentColors();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* RN Modal은 App.tsx 최상위 SafeAreaView 바깥의 별도 레이어에 뜨기 때문에
          여기서 직접 세이프에어리어를 잡아주지 않으면 헤더가 상태표시줄과 겹친다 */}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>도움말</Text>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {HELP_SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <View style={[styles.iconBadge, { backgroundColor: accent.primarySoft }]}>
                <Ionicons name={section.icon} size={26} color={accent.primary} />
              </View>
              <View style={styles.sectionText}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionDescription}>{section.description}</Text>
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
    backgroundColor: colors.background,
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
    color: colors.text,
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
    backgroundColor: colors.card,
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
    color: colors.text,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
