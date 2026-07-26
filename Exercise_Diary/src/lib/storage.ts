import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, Exercise, RepsRecord, Settings, TimeRecord } from './types';

const EXERCISES_KEY = 'timecheck:exercises:v1';

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

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
