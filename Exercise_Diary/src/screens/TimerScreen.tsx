import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import CameraPermissionModal from '../components/CameraPermissionModal';
import CaptureVideoRow from '../components/CaptureVideoRow';
import ColorSwitch from '../components/ColorSwitch';
import GuideVideoPanel from '../components/GuideVideoPanel';
import NumberStepper from '../components/NumberStepper';
import TimeDisplay from '../components/TimeDisplay';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { speakCountdown, speakSecond, speakStart } from '../lib/feedback';
import { tapHeavy, tapLight, tapMedium } from '../lib/haptics';
import { useLanguage, useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import {
  BELL_INTERVAL_MAX_SECONDS,
  BELL_INTERVAL_MIN_SECONDS,
  BELL_INTERVAL_STEP_SECONDS,
  COUNTDOWN_MAX_SECONDS,
  COUNTDOWN_MIN_SECONDS,
  Exercise,
} from '../lib/types';
import { useAudioFocusHolder } from '../lib/useAudioFocusHolder';
import { useHangTimer } from '../lib/useHangTimer';
import { useKeepAwakeWhileActive } from '../lib/useKeepAwakeWhileActive';
import { useMotivationalQuote } from '../lib/useMotivationalQuote';
import { useTimerAudio } from '../lib/useTimerAudio';
import { MIN_RECORD_MS, useTimerResult } from '../lib/useTimerResult';
import { useTimerSettings } from '../lib/useTimerSettings';
import { useVideoCapture } from '../lib/useVideoCapture';
import { buttonShadowShape, fontSize, radius, spacing } from '../theme';

type Props = {
  exercise: Exercise;
  onGuideVideoChange: (guideVideoId: string | undefined) => void;
};

export default function TimerScreen({ exercise, onGuideVideoChange }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const language = useLanguage();

  const { settings, updateSettings, voiceGuideEnabled, onVoiceGuideToggle, alarmVolumeMode } =
    useTimerSettings(exercise.id);
  const video = useVideoCapture({
    captureFailedTitle: t.timer.captureFailedTitle,
    captureFailedBody: t.timer.captureFailedBody,
    permissionFailedBody: t.timer.permissionFailedBody,
  });
  const result = useTimerResult(exercise.id);
  const timerAudio = useTimerAudio();

  const timer = useHangTimer({
    onCountdownSecond: (remainingSec) => {
      if (voiceGuideEnabled) speakCountdown(remainingSec, language);
    },
    onMeasureStart: () => {
      if (voiceGuideEnabled) speakStart(language, t.timer.speechStart);
    },
    onMeasureSecond: (second) => {
      if (second % settings.bellIntervalSeconds === 0) {
        timerAudio.playBellSound(undefined, alarmVolumeMode); // 음성 안내 토글과 무관하게 항상 울린다
      } else if (voiceGuideEnabled) {
        speakSecond(second, language);
      }
    },
  });

  const isMeasuring = timer.phase === 'countdown' || timer.phase === 'running';
  useKeepAwakeWhileActive(isMeasuring);
  useAudioFocusHolder(isMeasuring);
  const quote = useMotivationalQuote(timer.phase === 'running', t.quotes);

  const handleCancel = () => {
    tapLight();
    timer.cancel();
    timerAudio.stopAllSound();
  };

  const handleStop = () => {
    tapHeavy();
    const durationMs = timer.stop();
    timerAudio.stopAllSound();
    if (durationMs == null) return;
    result.save(durationMs, video.capturedVideo ?? undefined);
  };

  const handleRestart = () => {
    tapMedium();
    video.resetCapturedVideo();
    result.reset();
    timer.start(settings.countdownSeconds);
  };

  const handleGoMain = () => {
    video.resetCapturedVideo();
    result.reset();
    timer.reset();
  };

  const pending = result.pending;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: accent.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.phaseContent}>
        {timer.phase === 'idle' && (
          <>
            <Text style={[styles.title, { color: accent.text }]}>
              {t.timer.title(getExerciseDisplayName(exercise, t))}
            </Text>
            <View style={styles.videoButtons}>
              <GuideVideoPanel
                exerciseId={exercise.id}
                exerciseName={getExerciseDisplayName(exercise, t)}
                videoId={exercise.guideVideoId}
                onGuideVideoChange={onGuideVideoChange}
              />
              <CaptureVideoRow
                capturedUri={video.capturedVideo?.uri}
                busy={video.busy}
                onCapture={video.handleCapturePress}
                onViewCaptured={() => video.setViewingVideo(true)}
              />
            </View>
            <View style={[styles.settings, { backgroundColor: accent.card }]}>
              <NumberStepper
                label={t.timer.countdownLabel}
                value={settings.countdownSeconds}
                min={COUNTDOWN_MIN_SECONDS}
                max={COUNTDOWN_MAX_SECONDS}
                unit={t.units.seconds}
                editable
                onChange={(v) => updateSettings({ countdownSeconds: v })}
              />
              <NumberStepper
                label={t.timer.bellIntervalLabel}
                value={settings.bellIntervalSeconds}
                min={BELL_INTERVAL_MIN_SECONDS}
                max={BELL_INTERVAL_MAX_SECONDS}
                step={BELL_INTERVAL_STEP_SECONDS}
                unit={t.units.seconds}
                onChange={(v) => updateSettings({ bellIntervalSeconds: v })}
              />
              <View style={styles.voiceGuideRow}>
                <Text style={[styles.voiceGuideLabel, { color: accent.textMuted }]}>
                  {t.timer.voiceGuideLabel}
                </Text>
                <ColorSwitch
                  value={voiceGuideEnabled}
                  onValueChange={onVoiceGuideToggle}
                  color={accent.primary}
                />
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: accent.primary,
                  ...buttonShadowShape,
                  shadowColor: accent.primary,
                },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                tapMedium();
                timer.start(settings.countdownSeconds);
              }}
            >
              <Text style={[styles.buttonText, { color: accent.onPrimary }]}>
                {t.timer.startButton}
              </Text>
            </Pressable>
          </>
        )}

        {timer.phase === 'countdown' && (
          <>
            <Text style={[styles.label, { color: accent.textMuted }]}>
              {t.timer.preparingLabel}
            </Text>
            <Text style={[styles.countdown, { color: accent.primaryText }]}>
              {timer.countdownRemainingSec}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: accent.card },
                pressed && styles.pressed,
              ]}
              onPress={handleCancel}
            >
              <Text style={[styles.buttonText, { color: accent.text }]}>
                {t.timer.cancelButton}
              </Text>
            </Pressable>
          </>
        )}

        {timer.phase === 'running' && (
          <>
            <Text
              style={[styles.quote, { color: accent.accent, backgroundColor: accent.accentSoft }]}
            >
              {quote}
            </Text>
            <Text style={[styles.label, { color: accent.textMuted }]}>
              {t.timer.measuringLabel}
            </Text>
            <TimeDisplay ms={timer.elapsedMs} />
            <Pressable
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: accent.danger,
                  ...buttonShadowShape,
                  shadowColor: accent.danger,
                },
                pressed && styles.pressed,
              ]}
              onPress={handleStop}
            >
              <Text style={styles.buttonText}>{t.timer.stopButton}</Text>
            </Pressable>
          </>
        )}

        {timer.phase === 'finished' && pending && (
          <>
            <Text style={[styles.label, { color: accent.textMuted }]}>{t.timer.resultLabel}</Text>
            <TimeDisplay ms={pending.durationMs} />
            <View style={styles.adjustRow}>
              <Pressable
                style={[
                  styles.adjustButton,
                  { borderColor: accent.accent },
                  pending.durationMs < MIN_RECORD_MS && styles.adjustButtonDisabled,
                ]}
                onPress={() => result.adjust(-1000, video.capturedVideo ?? undefined)}
                disabled={pending.durationMs < MIN_RECORD_MS}
              >
                <Text style={[styles.adjustButtonText, { color: accent.accent }]}>
                  {t.timer.minusOneSecond}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.adjustButton, { borderColor: accent.accent }]}
                onPress={() => result.adjust(1000, video.capturedVideo ?? undefined)}
              >
                <Text style={[styles.adjustButtonText, { color: accent.accent }]}>
                  {t.timer.plusOneSecond}
                </Text>
              </Pressable>
            </View>
            {video.capturedVideo && (
              <CaptureVideoRow
                capturedUri={video.capturedVideo.uri}
                onViewCaptured={() => video.setViewingVideo(true)}
              />
            )}
            {pending.durationMs < MIN_RECORD_MS && (
              <Text style={[styles.notSaved, { color: accent.textFaint }]}>
                {t.timer.notSavedNotice}
              </Text>
            )}
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.buttonRowItem,
                  {
                    backgroundColor: accent.primary,
                    ...buttonShadowShape,
                    shadowColor: accent.primary,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={handleRestart}
              >
                <Text style={[styles.buttonText, { color: accent.onPrimary }]}>
                  {t.timer.restartButton}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonRowItem, { backgroundColor: accent.card }]}
                onPress={handleGoMain}
              >
                <Text style={[styles.buttonText, { color: accent.text }]}>
                  {t.timer.goMainButton}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <CameraPermissionModal
        state={video.permissionModal}
        onGrant={video.handleGrantPermission}
        onOpenSettings={video.handleOpenSettings}
        onClose={video.closePermissionModal}
      />
      <VideoPlayerModal
        uri={video.viewingVideo ? (video.capturedVideo?.uri ?? null) : null}
        onClose={() => video.setViewingVideo(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  container: {
    flex: 1,
    // KeyboardAvoidingView(behavior="padding")는 키보드가 없을 때도 paddingBottom을 0으로
    // 덮어쓴다 — 단축 속성 padding을 쓰면 하단 여백이 사라지므로 위/양옆만 여기서 주고,
    // 하단 여백은 그 영향을 안 받는 안쪽 phaseContent에 둔다.
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  phaseContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  videoButtons: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  settings: {
    alignSelf: 'stretch',
    gap: spacing.md,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  voiceGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceGuideLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  notSaved: {
    fontSize: fontSize.sm,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  adjustButton: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonDisabled: {
    opacity: 0.4,
  },
  adjustButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  quote: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smd,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  countdown: {
    fontSize: fontSize.countdown,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  button: {
    minWidth: 180,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF', // 정지 버튼(고정 danger 배경)의 기본값 — 다시 시작 버튼은 accent.onPrimary로 덮어씀
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.smd,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md - 8,
  },
  buttonRowItem: {
    flex: 1,
    minWidth: 0,
  },
});
