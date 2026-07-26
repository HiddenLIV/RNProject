import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColors } from '../lib/ThemeContext';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  capturedAssetId?: string;
  busy: boolean;
  onCapture: () => void;
  onViewCaptured: () => void;
};

export default function CaptureVideoRow({ capturedAssetId, busy, onCapture, onViewCaptured }: Props) {
  const accent = useAccentColors();
  return (
    <View style={styles.row}>
      <Pressable style={styles.button} onPress={onCapture} disabled={busy}>
        <Ionicons name="videocam-outline" size={16} color={accent.accent} />
        <Text style={[styles.buttonText, { color: accent.accent }]}>
          {busy ? '처리 중…' : capturedAssetId ? '다시 촬영' : '촬영'}
        </Text>
      </Pressable>
      {capturedAssetId && (
        <Pressable style={styles.button} onPress={onViewCaptured}>
          <Ionicons name="play-circle-outline" size={16} color={accent.accent} />
          <Text style={[styles.buttonText, { color: accent.accent }]}>방금 찍은 영상 보기</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
