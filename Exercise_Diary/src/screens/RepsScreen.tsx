import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Text from '../components/AppText';
import CameraPermissionModal from '../components/CameraPermissionModal';
import CaptureVideoRow from '../components/CaptureVideoRow';
import GuideVideoPanel from '../components/GuideVideoPanel';
import NumberStepper from '../components/NumberStepper';
import Toast from '../components/Toast';
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
  onGuideVideoChange: (guideVideoId: string | undefined) => void;
};

const MAX_REPS = 200;

export default function RepsScreen({ exercise, onGuideVideoChange }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  // 입력은 "이번 세트" 한 칸에서만 하고, 추가할 때마다 기록 목록에 쌓는다 — 세트가
  // 여러 개로 늘어나도 지금까지 몇 세트를 했는지 목록으로 바로 확인할 수 있게 하기 위함
  // (여러 행을 동시에 수정하게 두면 총 세트 수를 한눈에 파악하기 어려웠다).
  const [currentReps, setCurrentReps] = useState(1);
  const [currentWeightText, setCurrentWeightText] = useState('');
  const [loggedSets, setLoggedSets] = useState<RepsSet[]>([]);
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

  const addSet = () => {
    setJustSaved(false);
    if (currentReps < 1) {
      setError(t.reps.errorMinReps);
      return;
    }
    setError('');
    setLoggedSets((prev) => [
      ...prev,
      { reps: currentReps, weight: exercise.usesWeight ? parseFloat(currentWeightText) || 0 : undefined },
    ]);
  };

  const removeLoggedSet = (index: number) => {
    setJustSaved(false);
    setLoggedSets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (saving) return; // 저장 중 연타 방지
    if (loggedSets.length === 0) {
      setError(t.reps.errorNoSets);
      return;
    }
    setSaving(true);
    await addRepsRecord(exercise.id, {
      id: createId(),
      measuredAt: new Date().toISOString(),
      sets: loggedSets,
      weightUnit: exercise.usesWeight ? exercise.weightUnit : undefined,
      videoRef: capturedVideo ?? undefined,
    });
    setLoggedSets([]);
    setCurrentReps(1);
    setCurrentWeightText('');
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
      <View style={styles.videoButtons}>
        <GuideVideoPanel
          exerciseId={exercise.id}
          exerciseName={getExerciseDisplayName(exercise, t)}
          videoId={exercise.guideVideoId}
          onGuideVideoChange={onGuideVideoChange}
        />
        <CaptureVideoRow
          capturedAssetId={capturedVideo?.assetId}
          busy={videoBusy}
          onCapture={handleCapturePress}
          onViewCaptured={() => setViewingVideo(true)}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sheet, { backgroundColor: accent.card }]}>
          <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.reps.currentSetLabel}</Text>
          <View style={styles.currentEntryRow}>
            {exercise.usesWeight && (
              <View style={styles.weightField}>
                <TextInput
                  style={[styles.weightInput, { borderBottomColor: accent.border, color: accent.text }]}
                  value={currentWeightText}
                  onChangeText={(weightText) => {
                    setJustSaved(false);
                    setCurrentWeightText(weightText);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={accent.textFaint}
                />
                <Text style={[styles.weightUnit, { color: accent.textMuted }]}>
                  {exercise.weightUnit === 'lb' ? t.units.lb : t.units.kg}
                </Text>
              </View>
            )}
            <View style={styles.currentReps}>
              <NumberStepper
                label=""
                value={currentReps}
                min={0}
                max={MAX_REPS}
                unit={t.units.reps}
                editable
                onChange={(reps) => {
                  setJustSaved(false);
                  setCurrentReps(reps);
                }}
              />
            </View>
            <Pressable
              style={[styles.addButton, { backgroundColor: accent.primary }]}
              onPress={addSet}
              hitSlop={8}
              accessibilityLabel={t.reps.addSetButton}
            >
              <Ionicons name="add" size={22} color={accent.onPrimary} />
            </Pressable>
          </View>

          {loggedSets.length > 0 && (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  styles.recordedLabel,
                  { color: accent.textMuted, borderTopColor: accent.border },
                ]}
              >
                {t.reps.recordedSetsLabel}
              </Text>
              {loggedSets
                .map((set, index) => ({ set, index }))
                .reverse()
                .map(({ set, index }) => (
                  <View key={index} style={[styles.setRow, { borderTopColor: accent.border }]}>
                    <Text style={[styles.setIndex, { color: accent.textMuted }]}>{t.reps.setNumberLabel(index + 1)}</Text>
                    <Text style={[styles.setSummary, { color: accent.text }]}>
                      {exercise.usesWeight
                        ? `${set.weight ?? 0}${exercise.weightUnit === 'lb' ? t.units.lb : t.units.kg} × ${set.reps}${t.units.reps}`
                        : `${set.reps}${t.units.reps}`}
                    </Text>
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeLoggedSet(index)}
                      hitSlop={8}
                      accessibilityLabel={t.reps.removeSetAccessibility}
                    >
                      <Ionicons name="close" size={16} color={accent.danger} />
                    </Pressable>
                  </View>
                ))}
            </>
          )}
        </View>

        {error !== '' && <Text style={[styles.error, { color: accent.danger }]}>{error}</Text>}
      </ScrollView>

      <Toast visible={justSaved} message={t.reps.savedNotice} onHide={() => setJustSaved(false)} />

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
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  videoButtons: {
    gap: spacing.sm,
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
    padding: spacing.smd,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recordedLabel: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  currentEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentReps: {
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  setIndex: {
    width: 48,
    fontSize: fontSize.base,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  setSummary: {
    flex: 1,
    fontSize: fontSize.base,
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
  error: {
    fontSize: fontSize.sm,
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
