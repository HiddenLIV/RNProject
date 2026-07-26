import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { EXERCISE_NAME_MAX_LENGTH } from '../lib/exercisePresets';
import { removeExercise, updateExercise } from '../lib/storage';
import { Exercise } from '../lib/types';
import { extractYoutubeVideoId } from '../lib/youtube';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  exercise: Exercise | null;
  existingNames: string[];
  onClose: () => void;
  onSaved: () => void;
};

export default function EditExerciseModal({ exercise, existingNames, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [usesWeight, setUsesWeight] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [videoLinkText, setVideoLinkText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (exercise) {
      setName(exercise.name);
      setUsesWeight(exercise.usesWeight ?? false);
      setWeightUnit(exercise.weightUnit ?? 'kg');
      setVideoLinkText(exercise.guideVideoId ? `https://youtu.be/${exercise.guideVideoId}` : '');
      setError('');
    }
  }, [exercise]);

  if (!exercise) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('운동 이름을 입력해 주세요');
      return;
    }
    if (trimmed.length > EXERCISE_NAME_MAX_LENGTH) {
      setError(`이름은 ${EXERCISE_NAME_MAX_LENGTH}자 이내로 입력해 주세요`);
      return;
    }
    const normalizedTrimmed = trimmed.toLocaleLowerCase();
    const isDuplicate =
      normalizedTrimmed !== exercise.name.toLocaleLowerCase() &&
      existingNames.some((n) => n.toLocaleLowerCase() === normalizedTrimmed);
    if (isDuplicate) {
      setError('이미 같은 이름의 운동이 있습니다');
      return;
    }
    const trimmedLink = videoLinkText.trim();
    let guideVideoId: string | undefined;
    if (trimmedLink) {
      const id = extractYoutubeVideoId(trimmedLink);
      if (!id) {
        setError('유튜브 영상 링크 형식이 아닙니다 (watch, youtu.be, shorts 링크만 지원)');
        return;
      }
      guideVideoId = id;
    }
    await updateExercise(exercise.id, {
      name: trimmed,
      guideVideoId,
      ...(exercise.measureType === 'reps' ? { usesWeight, weightUnit: usesWeight ? weightUnit : undefined } : {}),
    });
    onSaved();
  };

  const handleDelete = () => {
    Alert.alert('운동 삭제', `"${exercise.name}"과(와) 이 운동의 모든 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
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
        <View style={styles.card}>
          <Text style={styles.title}>운동 수정</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            maxLength={EXERCISE_NAME_MAX_LENGTH}
            autoFocus
          />

          <Text style={styles.videoLabel}>자세 영상 링크 (선택)</Text>
          <TextInput
            style={styles.input}
            value={videoLinkText}
            onChangeText={(text) => {
              setVideoLinkText(text);
              setError('');
            }}
            placeholder="유튜브 링크 붙여넣기"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {exercise.measureType === 'reps' && (
            <>
              <View style={styles.weightRow}>
                <Text style={styles.weightLabel}>무게 기록 사용</Text>
                <Switch
                  value={usesWeight}
                  onValueChange={setUsesWeight}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>
              {usesWeight && (
                <View style={styles.segmentRow}>
                  <Pressable
                    style={[styles.segment, weightUnit === 'kg' && styles.segmentSelected]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <Text style={[styles.segmentText, weightUnit === 'kg' && styles.segmentTextSelected]}>kg</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segment, weightUnit === 'lb' && styles.segmentSelected]}
                    onPress={() => setWeightUnit('lb')}
                  >
                    <Text style={[styles.segmentText, weightUnit === 'lb' && styles.segmentTextSelected]}>
                      파운드
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.secondaryButton]} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.primaryButton]} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>저장</Text>
            </Pressable>
          </View>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>이 운동 삭제</Text>
          </Pressable>
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
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.card,
  },
  videoLabel: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textMuted,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightLabel: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textMuted,
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
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentTextSelected: {
    color: colors.white,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
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
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.card,
  },
  secondaryButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
  },
  deleteButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.danger,
  },
});
