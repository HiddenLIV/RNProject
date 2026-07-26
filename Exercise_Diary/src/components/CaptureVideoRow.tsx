import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  capturedAssetId?: string;
  busy: boolean;
  onCapture: () => void;
  onViewCaptured: () => void;
};

export default function CaptureVideoRow({ capturedAssetId, busy, onCapture, onViewCaptured }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <View style={styles.row}>
      <Pressable style={[styles.button, { borderColor: accent.border }]} onPress={onCapture} disabled={busy}>
        <Ionicons name="videocam-outline" size={16} color={accent.accentText} />
        <Text style={[styles.buttonText, { color: accent.accentText }]}>
          {busy
            ? t.captureVideoRow.processing
            : capturedAssetId
              ? t.captureVideoRow.recapture
              : t.captureVideoRow.capture}
        </Text>
      </Pressable>
      {capturedAssetId && (
        <Pressable style={[styles.button, { borderColor: accent.border }]} onPress={onViewCaptured}>
          <Ionicons name="play-circle-outline" size={16} color={accent.accentText} />
          <Text style={[styles.buttonText, { color: accent.accentText }]}>{t.captureVideoRow.viewJustCaptured}</Text>
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
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
