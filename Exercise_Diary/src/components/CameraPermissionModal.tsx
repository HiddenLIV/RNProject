import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { PermissionState } from '../lib/video';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  state: PermissionState | null; // null이면 렌더링 안 함, 'granted'는 호출부에서 애초에 이 모달을 안 띄움
  onGrant: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
};

export default function CameraPermissionModal({ state, onGrant, onOpenSettings, onClose }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  if (!state || state === 'granted') return null;
  const blocked = state === 'blocked';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: accent.background }]}>
          <Text style={[styles.title, { color: accent.text }]}>{t.cameraPermission.title}</Text>
          <Text style={[styles.body, { color: accent.textMuted }]}>{t.cameraPermission.body}</Text>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, { backgroundColor: accent.card }]} onPress={onClose}>
              <Text style={[styles.secondaryButtonText, { color: accent.text }]}>{t.cameraPermission.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: accent.primary }]}
              onPress={blocked ? onOpenSettings : onGrant}
            >
              <Text style={[styles.primaryButtonText, { color: accent.onPrimary }]}>
                {blocked ? t.cameraPermission.openSettings : t.cameraPermission.grant}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
