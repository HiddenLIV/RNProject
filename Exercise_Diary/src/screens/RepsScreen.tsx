import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import Text from '../components/AppText';
import CameraPermissionModal from '../components/CameraPermissionModal';
import CaptureVideoRow from '../components/CaptureVideoRow';
import ColorSwitch from '../components/ColorSwitch';
import GuideVideoPanel from '../components/GuideVideoPanel';
import NumberStepper from '../components/NumberStepper';
import RestTimerBanner from '../components/RestTimerBanner';
import SetListEditor from '../components/SetListEditor';
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
import { useMotivationalQuote } from '../lib/useMotivationalQuote';
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
  /** 미저장 세트 수가 바뀔 때마다 상위(ExerciseScreen)에 알린다 — 뒤로가기 확인 alert 판단용 */
  onUnsavedCountChange?: (count: number) => void;
  /**
   * false면 화면을 렌더링하지 않는다 — 그래도 컴포넌트 자체는 계속 마운트돼 있으므로 세트 목록·
   * 입력값·촬영 영상·휴식 타이머가 모두 그대로 유지된다(기록 탭으로 전환했다 돌아와도 값 유지).
   */
  visible: boolean;
};

export type RepsScreenHandle = {
  /** 뒤로가기 확인 alert에서 "저장"을 선택했을 때 기존 저장 버튼과 같은 로직으로 저장한다 */
  save: () => Promise<void>;
};

const RepsScreen = forwardRef<RepsScreenHandle, Props>(function RepsScreen(
  { exercise, onGuideVideoChange, onUnsavedCountChange, visible },
  ref,
) {
  const accent = useAccentColors();
  const t = useTranslation();
  // 입력은 "이번 세트" 한 칸에서만 하고, 추가할 때마다 기록 목록에 쌓는다 — 세트가
  // 여러 개로 늘어나도 지금까지 몇 세트를 했는지 목록으로 바로 확인할 수 있게 하기 위함
  // (여러 행을 동시에 수정하게 두면 총 세트 수를 한눈에 파악하기 어려웠다).
  const [currentReps, setCurrentReps] = useState(1);
  const [currentWeightText, setCurrentWeightText] = useState('');
  const [loggedSets, setLoggedSets] = useState<RepsSet[]>([]);
  // null이면 "새 세트 추가" 모드, 인덱스가 있으면 그 세트를 수정 중 — 추가(+)/확정(체크) 버튼이
  // 같은 버튼 하나에서 상태만 바뀐다(요구사항 5).
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
  const { settings, updateSettings, alarmVolumeMode } = useTimerSettings(exercise.id);
  const timerAudio = useTimerAudio();
  const rest = useRestTimer(() => {
    // 시간형 운동(TimerScreen)의 벨 간격 알림음과 구분되도록 휴식 종료 전용 사운드를 쓴다
    // (요구사항 8). 1.18초짜리라 기본 800ms보다 넉넉한 복귀 지연을 넘긴다.
    timerAudio
      .playBellSoundWithoutFocus(
        require('../../assets/sounds/opening-bell.mp3'),
        alarmVolumeMode,
        1500,
      )
      .catch(() => {});
    notifySuccess();
  });
  useKeepAwakeWhileActive(rest.phase === 'resting');
  const restQuote = useMotivationalQuote(rest.phase === 'resting', t.quotes);

  useEffect(() => {
    onUnsavedCountChange?.(loggedSets.length);
  }, [loggedSets.length, onUnsavedCountChange]);

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
    const nextSet: RepsSet = {
      reps: currentReps,
      weight: exercise.usesWeight ? parseFloat(currentWeightText) || 0 : undefined,
    };
    if (editingIndex != null) {
      // 수정 확정 — 새 세트로 추가하지 않고 같은 인덱스를 갱신한다. 세트 개수가 바뀌지
      // 않으므로 휴식 타이머를 다시 시작하지 않는다(요구사항 5-2, 5-4).
      const index = editingIndex;
      setLoggedSets((prev) => prev.map((s, i) => (i === index ? nextSet : s)));
      setEditingIndex(null);
    } else {
      setLoggedSets((prev) => [...prev, nextSet]);
      if (settings.restEnabled) rest.start(settings.restSeconds);
    }
    // 입력칸은 일부러 초기화하지 않는다 — 방금 추가/수정한 무게·횟수가 다음 세트의 기본값으로
    // 그대로 남아 있어야 같은 무게로 이어지는 세트를 반복 입력하기 편하다.
  };

  const handleCurrentRepsChange = (reps: number) => {
    setJustSaved(false);
    setCurrentReps(reps);
  };

  const handleCurrentWeightTextChange = (weightText: string) => {
    setJustSaved(false);
    setCurrentWeightText(weightText);
  };

  const startEditSet = (index: number) => {
    setJustSaved(false);
    tapLight();
    const set = loggedSets[index];
    setEditingIndex(index);
    setCurrentReps(set.reps);
    setCurrentWeightText(set.weight != null ? String(set.weight) : '');
  };

  const removeLoggedSet = (index: number) => {
    setJustSaved(false);
    tapLight();
    setLoggedSets((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      // 수정 중이던 세트를 삭제했다 — 입력 칸에 남은 초안 값을 함께 비워야, 그대로 "+"를
      // 눌렀을 때 방금 지운 세트가 새 세트로 다시 추가되는 일이 없다.
      setEditingIndex(null);
      setCurrentReps(1);
      setCurrentWeightText('');
    } else if (editingIndex != null && editingIndex > index) {
      // 앞쪽 세트가 삭제돼 수정 중인 세트의 인덱스가 밀렸다 — 대상만 보정한다.
      setEditingIndex(editingIndex - 1);
    }
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
    setEditingIndex(null);
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

  useImperativeHandle(ref, () => ({ save: handleSave }));

  // 화면을 렌더링하지 않을 뿐, 컴포넌트는 계속 마운트돼 있다 — 위 상태·훅이 전부 그대로 유지된다.
  if (!visible) return null;

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
          capturedUri={capturedVideo?.uri}
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
                quote={restQuote}
                onSkip={handleSkipRest}
              />
            ) : (
              <>
                {settings.restEnabled && (
                  <NumberStepper
                    label={t.reps.restLabel}
                    value={settings.restSeconds}
                    min={REST_SECONDS_MIN}
                    max={REST_SECONDS_MAX}
                    step={REST_SECONDS_STEP}
                    unit={t.units.seconds}
                    onChange={(v) => updateSettings({ restSeconds: v })}
                  />
                )}
                <View style={styles.restEnabledRow}>
                  <Text style={[styles.restEnabledLabel, { color: accent.textMuted }]}>
                    {t.reps.restEnabledLabel}
                  </Text>
                  <ColorSwitch
                    value={settings.restEnabled}
                    onValueChange={(v) => updateSettings({ restEnabled: v })}
                    color={accent.primary}
                  />
                </View>
              </>
            )}
          </View>
          <SetListEditor
            exercise={exercise}
            sets={loggedSets}
            currentReps={currentReps}
            currentWeightText={currentWeightText}
            editingIndex={editingIndex}
            error={error}
            onRepsChange={handleCurrentRepsChange}
            onWeightTextChange={handleCurrentWeightTextChange}
            onConfirm={addSet}
            onStartEdit={startEditSet}
            onRemove={removeLoggedSet}
          />
        </View>
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
        uri={viewingVideo ? (capturedVideo?.uri ?? null) : null}
        onClose={() => setViewingVideo(false)}
      />
    </KeyboardAvoidingView>
  );
});

export default RepsScreen;

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
