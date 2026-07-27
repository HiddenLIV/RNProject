import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import CameraPermissionModal from '../components/CameraPermissionModal';
import CaptureVideoRow from '../components/CaptureVideoRow';
import GuideVideoPanel from '../components/GuideVideoPanel';
import NumberStepper from '../components/NumberStepper';
import TimeDisplay from '../components/TimeDisplay';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { speakCountdown, speakSecond, speakStart, stopFeedback } from '../lib/feedback';
import { useLanguage, useTranslation } from '../lib/i18n';
import { addRecord, createId, getSettings, removeRecord, saveSettings, updateRecord } from '../lib/storage';
import {
  BELL_INTERVAL_MAX_SECONDS,
  BELL_INTERVAL_MIN_SECONDS,
  BELL_INTERVAL_STEP_SECONDS,
  COUNTDOWN_MAX_SECONDS,
  COUNTDOWN_MIN_SECONDS,
  DEFAULT_SETTINGS,
  Exercise,
  Settings,
  VideoRef,
} from '../lib/types';
import { getExerciseDisplayName } from '../lib/exercisePresets';
import { useAccentColors } from '../lib/ThemeContext';
import { useHangTimer } from '../lib/useHangTimer';
import { captureExerciseVideo, getVideoPermissionState, PermissionState, requestVideoPermissions } from '../lib/video';
import { buttonShadowShape, fontSize, radius, spacing } from '../theme';

// 1초 미만 정지는 오조작으로 보고 기록하지 않는다
const MIN_RECORD_MS = 1000;

type PendingResult = {
  // 1초 이상이 되어 실제로 저장된 적이 있으면 그 기록의 id, 아직 저장 대상이 아니면 null
  id: string | null;
  durationMs: number;
  measuredAt: string; // 정지 시각(ISO) — 보정 중 시간이 흘러도 측정 일시는 그대로 유지
};

type Props = {
  exercise: Exercise;
  onGuideVideoChange: (guideVideoId: string | undefined) => void;
};

