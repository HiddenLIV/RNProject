import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAccentColors } from '../lib/ThemeContext';
import { resolveVideoUri } from '../lib/video';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  assetId: string | null;
  onClose: () => void;
};

// uri: undefined=조회 중, null=못 찾음(권한 없음·삭제됨), string=재생 가능
export default function VideoPlayerModal({ assetId, onClose }: Props) {
  const accent = useAccentColors();
  const [uri, setUri] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!assetId) {
      // 모달이 닫히는 경우 — source를 비워 플레이어가 재생성·해제되게 해서 재생을 멈춘다.
      setUri(undefined);
      return;
    }
    let cancelled = false;
    setUri(undefined);
    resolveVideoUri(assetId).then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const player = useVideoPlayer(uri ?? null, (p) => {
    p.play();
  });

  if (!assetId) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.videoArea}>
            {uri === undefined && <ActivityIndicator color={accent.primary} />}
            {uri === null && <Text style={styles.notFound}>영상을 찾을 수 없습니다</Text>}
            {uri && <VideoView player={player} style={styles.video} nativeControls />}
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  notFound: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
