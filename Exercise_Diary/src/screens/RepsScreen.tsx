import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import Text from '../components/AppText';
import CameraPermissionModal from '../components/CameraPermissionModal';
import CaptureVideoRow from '../components/CaptureVideoRow';
import GuideVideoPanel from '../components/GuideVideoPanel';
import NumberStepper from '../components/NumberStepper';
import RestTimerBanner from '../components/RestTimerBanner';
import Toast from '../components/Toast';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { showAlert } from '../lib/alert';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { notifySuccess, tapLight, tapMedium } from '../lib/haptics';
import { useTranslation } from '../lib/i18n';
import { notifyReminderRecordSaved } from '../lib/notifications';
import { addRepsRecord, createId } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import {
  Exercise,
  RepsSet,
  REST_SECONDS_MAX,
  REST_SECONDS_MIN,
  REST_SECONDS_STEP,
  VideoRef,
} from '../lib/types';
import { useKeepAwakeWhileActive } from '../lib/useKeepAwakeWhileActive';
import { useRestTimer } from '../lib/useRestTimer';
import { useTimerAudio } from '../lib/useTimerAudio';
import { useTimerSettings } from '../lib/useTimerSettings';
import {
  captureExerciseVideo,
  getVideoPermissionState,
  PermissionState,
  requestVideoPermissions,
} from '../lib/video';
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

  // 세트 간 휴식 타이머 — 다른 운동(TimerScreen)이 쓰는 것과 같은 운동별 설정 저장소를
  // 그대로 재사용한다 (countdownSeconds/bellIntervalSeconds는 이 화면에서 쓰지 않는다).
  const { settings, updateSettings } = useTimerSettings(exercise.id);
  const timerAudio = useTimerAudio();
  const rest = useRestTimer(() => {
    timerAudio.playBellSoundWithoutFocus().catch(() => {});
    notifySuccess();
  });
  useKeepAwakeWhileActive(rest.phase === 'resting');

  const handleSkipRest = () => {
    tapLight();
    rest.skip();
  };

  const runCapture = async () => {
    try {
      const result = await captureExerciseVideo();
      if (result.status === 'saved') setCapturedVideo(result.ref);
    } catch {
      showAlert(t.timer.captureFailedTitle, t.timer.captureFailedBody);
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
      showAlert(t.timer.captureFailedTitle, t.timer.permissionFailedBody);
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
      showAlert(t.timer.captureFailedTitle, t.timer.permissionFailedBody);
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
    tapMedium();
    setLoggedSets((prev) => [
      ...prev,
      {
        reps: currentReps,
        weight: exercise.usesWeight ? parseFloat(currentWeightText) || 0 : undefined,
      },
    ]);
    if (settings.restEnabled) rest.start(settings.restSeconds);
  };

  const removeLoggedSet = (index: number) => {
    setJustSaved(false);
    tapLight();
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
    notifySuccess();
    notifyReminderRecordSaved({
      dailyTitle: t.reminder.dailyNotificationTitle,
      dailyBody: t.reminder.dailyNotificationBody,
      daysSinceTitle: t.reminder.daysSinceNotificationTitle,
      daysSinceBody: t.reminder.daysSinceNotificationBody,
    }).catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: accent.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={16}
    >
      <Text style={[styles.title, { color: accent.text }]}>
        {getExerciseDisplayName(exercise, t)}
      </Text>
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
          <View style={[styles.restSection, { borderBottomColor: accent.border }]}>
            {rest.phase === 'resting' ? (
              <RestTimerBanner
                remainingSec={rest.remainingSec}
                totalSec={settings.restSeconds}
                onSkip={handleSkipRest}
              />
            ) : (
              <>
                <NumberStepper
                  label={t.reps.restLabel}
                  value={settings.restSeconds}
                  min={REST_SECONDS_MIN}
                  max={REST_SECONDS_MAX}
                  step={REST_SECONDS_STEP}
                  unit={t.units.seconds}
                  onChange={(v) => updateSettings({ restSeconds: v })}
                />
                <View style={styles.restEnabledRow}>
                  <Text style={[styles.restEnabledLabel, { color: accent.textMuted }]}>
                    {t.reps.restEnabledLabel}
                  </Text>
                  <Switch
                    value={settings.restEnabled}
                    onValueChange={(v) => updateSettings({ restEnabled: v })}
                    trackColor={{ true: accent.primary, false: accent.border }}
                  />
                </View>
              </>
            )}
          </View>
          <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
            {t.reps.currentSetLabel}
          </Text>
          <View style={styles.currentEntryRow}>
            {exercise.usesWeight && (
              <View style={[styles.weightField, { borderColor: accent.primary }]}>
                <TextInput
                  style={[styles.weightInput, { color: accent.text }]}
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
                    <Text style={[styles.setIndex, { color: accent.textMuted }]}>
                      {t.reps.setNumberLabel(index + 1)}
                    </Text>
                    <Text style={[styles.setSummary, { color: accent.text }]}>
                      {exercise.usesWeight
                        ? `${set.weight ?? 0}${exercise.weightUnit === 'lb' ? t.units.lb : t.units.kg} × ${set.reps}${t.units.reps}`
                        : `${set.reps}${t.units.reps}`}
                    </Text>
                    <Pressable
                      style={styles.removeButton}
                      onPress={() => removeLoggedSet(index)}
                      hitSlop={16}
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
        <Text style={[styles.saveButtonText, { color: accent.onPrimary }]}>
          {t.reps.saveButton}
        </Text>
      </Pressable>

      <CameraPermissionModal
        state={permissionModal}
        onGrant={handleGrantPermission}
        onOpenSettings={handleOpenSettings}
        onClose={() => setPermissionModal(null)}
      />
      <VideoPlayerModal
        assetId={viewingVideo ? (capturedVideo?.assetId ?? null) : null}
        onClose={() => setViewingVideo(false)}
      />
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
  restSection: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  restEnabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restEnabledLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
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
  // 옆에 나란히 오는 횟수 스테퍼(48px 원형 버튼)와 시각적 무게가 비슷하도록, 테두리 없는
  // 밑줄 텍스트 대신 같은 높이의 알약형 박스로 감싼다.
  weightField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    minWidth: 76,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.pill,
  },
  weightInput: {
    minWidth: 28,
    padding: 0,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
