import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColors } from '../lib/ThemeContext';
import { PermissionState } from '../lib/video';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  state: PermissionState | null; // null이면 렌더링 안 함, 'granted'는 호출부에서 애초에 이 모달을 안 띄움
  onGrant: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
};

export default function CameraPermissionModal({ state, onGrant, onOpenSettings, onClose }: Props) {
  const accent = useAccentColors();
  if (!state || state === 'granted') return null;
  const blocked = state === 'blocked';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>카메라·사진 접근 권한이 필요해요</Text>
          <Text style={styles.body}>
            운동하는 모습을 촬영하고 기기 갤러리에 저장하려면 카메라와 사진 접근 권한이 필요합니다.
          </Text>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: accent.primary }]}
              onPress={blocked ? onOpenSettings : onGrant}
            >
              <Text style={[styles.primaryButtonText, { color: accent.onPrimary }]}>{blocked ? '설정으로 이동' : '권한 허용'}</Text>
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
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    fontSize: fontSize.base,
    color: colors.textMuted,
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
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.card,
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
  },
});
