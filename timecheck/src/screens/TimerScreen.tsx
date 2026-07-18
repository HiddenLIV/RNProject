import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SecondsStepper from '../components/SecondsStepper';
import TimeDisplay from '../components/TimeDisplay';
import { speakCountdown, speakSecond, speakStart, stopFeedback } from '../lib/feedback';
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

  const bellPlayer = useAudioPlayer(require('../../assets/sounds/bell.wav'));

  const playBellSound = async () => {
    await bellPlayer.seekTo(0);
    bellPlayer.play();
  };

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

  const stopAllSound = () => {
    stopFeedback();
    bellPlayer.pause();
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
          <Pressable style={styles.startButton} onPress={() => timer.start(settings.countdownSeconds)}>
            <Text style={styles.startButtonText}>시작</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'countdown' && (
        <>
          <Text style={styles.label}>준비</Text>
          <Text style={styles.countdown}>{timer.countdownRemainingSec}</Text>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </Pressable>
        </>
      )}

      {timer.phase === 'running' && (
        <>
          <Text style={styles.label}>측정 중</Text>
          <TimeDisplay ms={timer.elapsedMs} />
          <Pressable style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopButtonText}>정지</Text>
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
          <Pressable style={styles.startButton} onPress={timer.reset}>
            <Text style={styles.startButtonText}>확인</Text>
          </Pressable>
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
  countdown: {
    fontSize: 96,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#111',
  },
  startButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 999,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 999,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 20,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 64,
    paddingVertical: 20,
    borderRadius: 999,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
});
