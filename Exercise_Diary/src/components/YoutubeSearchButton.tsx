import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Text from './AppText';
import { showAlert } from '../lib/alert';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { openYoutubeSearch } from '../lib/youtube';
import { fontSize, radius, spacing } from '../theme';

// 유튜브 공식 브랜드 색 — 앱 테마(포인트 컬러)가 바뀌어도 유튜브 버튼만은 이 색으로 고정한다
const YOUTUBE_RED = '#FF0000';

type Props = {
  exerciseName: string;
};

export default function YoutubeSearchButton({ exerciseName }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    if (busy) return;
    const trimmed = exerciseName.trim();
    if (!trimmed) {
      showAlert(t.youtubeSearch.emptyNameTitle, t.youtubeSearch.emptyNameBody);
      return;
    }
    setBusy(true);
    const result = await openYoutubeSearch(trimmed, t.youtubeSearch.keyword);
    setBusy(false);
    if (!result.ok) {
      showAlert(t.youtubeSearch.openErrorTitle, t.youtubeSearch.openErrorBody);
    }
  };

  return (
    <Pressable
      style={[styles.button, { borderColor: accent.border }, busy && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={t.youtubeSearch.label}
    >
      <Ionicons name="logo-youtube" size={16} color={YOUTUBE_RED} />
      <Text style={[styles.buttonText, { color: accent.text }]}>{t.youtubeSearch.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
