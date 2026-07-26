import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import CameraPermissionModal from '../components/CameraPermissionModal';
import CaptureVideoRow from '../components/CaptureVideoRow';
import GuideVideoPanel from '../components/GuideVideoPanel';
import NumberStepper from '../components/NumberStepper';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { addRepsRecord, createId } from '../lib/storage';
import { Exercise, RepsSet, VideoRef } from '../lib/types';
import { captureExerciseVideo, getVideoPermissionState, PermissionState, requestVideoPermissions } from '../lib/video';
import { buttonShadow, colors, fontSize, radius, spacing } from '../theme';

type Props = {
  exercise: Exercise;
};

// 화면 로컬 편집 상태 — 무게는 소수점 입력 중간 상태("12.")를 그대로 보여줘야 해서
// 문자열로 들고 있다가 저장 시점에 숫자로 변환한다. id는 배열 인덱스 대신 key로 써서
// 세트 삭제 시 다른 행의 NumberStepper/TextInput 내부 편집 상태가 엉키지 않게 한다.
type EditableSet = {
  id: string;
  reps: number;
  weightText: string;
};

const MAX_REPS = 200;

function newSet(prev?: EditableSet): EditableSet {
  return { id: createId(), reps: prev?.reps ?? 1, weightText: prev?.weightText ?? '' };
}

export default function RepsScreen({ exercise }: Props) {
  const [sets, setSets] = useState<EditableSet[]>([newSet()]);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 촬영한 영상 참조 — 저장하면 그 기록에 실려 나가고 초기화된다. 저장하지 않고
  // 화면을 벗어나면(탭 전환 등) 컴포넌트가 언마운트되며 자연히 사라진다.
  const [capturedVideo, setCapturedVideo] = useState<VideoRef | null>(null);
  const [viewingVideo, setViewingVideo] = useState(false);
  const [permissionModal, setPermissionModal] = useState<PermissionState | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);

  const runCapture = async () => {
    try {
      const result = await captureExerciseVideo();
      if (result.status === 'saved') setCapturedVideo(result.ref);
    } catch {
      Alert.alert('촬영 실패', '영상을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setVideoBusy(false);
    }
  };

  const handleCapturePress = async () => {
    if (videoBusy) return; // 연타 방지 — 권한 확인 중에도 이미 처리 중으로 간주한다
    setVideoBusy(true);
    try {
      const state = await getVideoPermissionState();
      if (state !== 'granted') {
        setPermissionModal(state);
        return;
      }
      await runCapture();
    } catch {
      Alert.alert('촬영 실패', '권한을 확인하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setVideoBusy(false);
    }
  };

  const handleGrantPermission = async () => {
    setVideoBusy(true);
    try {
      const granted = await requestVideoPermissions();
      if (!granted) {
        setPermissionModal(await getVideoPermissionState());
        return;
      }
      setPermissionModal(null);
      await runCapture();
    } catch {
      Alert.alert('촬영 실패', '권한을 확인하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setVideoBusy(false);
    }
  };

  const handleOpenSettings = () => {
    setPermissionModal(null);
    Linking.openSettings();
  };

  const updateSet = (index: number, patch: Partial<EditableSet>) => {
    setJustSaved(false);
    setError('');
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addSet = () => {
    setJustSaved(false);
    setSets((prev) => [...prev, newSet(prev[prev.length - 1])]);
  };

  const removeSet = (index: number) => {
    setJustSaved(false);
    setSets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (saving) return; // 저장 중 연타 방지
    if (sets.some((s) => s.reps < 1)) {
      setError('모든 세트는 1회 이상이어야 합니다');
      return;
    }
    setSaving(true);
    const finalSets: RepsSet[] = sets.map((s) => ({
      reps: s.reps,
      weight: exercise.usesWeight ? parseFloat(s.weightText) || 0 : undefined,
    }));
    await addRepsRecord(exercise.id, {
      id: createId(),
      measuredAt: new Date().toISOString(),
      sets: finalSets,
      weightUnit: exercise.usesWeight ? exercise.weightUnit : undefined,
      videoRef: capturedVideo ?? undefined,
    });
    setSets([newSet()]);
    setCapturedVideo(null);
    setError('');
    setJustSaved(true);
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={16}
    >
      <Text style={styles.title}>{exercise.name}</Text>
      <GuideVideoPanel videoId={exercise.guideVideoId} />
      <CaptureVideoRow
        capturedAssetId={capturedVideo?.assetId}
        busy={videoBusy}
        onCapture={handleCapturePress}
        onViewCaptured={() => setViewingVideo(true)}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.colIndex]}>세트</Text>
            {exercise.usesWeight && <Text style={[styles.headerCell, styles.colWeight]}>무게</Text>}
            <Text style={[styles.headerCell, styles.colReps]}>횟수</Text>
            <View style={styles.colDelete} />
          </View>

          {sets.map((set, index) => (
            <View key={set.id} style={[styles.setRow, index > 0 && styles.setRowDivider]}>
              <Text style={[styles.setIndex, styles.colIndex]}>{index + 1}</Text>
              {exercise.usesWeight && (
                <View style={[styles.weightField, styles.colWeight]}>
                  <TextInput
                    style={styles.weightInput}
                    value={set.weightText}
                    onChangeText={(weightText) => updateSet(index, { weightText })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textFaint}
                  />
                  <Text style={styles.weightUnit}>{exercise.weightUnit === 'lb' ? 'lb' : 'kg'}</Text>
                </View>
              )}
              <View style={styles.colReps}>
                <NumberStepper
                  label=""
                  value={set.reps}
                  min={0}
                  max={MAX_REPS}
                  unit="회"
                  editable
                  compact
                  onChange={(reps) => updateSet(index, { reps })}
                />
              </View>
              <Pressable
                style={[styles.colDelete, styles.removeButton, sets.length <= 1 && styles.removeButtonDisabled]}
                onPress={() => removeSet(index)}
                disabled={sets.length <= 1}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color={sets.length <= 1 ? colors.textFaint : colors.danger} />
              </Pressable>
            </View>
          ))}

          <Pressable style={styles.addSetRow} onPress={addSet}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addSetText}>세트 추가</Text>
          </Pressable>
        </View>

        {error !== '' && <Text style={styles.error}>{error}</Text>}
        {justSaved && <Text style={styles.saved}>저장되었습니다</Text>}
      </ScrollView>

      <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>기록 저장</Text>
      </Pressable>

      <CameraPermissionModal
        state={permissionModal}
        onGrant={handleGrantPermission}
        onOpenSettings={handleOpenSettings}
        onClose={() => setPermissionModal(null)}
      />
      <VideoPlayerModal assetId={viewingVideo ? capturedVideo?.assetId ?? null : null} onClose={() => setViewingVideo(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  colIndex: {
    width: 28,
  },
  colWeight: {
    width: 96,
  },
  colReps: {
    flex: 1,
  },
  colDelete: {
    width: 28,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
  },
  setRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setIndex: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  weightField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weightInput: {
    minWidth: 44,
    borderWidth: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    fontSize: fontSize.base,
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.4,
  },
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  addSetText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
    textAlign: 'center',
  },
  saved: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  saveButton: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...buttonShadow,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.white,
  },
});