export default function TimerScreen({ exercise, onGuideVideoChange }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const language = useLanguage();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings(exercise.id).then(setSettings);
  }, [exercise.id]);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(exercise.id, next);
      return next;
    });
  };

  // 공유 플레이어를 pause/seek로 재사용하면 안드로이드(삼성)에서 첫 재생의
  // AudioTrack이 열리지 않아 무음이 되는 문제가 있다(logcat으로 확인).
  // 벨마다 새 플레이어를 만들어 재생하고 이전 것은 해제한다.
  const bellRef = useRef<AudioPlayer | null>(null);

  const releaseBell = () => {
    bellRef.current?.release();
    bellRef.current = null;
  };

  const playBellSound = () => {
    releaseBell();
    const player = createAudioPlayer(require('../../assets/sounds/bell.wav'));
    bellRef.current = player;
    player.play();
  };

  // 화면 이탈(홈·기록 탭 이동) 시 진행 중이던 음성·벨을 즉시 중단한다
  useEffect(
    () => () => {
      stopFeedback();
      releaseBell();
    },
    []
  );

  const timer = useHangTimer({
    onCountdownSecond: (remainingSec) => speakCountdown(remainingSec, language),
    onMeasureStart: () => speakStart(language, t.timer.speechStart),
    onMeasureSecond: (second) => {
      if (second % settings.bellIntervalSeconds === 0) {
        playBellSound();
      } else {
        speakSecond(second, language);
      }
    },
  });

  // 측정 중 3초마다 동기부여 문구를 랜덤 교체 (직전 문구는 반복하지 않음)
  const [quote, setQuote] = useState('');
  useEffect(() => {
    if (timer.phase !== 'running') return;
    const quotes = t.quotes;
    const pickNext = (prev: string) => {
      if (quotes.length < 2) return quotes[0] ?? '';
      let next = prev;
      while (next === prev) {
        next = quotes[Math.floor(Math.random() * quotes.length)];
      }
      return next;
    };
    setQuote((prev) => pickNext(prev));
    const id = setInterval(() => setQuote((prev) => pickNext(prev)), 3000);
    return () => clearInterval(id);
  }, [timer.phase]);

  // 측정·카운트다운 중 화면이 자동 잠금되면 JS 타이머가 멈춰 음성·벨이 끊기므로 화면을 깨워 둔다
  const isMeasuring = timer.phase === 'countdown' || timer.phase === 'running';
  useEffect(() => {
    if (!isMeasuring) return;
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, [isMeasuring]);

  // 측정 중 무음 루프를 재생해 오디오 포커스를 계속 점유한다 —
  // doNotMix 모드와 함께 다른 앱의 음악·영상이 측정 시작 시 일시정지되고 측정 내내 재개되지 않는다
  useEffect(() => {
    if (!isMeasuring) return;
    const holder = createAudioPlayer(require('../../assets/sounds/silence.wav'));
    holder.loop = true;
    holder.play();
    return () => {
      holder.release();
    };
  }, [isMeasuring]);

  const stopAllSound = () => {
    stopFeedback();
    releaseBell();
  };

  const handleCancel = () => {
    timer.cancel();
    stopAllSound();
  };

  // 촬영한 영상 참조 — 이번 세션(다시 시작·메인으로 나가기 전까지) 동안 유효하다.
  // 촬영은 idle 단계에서만 가능하므로(측정 시작 전에만 촬영 버튼이 보임), 정지 시점
  // (handleStop)에 기록을 만들 때 이 값을 함께 실어 저장한다.
  const [capturedVideo, setCapturedVideo] = useState<VideoRef | null>(null);
  const [viewingVideo, setViewingVideo] = useState(false);
  const [permissionModal, setPermissionModal] = useState<PermissionState | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);

  const runCapture = async () => {
    try {
      const result = await captureExerciseVideo();
      if (result.status !== 'saved') return;
      setCapturedVideo(result.ref);
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
      // runCapture가 실행됐다면 이미 false로 되돌려놨겠지만, 권한 확인 자체가
      // 실패한 경우를 대비해 여기서도 항상 풀어준다.
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

  // 1초 이상이 되는 순간 즉시 저장하고, 이후 보정(±1초)마다 그 기록을 계속 갱신한다 —
  // 메모리에만 있는 "아직 저장 안 된" 구간을 최소화해 앱이 백그라운드에서 종료돼도
  // 직전까지 보정한 값이 이미 기기에 남아있게 한다.
  const [pending, setPending] = useState<PendingResult | null>(null);

  const handleStop = () => {
    const durationMs = timer.stop();
    stopAllSound();
    if (durationMs == null) return;
    const measuredAt = new Date().toISOString();
    if (durationMs >= MIN_RECORD_MS) {
      const id = createId();
      addRecord(exercise.id, { id, measuredAt, durationMs, videoRef: capturedVideo ?? undefined });
      setPending({ id, durationMs, measuredAt });
    } else {
      setPending({ id: null, durationMs, measuredAt });
    }
  };

  const adjustPending = (deltaMs: number) => {
    if (!pending) return;
    const durationMs = Math.max(0, pending.durationMs + deltaMs);
    if (durationMs >= MIN_RECORD_MS) {
      if (pending.id) {
        updateRecord(exercise.id, pending.id, { durationMs });
        setPending({ ...pending, durationMs });
      } else {
        const id = createId();
        addRecord(exercise.id, { id, measuredAt: pending.measuredAt, durationMs, videoRef: capturedVideo ?? undefined });
        setPending({ ...pending, id, durationMs });
      }
    } else {
      if (pending.id) removeRecord(exercise.id, pending.id);
      setPending({ ...pending, id: null, durationMs });
    }
  };

  const handleRestart = () => {
    setCapturedVideo(null);
    setPending(null);
    timer.start(settings.countdownSeconds);
  };

  const handleGoMain = () => {
    setCapturedVideo(null);
    setPending(null);
    timer.reset();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: accent.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.phaseContent}>
      {timer.phase === 'idle' && (
        <>
          <Text style={[styles.title, { color: accent.text }]}>{t.timer.title(getExerciseDisplayName(exercise, t))}</Text>
          <View style={styles.videoButtons}>
            <GuideVideoPanel
              exerciseId={exercise.id}
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
          </View>
          <Pressable
            style={[styles.button, { backgroundColor: accent.primary, ...buttonShadowShape, shadowColor: accent.primary }]}
            onPress={() => timer.start(settings.countdownSeconds)}
          >
            <Text style={[styles.buttonText, { color: accent.onPrimary }]}>{t.timer.startButton}</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'countdown' && (
        <>
          <Text style={[styles.label, { color: accent.textMuted }]}>{t.timer.preparingLabel}</Text>
          <Text style={[styles.countdown, { color: accent.primaryText }]}>{timer.countdownRemainingSec}</Text>
          <Pressable style={[styles.button, { backgroundColor: accent.card }]} onPress={handleCancel}>
            <Text style={[styles.buttonText, { color: accent.text }]}>{t.timer.cancelButton}</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'running' && (
        <>
          <Text style={[styles.quote, { color: accent.accent, backgroundColor: accent.accentSoft }]}>{quote}</Text>
          <Text style={[styles.label, { color: accent.textMuted }]}>{t.timer.measuringLabel}</Text>
          <TimeDisplay ms={timer.elapsedMs} />
          <Pressable
            style={[styles.button, { backgroundColor: accent.danger, ...buttonShadowShape, shadowColor: accent.danger }]}
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
                { backgroundColor: accent.primarySoft },
                pending.durationMs < MIN_RECORD_MS && styles.adjustButtonDisabled,
              ]}
              onPress={() => adjustPending(-1000)}
              disabled={pending.durationMs < MIN_RECORD_MS}
            >
              <Text style={[styles.adjustButtonText, { color: accent.accent }]}>{t.timer.minusOneSecond}</Text>
            </Pressable>
            <Pressable style={[styles.adjustButton, { backgroundColor: accent.primarySoft }]} onPress={() => adjustPending(1000)}>
              <Text style={[styles.adjustButtonText, { color: accent.accent }]}>{t.timer.plusOneSecond}</Text>
            </Pressable>
          </View>
          {capturedVideo && (
            <CaptureVideoRow capturedAssetId={capturedVideo.assetId} onViewCaptured={() => setViewingVideo(true)} />
          )}
          {pending.durationMs < MIN_RECORD_MS && (
            <Text style={[styles.notSaved, { color: accent.textFaint }]}>{t.timer.notSavedNotice}</Text>
          )}
          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.button,
                styles.buttonRowItem,
                { backgroundColor: accent.primary, ...buttonShadowShape, shadowColor: accent.primary },
              ]}
              onPress={handleRestart}
            >
              <Text style={[styles.buttonText, { color: accent.onPrimary }]}>{t.timer.restartButton}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonRowItem, { backgroundColor: accent.card }]}
              onPress={handleGoMain}
            >
              <Text style={[styles.buttonText, { color: accent.text }]}>{t.timer.goMainButton}</Text>
            </Pressable>
          </View>
        </>
      )}
      </View>

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
