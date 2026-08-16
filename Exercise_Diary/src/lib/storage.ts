import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BackupPayload,
  COLOR_SCHEME_OVERRIDE_VALUES,
  ColorSchemeOverride,
  DEFAULT_SETTINGS,
  Exercise,
  RepsRecord,
  Settings,
  THEME_PRESET_IDS,
  ThemePresetId,
  TimeRecord,
} from './types';

const EXERCISES_KEY = 'timecheck:exercises:v1';
const THEME_KEY = 'timecheck:theme:v1';
const VOICE_GUIDE_KEY = 'timecheck:voiceGuide:v1';
const COLOR_SCHEME_OVERRIDE_KEY = 'timecheck:colorSchemeOverride:v1';

// id: 'hang'인 운동은 앱의 기존(최초) 데이터가 쓰던 고정 키를 그대로 쓴다 —
// 그 덕분에 이번 기능을 위한 별도 마이그레이션이 필요 없다.
const recordsKey = (exerciseId: string) =>
  exerciseId === 'hang' ? 'timecheck:records:v1' : `timecheck:records:${exerciseId}:v1`;
const settingsKey = (exerciseId: string) =>
  exerciseId === 'hang' ? 'timecheck:settings:v1' : `timecheck:settings:${exerciseId}:v1`;
const repsKey = (exerciseId: string) => `timecheck:reps:${exerciseId}:v1`;

// addRecord/removeRecord/updateRecord/운동목록 쓰기는 모두 read→setItem read-modify-write라
// 겹쳐 호출되면 나중에 끝난 쪽이 앞선 변경을 덮어써 데이터가 유실될 수 있다.
// 같은 큐에 태워 항상 순서대로(직전 쓰기가 끝난 뒤에) 실행되게 직렬화한다.
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => {});
  return result;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getExercises(): Promise<Exercise[]> {
  const raw = await readJson<Exercise[]>(EXERCISES_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

export function addExercise(exercise: Exercise): Promise<void> {
  return enqueueWrite(async () => {
    const exercises = await getExercises();
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify([...exercises, exercise]));
  });
}

export function updateExercise(id: string, patch: Partial<Exercise>): Promise<Exercise[]> {
  return enqueueWrite(async () => {
    const exercises = await getExercises();
    const next = exercises.map((e) => (e.id === id ? { ...e, ...patch } : e));
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(next));
    return next;
  });
}

export function removeExercise(id: string): Promise<Exercise[]> {
  return enqueueWrite(async () => {
    const exercises = await getExercises();
    const next = exercises.filter((e) => e.id !== id);
    await AsyncStorage.setItem(EXERCISES_KEY, JSON.stringify(next));
    await AsyncStorage.multiRemove([recordsKey(id), settingsKey(id), repsKey(id)]);
    return next;
  });
}

export async function getRecords(exerciseId: string): Promise<TimeRecord[]> {
  const parsed = await readJson<TimeRecord[]>(recordsKey(exerciseId), []);
  return Array.isArray(parsed) ? parsed : [];
}

export function addRecord(exerciseId: string, record: TimeRecord): Promise<void> {
  return enqueueWrite(async () => {
    const records = await getRecords(exerciseId);
    await AsyncStorage.setItem(recordsKey(exerciseId), JSON.stringify([record, ...records]));
  });
}

export function removeRecord(exerciseId: string, id: string): Promise<TimeRecord[]> {
  return enqueueWrite(async () => {
    const records = await getRecords(exerciseId);
    const next = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(recordsKey(exerciseId), JSON.stringify(next));
    return next;
  });
}

export function updateRecord(exerciseId: string, id: string, patch: Partial<TimeRecord>): Promise<TimeRecord[]> {
  return enqueueWrite(async () => {
    const records = await getRecords(exerciseId);
    const next = records.map((r) => (r.id === id ? { ...r, ...patch } : r));
    await AsyncStorage.setItem(recordsKey(exerciseId), JSON.stringify(next));
    return next;
  });
}

export async function getRepsRecords(exerciseId: string): Promise<RepsRecord[]> {
  const parsed = await readJson<RepsRecord[]>(repsKey(exerciseId), []);
  return Array.isArray(parsed) ? parsed : [];
}

export function addRepsRecord(exerciseId: string, record: RepsRecord): Promise<void> {
  return enqueueWrite(async () => {
    const records = await getRepsRecords(exerciseId);
    await AsyncStorage.setItem(repsKey(exerciseId), JSON.stringify([record, ...records]));
  });
}

export function removeRepsRecord(exerciseId: string, id: string): Promise<RepsRecord[]> {
  return enqueueWrite(async () => {
    const records = await getRepsRecords(exerciseId);
    const next = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(repsKey(exerciseId), JSON.stringify(next));
    return next;
  });
}

