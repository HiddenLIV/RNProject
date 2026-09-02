import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';

type Props = {
  capturedUri?: string;
  busy?: boolean;
  // 생략하면(예: 측정 결과 화면) 새로 촬영하는 버튼 없이 "방금 찍은 영상 보기"만 보여준다.
  onCapture?: () => void;
  onViewCaptured: () => void;
};

export default function CaptureVideoRow({ capturedUri, busy = false, onCapture, onViewCaptured }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();

  // 촬영 버튼도 없고 보여줄 영상도 없으면 빈 줄만 차지하므로, 호출부가 조건부 렌더를
  // 깜빡해도 안전하게 아무것도 안 그린다.
  if (!onCapture && !capturedUri) return null;

  return (
    <View style={styles.row}>
      {onCapture && (
        <Pressable style={[styles.button, { borderColor: accent.border }]} onPress={onCapture} disabled={busy}>
          <Ionicons name="videocam-outline" size={18} color={accent.accentText} />
          <Text style={[styles.buttonText, { color: accent.accentText }]}>
            {busy
              ? t.captureVideoRow.processing
              : capturedUri
                ? t.captureVideoRow.recapture
                : t.captureVideoRow.capture}
          </Text>
        </Pressable>
      )}
      {capturedUri && (
        <Pressable style={[styles.button, { borderColor: accent.border }]} onPress={onViewCaptured}>
          <Ionicons name="play-circle-outline" size={18} color={accent.accentText} />
          <Text style={[styles.buttonText, { color: accent.accentText }]}>{t.captureVideoRow.viewJustCaptured}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
