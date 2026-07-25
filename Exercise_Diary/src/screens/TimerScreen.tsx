import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import NumberStepper from '../components/NumberStepper';
import TimeDisplay from '../components/TimeDisplay';
import { speakCountdown, speakSecond, speakStart, stopFeedback } from '../lib/feedback';
import { QUOTES } from '../lib/quotes';
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
} from '../lib/types';
import { useHangTimer } from '../lib/useHangTimer';
import { buttonShadow, colors, fontSize, radius, spacing } from '../theme';

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
};

export default function TimerScreen({ exercise }: Props) {
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
    onCountdownSecond: speakCountdown,
    onMeasureStart: speakStart,
    onMeasureSecond: (second) => {
      if (second % settings.bellIntervalSeconds === 0) {
        playBellSound();
      } else {
        speakSecond(second);
      }
    },
  });

  // 측정 중 3초마다 동기부여 문구를 랜덤 교체 (직전 문구는 반복하지 않음)
  const [quote, setQuote] = useState('');
  useEffect(() => {
    if (timer.phase !== 'running') return;
    const pickNext = (prev: string) => {
      if (QUOTES.length < 2) return QUOTES[0] ?? '';
      let next = prev;
      while (next === prev) {
        next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
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
      addRecord(exercise.id, { id, measuredAt, durationMs });
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
        addRecord(exercise.id, { id, measuredAt: pending.measuredAt, durationMs });
        setPending({ ...pending, id, durationMs });
      }
    } else {
      if (pending.id) removeRecord(exercise.id, pending.id);
      setPending({ ...pending, id: null, durationMs });
    }
  };

  const handleRestart = () => {
    timer.start(settings.countdownSeconds);
  };

  const handleGoMain = () => {
    timer.reset();
  };

  return (
    <View style={styles.container}>
      {timer.phase === 'idle' && (
        <>
          <Text style={styles.title}>{exercise.name} 타이머</Text>
          <View style={styles.settings}>
            <NumberStepper
              label="준비 카운트다운"
              value={settings.countdownSeconds}
              min={COUNTDOWN_MIN_SECONDS}
              max={COUNTDOWN_MAX_SECONDS}
              editable
              onChange={(v) => updateSettings({ countdownSeconds: v })}
            />
            <NumberStepper
              label="벨 간격"
              value={settings.bellIntervalSeconds}
              min={BELL_INTERVAL_MIN_SECONDS}
              max={BELL_INTERVAL_MAX_SECONDS}
              step={BELL_INTERVAL_STEP_SECONDS}
              onChange={(v) => updateSettings({ bellIntervalSeconds: v })}
            />
          </View>
          <Pressable style={[styles.button, styles.buttonPrimary]} onPress={() => timer.start(settings.countdownSeconds)}>
            <Text style={styles.buttonText}>시작</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'countdown' && (
        <>
          <Text style={styles.label}>준비</Text>
          <Text style={styles.countdown}>{timer.countdownRemainingSec}</Text>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleCancel}>
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>취소</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'running' && (
        <>
          <Text style={styles.quote}>{quote}</Text>
          <Text style={styles.label}>측정 중</Text>
          <TimeDisplay ms={timer.elapsedMs} />
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleStop}>
            <Text style={styles.buttonText}>정지</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'finished' && pending && (
        <>
          <Text style={styles.label}>결과</Text>
          <TimeDisplay ms={pending.durationMs} />
          <View style={styles.adjustRow}>
            <Pressable
              style={[styles.adjustButton, pending.durationMs < MIN_RECORD_MS && styles.adjustButtonDisabled]}
              onPress={() => adjustPending(-1000)}
              disabled={pending.durationMs < MIN_RECORD_MS}
            >
              <Text style={styles.adjustButtonText}>−1초</Text>
            </Pressable>
            <Pressable style={styles.adjustButton} onPress={() => adjustPending(1000)}>
              <Text style={styles.adjustButtonText}>+1초</Text>
            </Pressable>
          </View>
          {pending.durationMs < MIN_RECORD_MS && (
            <Text style={styles.notSaved}>1초 미만이라 기록되지 않았습니다</Text>
          )}
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.buttonPrimary, styles.buttonRowItem]} onPress={handleRestart}>
              <Text style={styles.buttonText}>다시 시작</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonSecondary, styles.buttonRowItem]} onPress={handleGoMain}>
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>메인으로</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  settings: {
    alignSelf: 'stretch',
    gap: spacing.md,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textMuted,
  },
  notSaved: {
    fontSize: fontSize.sm,
    color: colors.textFaint,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  adjustButton: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonDisabled: {
    opacity: 0.4,
  },
  adjustButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.primary,
  },
  quote: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.smd,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  countdown: {
    fontSize: fontSize.countdown,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: colors.primary,
  },
  button: {
    minWidth: 180,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    ...buttonShadow,
  },
  buttonSecondary: {
    backgroundColor: colors.card,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
    ...buttonShadow,
    shadowColor: colors.danger,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    color: colors.text,
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
