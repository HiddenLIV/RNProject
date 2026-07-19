import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, HangRecord, Settings } from './types';

const RECORDS_KEY = 'timecheck:records:v1';
const SETTINGS_KEY = 'timecheck:settings:v1';

// addRecord/removeRecord/updateRecord는 모두 getRecords→setItem read-modify-write라
// 겹쳐 호출되면 나중에 끝난 쪽이 앞선 변경을 덮어써 기록이 유실될 수 있다.
// 같은 큐에 태워 항상 순서대로(직전 쓰기가 끝난 뒤에) 실행되게 직렬화한다.
let recordsQueue: Promise<unknown> = Promise.resolve();
function enqueueRecordsWrite<T>(task: () => Promise<T>): Promise<T> {
  const result = recordsQueue.then(task, task);
  recordsQueue = result.catch(() => {});
  return result;
}

export async function getRecords(): Promise<HangRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecord(record: HangRecord): Promise<void> {
  return enqueueRecordsWrite(async () => {
    const records = await getRecords();
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify([record, ...records]));
  });
}

export function removeRecord(id: string): Promise<HangRecord[]> {
  return enqueueRecordsWrite(async () => {
    const records = await getRecords();
    const next = records.filter((r) => r.id !== id);
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    return next;
  });
}

export function updateRecord(id: string, patch: Partial<HangRecord>): Promise<HangRecord[]> {
  return enqueueRecordsWrite(async () => {
    const records = await getRecords();
    const next = records.map((r) => (r.id === id ? { ...r, ...patch } : r));
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    return next;
  });
}

export async function getSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function createRecordId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
