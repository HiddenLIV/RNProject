import { Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Text from './AppText';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  storeUrl: string;
  onDismiss: () => void;
};

// 하단에서 올라오는 업데이트 안내 바텀시트 — "나중에"·백드롭 탭·뒤로가기 모두 onDismiss로 닫힌다.
// visible을 Modal에 그대로 넘겨(언마운트 대신) HelpModal·BackupModal과 동일하게 닫힘 슬라이드
// 애니메이션이 재생되게 한다.
export default function ForceUpdateModal({ visible, storeUrl, onDismiss }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      {/* HelpModal·BackupModal과 같은 이유로 Modal 내부에 SafeAreaProvider를 새로 둔다 —
          별도 네이티브 창이라 바깥 SafeAreaProvider의 bottom 값(홈 인디케이터 인셋)을 못 물려받는다. */}
      <SafeAreaProvider>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
          <SafeAreaView
            edges={['bottom']}
            style={[styles.sheet, { backgroundColor: accent.background }]}
          >
            <View style={styles.header}>
              <View style={styles.textBlock}>
                <Text style={[styles.title, { color: accent.text }]}>{t.forceUpdate.title}</Text>
                <Text style={[styles.body, { color: accent.textMuted }]}>{t.forceUpdate.body}</Text>
              </View>
              <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
            </View>
            <View style={styles.buttonRow}>
              <Pressable style={[styles.button, { backgroundColor: accent.card }]} onPress={onDismiss}>
                <Text style={[styles.secondaryButtonText, { color: accent.text }]}>{t.forceUpdate.later}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, { backgroundColor: accent.primary }]}
                onPress={() => Linking.openURL(storeUrl).catch(() => {})}
              >
                <Text style={[styles.primaryButtonText, { color: accent.onPrimary }]}>
                  {t.forceUpdate.updateButton}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  body: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
