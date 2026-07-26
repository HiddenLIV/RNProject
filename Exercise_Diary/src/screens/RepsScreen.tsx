import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import CameraPermissionModal from '../components/CameraPermissionModal';
import CaptureVideoRow from '../components/CaptureVideoRow';
import GuideVideoPanel from '../components/GuideVideoPanel';
import NumberStepper from '../components/NumberStepper';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { addRepsRecord, createId } from '../lib/storage';
import { Exercise, RepsSet, VideoRef } from '../lib/types';
import { captureExerciseVideo, getVideoPermissionState, PermissionState, requestVideoPermissions } from '../lib/video';
import { buttonShadowShape, fontSize, radius, spacing } from '../theme';

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
  const accent = useAccentColors();
  const t = useTranslation();
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
      Alert.alert(t.timer.captureFailedTitle, t.timer.captureFailedBody);
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
      Alert.alert(t.timer.captureFailedTitle, t.timer.permissionFailedBody);
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
      Alert.alert(t.timer.captureFailedTitle, t.timer.permissionFailedBody);
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
      setError(t.reps.errorMinReps);
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
      style={[styles.container, { backgroundColor: accent.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={16}
    >
      <Text style={[styles.title, { color: accent.text }]}>{getExerciseDisplayName(exercise, t)}</Text>
      <GuideVideoPanel videoId={exercise.guideVideoId} />
      <CaptureVideoRow
        capturedAssetId={capturedVideo?.assetId}
        busy={videoBusy}
        onCapture={handleCapturePress}
        onViewCaptured={() => setViewingVideo(true)}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.sheet, { backgroundColor: accent.card, borderColor: accent.border }]}>
          <View style={[styles.headerRow, { borderBottomColor: accent.border }]}>
            <Text style={[styles.headerCell, { color: accent.textFaint }, styles.colIndex]}>{t.reps.setColumn}</Text>
            {exercise.usesWeight && (
              <Text style={[styles.headerCell, { color: accent.textFaint }, styles.colWeight]}>
                {t.reps.weightColumn}
              </Text>
            )}
            <Text style={[styles.headerCell, { color: accent.textFaint }, styles.colReps]}>{t.reps.repsColumn}</Text>
            <View style={styles.colDelete} />
          </View>

          {sets.map((set, index) => (
            <View
              key={set.id}
              style={[styles.setRow, index > 0 && { borderTopWidth: 1, borderTopColor: accent.border }]}
            >
              <Text style={[styles.setIndex, { color: accent.textMuted }, styles.colIndex]}>{index + 1}</Text>
              {exercise.usesWeight && (
                <View style={[styles.weightField, styles.colWeight]}>
                  <TextInput
                    style={[styles.weightInput, { borderBottomColor: accent.border, color: accent.text }]}
                    value={set.weightText}
                    onChangeText={(weightText) => updateSet(index, { weightText })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={accent.textFaint}
                  />
                  <Text style={[styles.weightUnit, { color: accent.textMuted }]}>
                    {exercise.weightUnit === 'lb' ? t.units.lb : t.units.kg}
                  </Text>
                </View>
              )}
              <View style={styles.colReps}>
                <NumberStepper
                  label=""
                  value={set.reps}
                  min={0}
                  max={MAX_REPS}
                  unit={t.units.reps}
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
                accessibilityLabel={t.reps.removeSetAccessibility}
              >
                <Ionicons name="close" size={16} color={sets.length <= 1 ? accent.textFaint : accent.danger} />
              </Pressable>
            </View>
          ))}

          <Pressable style={[styles.addSetRow, { borderTopColor: accent.border }]} onPress={addSet}>
            <Ionicons name="add" size={16} color={accent.primaryText} />
            <Text style={[styles.addSetText, { color: accent.primaryText }]}>{t.reps.addSetButton}</Text>
          </Pressable>
        </View>

        {error !== '' && <Text style={[styles.error, { color: accent.danger }]}>{error}</Text>}
        {justSaved && <Text style={[styles.saved, { color: accent.primaryText }]}>{t.reps.savedNotice}</Text>}
      </ScrollView>

      <Pressable
        style={[
          styles.saveButton,
          { backgroundColor: accent.primary, ...buttonShadowShape, shadowColor: accent.primary },
          saving && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={[styles.saveButtonText, { color: accent.onPrimary }]}>{t.reps.saveButton}</Text>
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
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
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
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCell: {
    fontSize: fontSize.xs,
    fontWeight: '700',
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
  setIndex: {
    fontSize: fontSize.base,
    fontWeight: '700',
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
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    fontSize: fontSize.base,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: fontSize.xs,
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
    borderStyle: 'dashed',
  },
  addSetText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  error: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  saved: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
