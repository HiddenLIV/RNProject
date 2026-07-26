import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  videoId?: string;
};

// 링크가 없는 운동에는 버튼조차 보이지 않는다 (스펙 요구사항 4)
export default function GuideVideoPanel({ videoId }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!videoId) return null;

  return (
    <View style={styles.container}>
      <Pressable style={[styles.toggle, { borderColor: accent.border }]} onPress={() => setExpanded((v) => !v)}>
        <Ionicons name={expanded ? 'chevron-up' : 'play-circle-outline'} size={18} color={accent.accentText} />
        <Text style={[styles.toggleText, { color: accent.accentText }]}>{t.guideVideoPanel.toggleLabel}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.player}>
          <YoutubePlayer height={200} videoId={videoId} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  player: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
