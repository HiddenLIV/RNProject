import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import Text from './AppText';
import YoutubeSearchButton from './YoutubeSearchButton';
import { EXERCISE_NAME_MAX_LENGTH, getExerciseDisplayName, inferPresetKey } from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { removeExercise, updateExercise } from '../lib/storage';
import { Exercise } from '../lib/types';
import { parseYoutubeLink } from '../lib/youtube';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  exercise: Exercise | null;
  existingNames: string[];
  onClose: () => void;
  onSaved: () => void;
};

export default function EditExerciseModal({ exercise, existingNames, onClose, onSaved }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [name, setName] = useState('');
  const [usesWeight, setUsesWeight] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [videoLinkText, setVideoLinkText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (exercise) {
      setName(getExerciseDisplayName(exercise, t));
      setUsesWeight(exercise.usesWeight ?? false);
      setWeightUnit(exercise.weightUnit ?? 'kg');
      setVideoLinkText(exercise.guideVideoId ? `https://youtu.be/${exercise.guideVideoId}` : '');
      setError('');
    }
  }, [exercise]);

  if (!exercise) return null;

  // 무게 단위 세그먼트 버튼이 공통으로 쓰는 선택 상태 색
  const segmentSelectedStyle = { backgroundColor: accent.primary, borderColor: accent.primary };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.editExercise.errorNameRequired);
      return;
    }
    if (trimmed.length > EXERCISE_NAME_MAX_LENGTH) {
      setError(t.editExercise.errorNameTooLong(EXERCISE_NAME_MAX_LENGTH));
      return;
    }
    const normalizedTrimmed = trimmed.toLocaleLowerCase();
    const originalDisplayName = getExerciseDisplayName(exercise, t);
    const nameChanged = normalizedTrimmed !== originalDisplayName.toLocaleLowerCase();
    const isDuplicate = nameChanged && existingNames.some((n) => n.toLocaleLowerCase() === normalizedTrimmed);
    if (isDuplicate) {
      setError(t.editExercise.errorDuplicateName);
      return;
    }
    const trimmedLink = videoLinkText.trim();
    let guideVideoId: string | undefined;
    if (trimmedLink) {
      const result = parseYoutubeLink(trimmedLink, t);
      if (result.error) {
        setError(result.error);
        return;
      }
      guideVideoId = result.id;
    }
    await updateExercise(exercise.id, {
      name: trimmed,
      guideVideoId,
      // 표시 이름과 다르게 고쳤다면 더 이상 프리셋 이름이 아니므로 presetKey를 해제한다.
      // 안 고쳤다면 원래 presetKey를 그대로 확정 저장한다 — 그냥 저장만 눌러도 name이 항상
      // 현재 언어의 번역된 표시 이름으로 덮어써지므로, 이때 presetKey를 안 채워두면
      // (레거시 데이터처럼 원래 presetKey가 없던 경우) 다음부터 언어를 바꿔도 이름이
      // 이번에 저장한 언어로 고정되고 프리셋 목록에도 중복 후보로 다시 나타난다.
      presetKey: nameChanged ? undefined : (exercise.presetKey ?? inferPresetKey(exercise.name)),
      ...(exercise.measureType === 'reps' ? { usesWeight, weightUnit: usesWeight ? weightUnit : undefined } : {}),
    });
    onSaved();
  };

  const handleDelete = () => {
    Alert.alert(t.editExercise.deleteTitle, t.editExercise.deleteBody(getExerciseDisplayName(exercise, t)), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          await removeExercise(exercise.id);
          onSaved();
        },
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.card, { backgroundColor: accent.background }]}>
          <ScrollView contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: accent.text }]}>{t.editExercise.title}</Text>
            <TextInput
              style={[styles.input, { borderColor: accent.border, color: accent.text, backgroundColor: accent.card }]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError('');
              }}
              maxLength={EXERCISE_NAME_MAX_LENGTH}
              autoFocus
            />

            <Text style={[styles.videoLabel, { color: accent.textMuted }]}>{t.editExercise.videoLinkLabel}</Text>
            <YoutubeSearchButton exerciseName={name} />
            <TextInput
              style={[styles.input, { borderColor: accent.border, color: accent.text, backgroundColor: accent.card }]}
              value={videoLinkText}
              onChangeText={(text) => {
                setVideoLinkText(text);
                setError('');
              }}
              placeholder={t.editExercise.videoLinkPlaceholder}
              placeholderTextColor={accent.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            {exercise.measureType === 'reps' && (
              <>
                <View style={styles.weightRow}>
                  <Text style={[styles.weightLabel, { color: accent.textMuted }]}>{t.editExercise.weightLabel}</Text>
                  <Switch
                    value={usesWeight}
                    onValueChange={setUsesWeight}
                    trackColor={{ true: accent.primary, false: accent.border }}
                  />
                </View>
                {usesWeight && (
                  <View style={styles.segmentRow}>
                    <Pressable
                      style={[
                        styles.segment,
                        { borderColor: accent.border, backgroundColor: accent.background },
                        weightUnit === 'kg' && segmentSelectedStyle,
                      ]}
                      onPress={() => setWeightUnit('kg')}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: accent.textMuted },
                          weightUnit === 'kg' && { color: accent.onPrimary },
                        ]}
                      >
                        {t.units.kg}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.segment,
                        { borderColor: accent.border, backgroundColor: accent.background },
                        weightUnit === 'lb' && segmentSelectedStyle,
                      ]}
                      onPress={() => setWeightUnit('lb')}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: accent.textMuted },
                          weightUnit === 'lb' && { color: accent.onPrimary },
                        ]}
                      >
                        {t.units.lb}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {error !== '' && <Text style={[styles.error, { color: accent.danger }]}>{error}</Text>}

            <View style={styles.buttonRow}>
              <Pressable style={[styles.button, { backgroundColor: accent.card }]} onPress={onClose}>
                <Text style={[styles.secondaryButtonText, { color: accent.text }]}>{t.editExercise.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.button, { backgroundColor: accent.primary }]} onPress={handleSave}>
                <Text style={[styles.primaryButtonText, { color: accent.onPrimary }]}>{t.editExercise.save}</Text>
              </Pressable>
            </View>
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Text style={[styles.deleteButtonText, { color: accent.danger }]}>{t.editExercise.deleteButton}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '85%',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  cardContent: {
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
  },
  videoLabel: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightLabel: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  segmentText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  error: {
    fontSize: fontSize.sm,
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
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  deleteButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
