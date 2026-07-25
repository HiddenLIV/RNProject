import { useCallback, useEffect, useRef, useState } from 'react';

export type TimerPhase = 'idle' | 'countdown' | 'running' | 'finished';

export type HangTimerOptions = {
  onCountdownSecond?: (remainingSec: number) => void;
  onMeasureStart?: () => void;
  onMeasureSecond?: (second: number) => void;
};

// 0.01초 단위 표시가 부드럽게 갱신되도록 약 30fps로 tick
const TICK_MS = 33;

export function useHangTimer(options: HangTimerOptions) {
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownRemainingSec, setCountdownRemainingSec] = useState(0);

  // 콜백은 ref로 최신값을 참조해 stale closure를 피한다
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<TimerPhase>('idle');
  const countdownEndsAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const lastCountdownAnnouncedRef = useRef(0);
  const lastSecondAnnouncedRef = useRef(0);

  const clearTick = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();

    if (phaseRef.current === 'countdown') {
      const remainMs = countdownEndsAtRef.current - now;
      if (remainMs <= 0) {
        // 측정 시작 시각은 카운트다운 종료 시각 — tick 지연과 무관하게 0초부터 정확히 시작
        startedAtRef.current = countdownEndsAtRef.current;
        lastSecondAnnouncedRef.current = 0;
        phaseRef.current = 'running';
        setPhase('running');
        setElapsedMs(now - startedAtRef.current);
        optionsRef.current.onMeasureStart?.();
        return;
      }
      const remainSec = Math.ceil(remainMs / 1000);
      setCountdownRemainingSec(remainSec);
      if (remainSec < lastCountdownAnnouncedRef.current) {
        lastCountdownAnnouncedRef.current = remainSec;
        optionsRef.current.onCountdownSecond?.(remainSec);
      }
      return;
    }

    if (phaseRef.current === 'running') {
      const elapsed = now - startedAtRef.current;
      setElapsedMs(elapsed);
      const second = Math.floor(elapsed / 1000);
      if (second > lastSecondAnnouncedRef.current) {
        // 백그라운드 복귀로 여러 초를 건너뛴 경우 최신 초 하나만 알린다
        lastSecondAnnouncedRef.current = second;
        if (second > 0) optionsRef.current.onMeasureSecond?.(second);
      }
    }
  }, []);

  const start = useCallback(
    (countdownSeconds: number) => {
      if (phaseRef.current === 'countdown' || phaseRef.current === 'running') return;
      countdownEndsAtRef.current = Date.now() + countdownSeconds * 1000;
      lastCountdownAnnouncedRef.current = countdownSeconds;
      phaseRef.current = 'countdown';
      setPhase('countdown');
      setElapsedMs(0);
      setCountdownRemainingSec(countdownSeconds);
      optionsRef.current.onCountdownSecond?.(countdownSeconds);
      clearTick();
      intervalRef.current = setInterval(tick, TICK_MS);
    },
    [clearTick, tick]
  );

  const cancel = useCallback(() => {
    if (phaseRef.current !== 'countdown') return;
    clearTick();
    phaseRef.current = 'idle';
    setPhase('idle');
    setElapsedMs(0);
  }, [clearTick]);

  const stop = useCallback((): number | null => {
    if (phaseRef.current !== 'running') return null;
    const durationMs = Date.now() - startedAtRef.current;
    clearTick();
    phaseRef.current = 'finished';
    setPhase('finished');
    setElapsedMs(durationMs);
    return durationMs;
  }, [clearTick]);

  const reset = useCallback(() => {
    if (phaseRef.current !== 'finished') return;
    phaseRef.current = 'idle';
    setPhase('idle');
    setElapsedMs(0);
  }, []);

  useEffect(() => clearTick, [clearTick]);

  return { phase, elapsedMs, countdownRemainingSec, start, cancel, stop, reset };
}
