import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SecondsStepper from '../components/SecondsStepper';
import TimeDisplay from '../components/TimeDisplay';
import { speakCountdown, speakSecond, speakStart, stopFeedback } from '../lib/feedback';
import { QUOTES } from '../lib/quotes';
import { addRecord, createRecordId, getSettings, saveSettings } from '../lib/storage';
import {
  BELL_INTERVAL_MAX_SECONDS,
  BELL_INTERVAL_MIN_SECONDS,
  BELL_INTERVAL_STEP_SECONDS,
  COUNTDOWN_MAX_SECONDS,
  COUNTDOWN_MIN_SECONDS,
  DEFAULT_SETTINGS,
  Settings,
} from '../lib/types';
import { useHangTimer } from '../lib/useHangTimer';

// 1초 미만 정지는 오조작으로 보고 기록하지 않는다
const MIN_RECORD_MS = 1000;

export default function TimerScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
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

  useEffect(() => releaseBell, []);

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

  const stopAllSound = () => {
    stopFeedback();
    releaseBell();
  };

  const handleCancel = () => {
    timer.cancel();
    stopAllSound();
  };

  const handleStop = () => {
    const durationMs = timer.stop();
    stopAllSound();
    if (durationMs != null && durationMs >= MIN_RECORD_MS) {
      addRecord({
        id: createRecordId(),
        measuredAt: new Date().toISOString(),
        durationMs,
      });
    }
  };

  return (
    <View style={styles.container}>
      {timer.phase === 'idle' && (
        <>
          <Text style={styles.title}>매달리기 타이머</Text>
          <View style={styles.settings}>
            <SecondsStepper
              label="준비 카운트다운"
              value={settings.countdownSeconds}
              min={COUNTDOWN_MIN_SECONDS}
              max={COUNTDOWN_MAX_SECONDS}
              editable
              onChange={(v) => updateSettings({ countdownSeconds: v })}
            />
            <SecondsStepper
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
          <Text style={styles.label}>측정 중</Text>
          <TimeDisplay ms={timer.elapsedMs} />
          <Text style={styles.quote}>{quote}</Text>
          <Pressable style={[styles.button, styles.buttonDanger]} onPress={handleStop}>
            <Text style={styles.buttonText}>정지</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'finished' && (
        <>
          <Text style={styles.label}>결과</Text>
          <TimeDisplay ms={timer.elapsedMs} />
          {timer.elapsedMs < MIN_RECORD_MS && (
            <Text style={styles.notSaved}>1초 미만이라 기록되지 않았습니다</Text>
          )}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.buttonPrimary, styles.buttonRowItem]}
              onPress={() => timer.start(settings.countdownSeconds)}
            >
              <Text style={styles.buttonText}>다시 시작</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonSecondary, styles.buttonRowItem]} onPress={timer.reset}>
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
    gap: 24,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111',
  },
  settings: {
    alignSelf: 'stretch',
    gap: 16,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 20,
    color: '#666',
  },
  notSaved: {
    fontSize: 14,
    color: '#9ca3af',
  },
  quote: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  countdown: {
    fontSize: 96,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#111',
  },
  button: {
    minWidth: 180,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
  },
  buttonDanger: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#374151',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
    paddingHorizontal: 8,
  },
  buttonRowItem: {
    flex: 1,
    minWidth: 0,
  },
});