export async function getSettings(exerciseId: string): Promise<Settings> {
  const raw = await readJson<Partial<Settings>>(settingsKey(exerciseId), {});
  return { ...DEFAULT_SETTINGS, ...raw };
}

export async function saveSettings(exerciseId: string, settings: Settings): Promise<void> {
  await AsyncStorage.setItem(settingsKey(exerciseId), JSON.stringify(settings));
}

// 백업 파일로 전체 교체(복원) — 새 내용을 먼저 쓰고, 그 다음에 더 이상 쓰이지 않는 옛 운동의
// 키만 지운다. 이 순서 덕분에 multiSet 도중 실패해도(예: 저장공간 부족) 기존 데이터가 먼저
// 지워져 있지 않아 부분 유실 없이 이전 상태 그대로 남는다. 다른 read-modify-write와 같은 큐에
// 태워, 복원 도중 다른 저장 작업과 뒤섞이지 않게 한다.
export function restoreFromBackup(payload: BackupPayload): Promise<void> {
  return enqueueWrite(async () => {
    const current = await getExercises();
    const nextIds = new Set(payload.exercises.map((e) => e.id));
    // 백업에도 그대로 남아있는 운동의 키는 multiSet이 어차피 덮어쓰므로 건드리지 않는다 —
    // 새 백업에서 아예 빠진(삭제된) 운동의 옛 키만 정리 대상이다.
    const staleKeys = current
      .filter((e) => !nextIds.has(e.id))
      .flatMap((e) => [recordsKey(e.id), settingsKey(e.id), repsKey(e.id)]);

    const theme = THEME_PRESET_IDS.includes(payload.theme) ? payload.theme : 'default';
    // 이번 기능 이전 형식의 백업 파일엔 이 필드가 아예 없을 수 있다 — 그런 경우 'system'으로 처리한다.
    const colorSchemeOverride =
      payload.colorSchemeOverride && COLOR_SCHEME_OVERRIDE_VALUES.includes(payload.colorSchemeOverride)
        ? payload.colorSchemeOverride
        : 'system';
    const entries: [string, string][] = [
      [EXERCISES_KEY, JSON.stringify(payload.exercises)],
      [THEME_KEY, JSON.stringify(theme)],
      [COLOR_SCHEME_OVERRIDE_KEY, JSON.stringify(colorSchemeOverride)],
    ];
    for (const exercise of payload.exercises) {
      const data = payload.exerciseData[exercise.id];
      if (!data) continue;
      entries.push([recordsKey(exercise.id), JSON.stringify(data.records)]);
      entries.push([repsKey(exercise.id), JSON.stringify(data.repsRecords)]);
      entries.push([settingsKey(exercise.id), JSON.stringify(data.settings)]);
    }
    await AsyncStorage.multiSet(entries);
    if (staleKeys.length) await AsyncStorage.multiRemove(staleKeys);
  });
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getThemePreset(): Promise<ThemePresetId> {
  const raw = await readJson<ThemePresetId | null>(THEME_KEY, null);
  return raw && THEME_PRESET_IDS.includes(raw) ? raw : 'default';
}

// 다른 값과 합쳐 쓰는 read-modify-write가 아니라 단순 덮어쓰기라 enqueueWrite 큐가 필요 없다.
export function setThemePreset(id: ThemePresetId): Promise<void> {
  return AsyncStorage.setItem(THEME_KEY, JSON.stringify(id));
}

// 운동별이 아니라 앱 전체에 공통으로 적용되는 값이라 settingsKey(exerciseId)가 아닌 별도 키를 쓴다.
export async function getVoiceGuideEnabled(): Promise<boolean> {
  return readJson<boolean>(VOICE_GUIDE_KEY, true);
}

export function setVoiceGuideEnabled(enabled: boolean): Promise<void> {
  return AsyncStorage.setItem(VOICE_GUIDE_KEY, JSON.stringify(enabled));
}

export async function getColorSchemeOverride(): Promise<ColorSchemeOverride> {
  const raw = await readJson<ColorSchemeOverride | null>(COLOR_SCHEME_OVERRIDE_KEY, null);
  return raw && COLOR_SCHEME_OVERRIDE_VALUES.includes(raw) ? raw : 'system';
}

// 다른 값과 합쳐 쓰는 read-modify-write가 아니라 단순 덮어쓰기라 enqueueWrite 큐가 필요 없다.
export function setColorSchemeOverride(value: ColorSchemeOverride): Promise<void> {
  return AsyncStorage.setItem(COLOR_SCHEME_OVERRIDE_KEY, JSON.stringify(value));
}
