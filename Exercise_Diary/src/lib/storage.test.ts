/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addExercise,
  addRecord,
  getExercises,
  getRecords,
  getSettings,
  removeExercise,
  removeRecord,
  restoreFromBackup,
  saveSettings,
} from './storage';
import { BACKUP_SCHEMA_VERSION, BackupPayload, DEFAULT_SETTINGS, Exercise } from './types';

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex-1',
    name: '테스트 운동',
    icon: 'barbell-outline',
    measureType: 'time',
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('exercises', () => {
  test('addExercise로 저장한 운동이 getExercises에 그대로 나온다', async () => {
    await addExercise(makeExercise());

    const list = await getExercises();

    expect(list).toEqual([makeExercise()]);
  });

  test('removeExercise가 운동과 그 운동의 기록·설정을 함께 지운다', async () => {
    await addExercise(makeExercise());
    await addRecord('ex-1', { id: 'r-1', measuredAt: new Date().toISOString(), durationMs: 5000 });
    await saveSettings('ex-1', { ...DEFAULT_SETTINGS, restSeconds: 90 });

    await removeExercise('ex-1');

    expect(await getExercises()).toEqual([]);
    expect(await getRecords('ex-1')).toEqual([]);
    // settings 저장소 자체가 지워졌으니 다시 읽으면 기본값으로 돌아와야 한다
    expect(await getSettings('ex-1')).toEqual(DEFAULT_SETTINGS);
  });
});

describe('records 쓰기 큐(직렬화)', () => {
  test('동시에 addRecord를 여러 번 호출해도 앞선 기록이 유실되지 않는다', async () => {
    await addExercise(makeExercise());

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        addRecord('ex-1', {
          id: `r-${i}`,
          measuredAt: new Date().toISOString(),
          durationMs: 1000 * i,
        }),
      ),
    );

    const records = await getRecords('ex-1');
    // read-modify-write가 직렬화되지 않으면 나중에 끝난 호출이 앞선 호출의 결과를 덮어써
    // 10개보다 적게 남는다.
    expect(records).toHaveLength(10);
    expect(new Set(records.map((r) => r.id)).size).toBe(10);
  });

  test('removeRecord는 지정한 기록만 지운다', async () => {
    await addExercise(makeExercise());
    await addRecord('ex-1', { id: 'a', measuredAt: new Date().toISOString(), durationMs: 1000 });
    await addRecord('ex-1', { id: 'b', measuredAt: new Date().toISOString(), durationMs: 2000 });

    const remaining = await removeRecord('ex-1', 'a');

    expect(remaining.map((r) => r.id)).toEqual(['b']);
    expect(await getRecords('ex-1')).toHaveLength(1);
  });
});

describe('getSettings', () => {
  test('옛 저장값에 없는 필드(restSeconds/restEnabled)는 기본값으로 채워진다', async () => {
    // 세트 간 휴식 타이머 기능 이전에 저장된 것처럼, 옛 필드만 있는 원시 JSON을 직접 심는다.
    await AsyncStorage.setItem(
      'timecheck:settings:ex-1:v1',
      JSON.stringify({ countdownSeconds: 7 }),
    );

    const settings = await getSettings('ex-1');

    expect(settings.countdownSeconds).toBe(7);
    expect(settings.restSeconds).toBe(DEFAULT_SETTINGS.restSeconds);
    expect(settings.restEnabled).toBe(DEFAULT_SETTINGS.restEnabled);
  });
});

describe('restoreFromBackup', () => {
  function makeBackup(overrides: Partial<BackupPayload> = {}): BackupPayload {
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      exercises: [makeExercise()],
      theme: 'default',
      colorSchemeOverride: 'system',
      exerciseData: {
        'ex-1': {
          records: [{ id: 'r-1', measuredAt: new Date().toISOString(), durationMs: 9999 }],
          repsRecords: [],
          settings: DEFAULT_SETTINGS,
        },
      },
      ...overrides,
    };
  }

  test('백업 내용대로 운동과 기록을 통째로 되돌린다', async () => {
    await restoreFromBackup(makeBackup());

    expect(await getExercises()).toEqual([makeExercise()]);
    expect(await getRecords('ex-1')).toHaveLength(1);
  });

  test('복원할 백업에 없는 옛 운동의 기록은 정리된다', async () => {
    await addExercise(makeExercise({ id: 'old-ex' }));
    await addRecord('old-ex', { id: 'old-r', measuredAt: new Date().toISOString(), durationMs: 1 });

    await restoreFromBackup(makeBackup());

    expect((await getExercises()).map((e) => e.id)).toEqual(['ex-1']);
    expect(await getRecords('old-ex')).toEqual([]);
  });

  test('복원 전후에 같은 id로 남아있는 운동은 백업 내용으로 완전히 교체된다', async () => {
    await addExercise(makeExercise());
    await addRecord('ex-1', {
      id: 'will-be-replaced',
      measuredAt: new Date().toISOString(),
      durationMs: 1,
    });

    await restoreFromBackup(makeBackup());

    expect((await getRecords('ex-1')).map((r) => r.id)).toEqual(['r-1']);
  });
});
