import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { radius, spacing } from '../theme';

type Props = {
  uri: string | null;
  onClose: () => void;
};

export default function VideoPlayerModal({ uri, onClose }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();

  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });

  if (!uri) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: accent.background }]}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel={t.videoPlayer.closeAccessibility}
          >
            <Ionicons name="close" size={22} color={accent.text} />
          </Pressable>
          <View style={[styles.videoArea, { backgroundColor: accent.card }]}>
            <VideoView player={player} style={styles.video} nativeControls />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  videoArea: {
    aspectRatio: 9 / 16,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
