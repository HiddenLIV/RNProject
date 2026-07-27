import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  capturedAssetId?: string;
  busy?: boolean;
  // 생략하면(예: 측정 결과 화면) 새로 촬영하는 버튼 없이 "방금 찍은 영상 보기"만 보여준다.
  onCapture?: () => void;
  onViewCaptured: () => void;
};

export default function CaptureVideoRow({ capturedAssetId, busy = false, onCapture, onViewCaptured }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();

  // 촬영 버튼도 없고 보여줄 영상도 없으면 빈 줄만 차지하므로, 호출부가 조건부 렌더를
  // 깜빡해도 안전하게 아무것도 안 그린다.
  if (!onCapture && !capturedAssetId) return null;

  return (
    <View style={styles.row}>
      {onCapture && (
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
      )}
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
