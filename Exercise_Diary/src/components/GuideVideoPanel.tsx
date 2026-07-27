import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from './AppText';
import YoutubePlayer from 'react-native-youtube-iframe';
import YoutubeSearchButton from './YoutubeSearchButton';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { updateExercise } from '../lib/storage';
import { parseYoutubeLink } from '../lib/youtube';
import { fontSize, radius, spacing } from '../theme';

type FormMode = 'closed' | 'add' | 'edit';

type Props = {
  exerciseId: string;
  exerciseName: string;
  videoId?: string;
  onGuideVideoChange: (guideVideoId: string | undefined) => void;
};

export default function GuideVideoPanel({ exerciseId, exerciseName, videoId, onGuideVideoChange }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [linkText, setLinkText] = useState('');
  const [linkError, setLinkError] = useState('');
  const [busy, setBusy] = useState(false); // 저장/삭제 중 연타 방지

  const openAddForm = () => {
    setFormMode('add');
    setLinkText('');
    setLinkError('');
  };

  const openEditForm = () => {
    setExpanded(false); // 펼쳐져 있던 플레이어가 있으면 접는다
    setFormMode('edit');
    setLinkText(videoId ? `https://youtu.be/${videoId}` : '');
    setLinkError('');
  };

  const closeForm = () => {
    setFormMode('closed');
    setLinkText('');
    setLinkError('');
  };

  const handleSave = async () => {
    if (busy) return;
    const result = parseYoutubeLink(linkText, t);
    if (result.error) {
      setLinkError(result.error);
      return;
    }
    setBusy(true);
    try {
      await updateExercise(exerciseId, { guideVideoId: result.id });
      onGuideVideoChange(result.id);
      closeForm();
    } catch {
      setLinkError(t.guideVideoPanel.errorSaveFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(t.guideVideoPanel.deleteConfirmTitle, t.guideVideoPanel.deleteConfirmBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          if (busy) return;
          setBusy(true);
          try {
            await updateExercise(exerciseId, { guideVideoId: undefined });
            onGuideVideoChange(undefined);
            closeForm();
          } catch {
            setLinkError(t.guideVideoPanel.errorSaveFailed);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (formMode !== 'closed') {
    return (
      <View style={styles.container}>
        <View style={[styles.addForm, { borderColor: accent.border, backgroundColor: accent.card }]}>
          <YoutubeSearchButton exerciseName={exerciseName} />
          <TextInput
            style={[
              styles.input,
              { borderColor: accent.border, color: accent.text, backgroundColor: accent.background },
            ]}
            value={linkText}
            onChangeText={(text) => {
              setLinkText(text);
              setLinkError('');
            }}
            placeholder={t.editExercise.videoLinkPlaceholder}
            placeholderTextColor={accent.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            autoFocus
          />
          {linkError !== '' && <Text style={[styles.error, { color: accent.danger }]}>{linkError}</Text>}
          <View style={styles.addFormButtonRow}>
            {formMode === 'edit' && (
              <Pressable
                style={[styles.addFormButton, { backgroundColor: accent.dangerSoft }, busy && styles.addFormButtonDisabled]}
                onPress={handleDeletePress}
                disabled={busy}
              >
                <Text style={[styles.addFormButtonText, { color: accent.danger }]}>{t.common.delete}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.addFormButton, { backgroundColor: accent.background }, busy && styles.addFormButtonDisabled]}
              onPress={closeForm}
              disabled={busy}
            >
              <Text style={[styles.addFormButtonText, { color: accent.text }]}>{t.editExercise.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.addFormButton, { backgroundColor: accent.primary }, busy && styles.addFormButtonDisabled]}
              onPress={handleSave}
              disabled={busy}
            >
              <Text style={[styles.addFormButtonText, { color: accent.onPrimary }]}>{t.editExercise.save}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!videoId) {
    return (
      <View style={styles.container}>
        <Pressable style={[styles.toggle, { borderColor: accent.border }]} onPress={openAddForm}>
          <Ionicons name="add-circle-outline" size={18} color={accent.accentText} />
          <Text style={[styles.toggleText, { color: accent.accentText }]}>{t.guideVideoPanel.addLinkLabel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          style={[styles.toggle, styles.toggleInRow, { borderColor: accent.border }]}
          onPress={() => setExpanded((v) => !v)}
        >
          <Ionicons name={expanded ? 'chevron-up' : 'play-circle-outline'} size={18} color={accent.accentText} />
          <Text style={[styles.toggleText, { color: accent.accentText }]}>{t.guideVideoPanel.toggleLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.editIconButton, { borderColor: accent.border }]}
          onPress={openEditForm}
          hitSlop={8}
          accessibilityLabel={t.guideVideoPanel.editAccessibility}
        >
          <Ionicons name="pencil" size={16} color={accent.textMuted} />
        </Pressable>
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  toggleInRow: {
    flex: 1,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  editIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addForm: {
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.smd,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
  },
  error: {
    fontSize: fontSize.sm,
  },
  addFormButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  addFormButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFormButtonDisabled: {
    opacity: 0.6,
  },
  addFormButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  player: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
