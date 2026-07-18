export type HangRecord = {
  id: string;
  measuredAt: string;
  durationMs: number;
};

export type Settings = {
  countdownSeconds: number;
  bellIntervalSeconds: number;
};

export const DEFAULT_SETTINGS: Settings = {
  countdownSeconds: 5,
  bellIntervalSeconds: 10,
};

export const COUNTDOWN_MIN_SECONDS = 3;
export const COUNTDOWN_MAX_SECONDS = 30;

export const BELL_INTERVAL_STEP_SECONDS = 10;
export const BELL_INTERVAL_MIN_SECONDS = 10;
export const BELL_INTERVAL_MAX_SECONDS = 120;
