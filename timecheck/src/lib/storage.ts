import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, HangRecord, Settings } from './types';

const RECORDS_KEY = 'timecheck:records:v1';
const SETTINGS_KEY = 'timecheck:settings:v1';

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

export async function addRecord(record: HangRecord): Promise<void> {
  const records = await getRecords();
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify([record, ...records]));
}

export async function removeRecord(id: string): Promise<HangRecord[]> {
  const records = await getRecords();
  const next = records.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(next));
  return next;
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
