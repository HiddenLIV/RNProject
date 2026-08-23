import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export type RestPhase = 'idle' | 'resting';

// 초 단위 표시만 하면 되므로 useHangTimer(0.01초 표시, 33ms tick)보다 성기게 돈다.
const TICK_MS = 250;

// 화면을 보고 있는 정상 흐름이면 tick이 TICK_MS 간격으로 정확히 0 근처에서 걸린다 — 이보다
// 훨씬 늦게 걸렸다면(백그라운드에서 타이머가 멈췄다 몰아서 처리되는 경우) 뒤늦은 알림음 없이
// 조용히 끝낸다. AppState 리스너와 어느 쪽이 먼저 발동하든 이 판단만으로 결과가 같아지므로
// 두 콜백 사이의 순서에 의존하지 않는다.
// 포그라운드에서도 저장·리렌더·광고 로드 등으로 JS 스레드가 잠깐 멎을 수 있어(최대 수 초),
// 넉넉히 잡아 정상 종료를 무음으로 삼키는 오탐을 피한다 — 실제 백그라운드 case는 훨씬 더
// 늦게(수십 초 이상) 걸리므로 요구사항 13(뒤늦은 알림 금지)은 이 여유값으로도 그대로 지켜진다.
const OVERDUE_SILENT_THRESHOLD_MS = TICK_MS * 10;

export function useRestTimer(onFinish: () => void) {
  const [phase, setPhase] = useState<RestPhase>('idle');
  const [remainingSec, setRemainingSec] = useState(0);

  // 콜백은 ref로 최신값을 참조해 stale closure를 피한다 — 렌더 중 직접 대입하면
  // react-hooks/refs 규칙에 걸리므로 effect에서 동기화한다.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const phaseRef = useRef<RestPhase>('idle');
  const endsAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // silent=true: 화면을 보고 있지 않은 사이(백그라운드) 이미 끝나 있었던 경우 — 소리/진동 없이
  // 조용히 idle로 돌아간다. silent=false: 화면을 보는 중 정상적으로 0에 도달 — 벨+진동을 울린다.
  // tick과 AppState 리스너 양쪽에서 부를 수 있어, 이미 끝난 뒤의 중복 호출은 여기서 막는다.
  const finish = useCallback(
    (silent: boolean) => {
      if (phaseRef.current !== 'resting') return;
      clearTick();
      phaseRef.current = 'idle';
      setPhase('idle');
      setRemainingSec(0);
      if (!silent) onFinishRef.current();
    },
    [clearTick],
  );

  const tick = useCallback(() => {
    const remainMs = endsAtRef.current - Date.now();
    if (remainMs <= 0) {
      finish(-remainMs > OVERDUE_SILENT_THRESHOLD_MS);
      return;
    }
    setRemainingSec(Math.ceil(remainMs / 1000));
  }, [finish]);

  const start = useCallback(
    (durationSec: number) => {
      // durationSec은 손상된 백업 파일 등 외부 값에서 올 수 있다 — NaN/음수가 그대로 들어가면
      // remainMs가 NaN이 되어 "remainMs <= 0"이 항상 false로 평가돼 영원히 안 끝나는 배너로
      // 남는다. 유효하지 않으면 안전한 기본값(60초)으로 대체한다.
      const safeDurationSec = Number.isFinite(durationSec)
        ? Math.max(1, Math.min(3600, durationSec))
        : 60;
      endsAtRef.current = Date.now() + safeDurationSec * 1000;
      phaseRef.current = 'resting';
      setPhase('resting');
      setRemainingSec(safeDurationSec);
      clearTick();
      intervalRef.current = setInterval(tick, TICK_MS);
    },
    [clearTick, tick],
  );

  // 사용자가 직접 끝냄 — 뒤늦은 알림과 같은 이유로 벨/진동은 울리지 않는다.
  // (이미 끝난 뒤의 호출은 finish() 안에서 무시된다)
  const skip = useCallback(() => finish(true), [finish]);

  // 백그라운드에서 돌아왔을 때 이미 휴식이 끝나 있었는지 여기서 직접 확인한다.
  // JS 타이머는 백그라운드 중 사실상 멈춰 있다가 포그라운드 복귀 시 몰아서 한 번 발생하므로,
  // 그 첫 tick이 뒤늦게 벨을 울리게 두지 않고 AppState 전환 시점에 먼저 조용히 종료시킨다.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && phaseRef.current === 'resting' && endsAtRef.current <= Date.now()) {
        finish(true);
      }
    });
    return () => sub.remove();
  }, [finish]);

  useEffect(() => clearTick, [clearTick]);

  return { phase, remainingSec, start, skip };
}
