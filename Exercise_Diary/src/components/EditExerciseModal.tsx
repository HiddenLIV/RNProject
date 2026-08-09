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
import ExerciseIcon from './ExerciseIcon';
import YoutubeSearchButton from './YoutubeSearchButton';
import {
  CUSTOM_ICON_CHOICES,
  EXERCISE_NAME_MAX_LENGTH,
  getExerciseDisplayName,
  ICON_CHOICES,
  inferPresetKey,
} from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { removeExercise, updateExercise } from '../lib/storage';
import { Exercise, MeasureType } from '../lib/types';
import { parseYoutubeLink } from '../lib/youtube';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  exercise: Exercise | null;
  existingNames: string[];
  sharedVideoLink?: string;
  onConsumeSharedVideoLink?: () => void;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditExerciseModal({
  exercise,
  existingNames,
  sharedVideoLink,
  onConsumeSharedVideoLink,
  onClose,
  onSaved,
}: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<Exercise['icon']>(CUSTOM_ICON_CHOICES[0]);
  const [measureType, setMeasureType] = useState<MeasureType>('time');
  const [usesWeight, setUsesWeight] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [videoLinkText, setVideoLinkText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (exercise) {
      setName(getExerciseDisplayName(exercise, t));
      setIcon(exercise.icon);
      setMeasureType(exercise.measureType);
      setUsesWeight(exercise.usesWeight ?? false);
      setWeightUnit(exercise.weightUnit ?? 'kg');
      setVideoLinkText(exercise.guideVideoId ? `https://youtu.be/${exercise.guideVideoId}` : '');
      setError('');
    }
  }, [exercise]);

  useEffect(() => {
    // 이 모달이 열려 있는(수정 중인) 동안 공유받은 링크가 있으면 채운다 — 이미 저장된 링크가
    // 있으면 덮어쓰지 않는다.
    if (exercise && sharedVideoLink && !videoLinkText) {
      setVideoLinkText(sharedVideoLink);
      setError('');
      onConsumeSharedVideoLink?.();
    }
  }, [exercise, sharedVideoLink, videoLinkText, onConsumeSharedVideoLink]);

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
      icon,
      measureType,
      guideVideoId,
      // 표시 이름과 다르게 고쳤다면 더 이상 프리셋 이름이 아니므로 presetKey를 해제한다.
      // 안 고쳤다면 원래 presetKey를 그대로 확정 저장한다 — 그냥 저장만 눌러도 name이 항상
      // 현재 언어의 번역된 표시 이름으로 덮어써지므로, 이때 presetKey를 안 채워두면
      // (레거시 데이터처럼 원래 presetKey가 없던 경우) 다음부터 언어를 바꿔도 이름이
      // 이번에 저장한 언어로 고정되고 프리셋 목록에도 중복 후보로 다시 나타난다.
      presetKey: nameChanged ? undefined : (exercise.presetKey ?? inferPresetKey(exercise.name)),
      ...(measureType === 'reps' ? { usesWeight, weightUnit: usesWeight ? weightUnit : undefined } : { usesWeight: undefined, weightUnit: undefined }),
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
        <View style={[styles.card, { backgroundColor: accent.background, borderColor: accent.primary }]}>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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

            <View style={styles.iconGrid}>
              {ICON_CHOICES.map((choice) => {
                const selected = icon === choice;
                return (
                  <Pressable
                    key={choice}
                    style={[styles.iconChoice, { backgroundColor: selected ? accent.primary : accent.primarySoft }]}
                    onPress={() => setIcon(choice)}
                    accessibilityLabel={t.addExercise.iconChoiceAccessibility}
                  >
                    <ExerciseIcon icon={choice} size={20} color={selected ? accent.onPrimary : accent.primary} />
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.weightLabel, { color: accent.textMuted }]}>{t.addExercise.measureTypeSectionLabel}</Text>
            <View style={styles.segmentRow}>
              <Pressable
                style={[
                  styles.segment,
                  { borderColor: accent.border, backgroundColor: accent.background },
                  measureType === 'time' && segmentSelectedStyle,
                ]}
                onPress={() => setMeasureType('time')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: accent.textMuted },
                    measureType === 'time' && { color: accent.onPrimary },
                  ]}
                >
                  {t.measureType.time}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  { borderColor: accent.border, backgroundColor: accent.background },
                  measureType === 'reps' && segmentSelectedStyle,
                ]}
                onPress={() => setMeasureType('reps')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: accent.textMuted },
                    measureType === 'reps' && { color: accent.onPrimary },
                  ]}
                >
                  {t.measureType.reps}
                </Text>
              </Pressable>
            </View>

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

            {measureType === 'reps' && (
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
    borderWidth: 1.5,
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
