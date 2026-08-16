import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  getColorSchemeOverride,
  getExercises,
  getRecords,
  getRepsRecords,
  getSettings,
  getThemePreset,
} from './storage';
import {
  BACKUP_SCHEMA_VERSION,
  BackupExerciseData,
  BackupPayload,
  COLOR_SCHEME_OVERRIDE_VALUES,
  Exercise,
  THEME_PRESET_IDS,
} from './types';

export type BackupErrorCode =
  | 'SHARE_UNAVAILABLE'
  | 'INVALID_JSON'
  | 'INVALID_SHAPE'
  | 'UNSUPPORTED_VERSION'
  | 'READ_FAILED';

export class BackupError extends Error {
  code: BackupErrorCode;
  constructor(code: BackupErrorCode) {
    super(code);
    this.code = code;
  }
}

async function collectBackupPayload(): Promise<BackupPayload> {
  const exercises = await getExercises();
  const theme = await getThemePreset();
  const colorSchemeOverride = await getColorSchemeOverride();
  const exerciseData: Record<string, BackupExerciseData> = {};
  await Promise.all(
    exercises.map(async (exercise) => {
      const [records, repsRecords, settings] = await Promise.all([
        getRecords(exercise.id),
        getRepsRecords(exercise.id),
        getSettings(exercise.id),
      ]);
      exerciseData[exercise.id] = { records, repsRecords, settings };
    }),
  );
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    exercises,
    theme,
    colorSchemeOverride,
    exerciseData,
  };
}

// 파일명에 쓸 타임스탬프 — 사용자에게 노출되는 텍스트가 아니라 i18n 불필요.
function formatStamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function exportBackup(): Promise<void> {
  // 공유가 불가능한 기기라면 캐시 파일을 만들 필요 자체가 없으므로 먼저 확인한다 —
  // 순서를 바꾸지 않으면 공유 불가 기기에서 내보내기를 시도할 때마다 쓸모없는 캐시 파일이 남는다.
  if (!(await Sharing.isAvailableAsync())) throw new BackupError('SHARE_UNAVAILABLE');

  const payload = await collectBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const fileName = `hiddenreps-backup-${formatStamp(payload.exportedAt)}.json`;
  // Paths.cache: 공유 시트로 전달하는 용도의 임시 파일일 뿐 앱이 영구 보관할 데이터가 아니다.
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(json);

  // shareAsync는 안드로이드에서 "공유 인텐트가 전달된 시점"에 resolve되고 "상대 앱이 파일을
  // 다 읽은 시점"이 아니므로, 공유 직후 이 캐시 파일을 코드로 지우지 않는다(경쟁 상태 방지).
  // overwrite:true는 같은 분 안에 다시 내보낼 때 파일명이 겹쳐 create()가 실패하는 것만 막는
  // 용도다 — 분 단위 파일명이 서로 달라 내보낼 때마다 캐시에 작은 JSON이 하나씩 남지만, 용량이
  // 작고(수 KB) Paths.cache 자체가 시스템이 필요시 정리하는 영역이라 별도 정리 로직을 두지 않는다.
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: fileName });
}

// id/name/icon/measureType만 확인한다 — icon은 Ionicons 전체 글리프 집합 + 커스텀 아이콘 키를
// 아우르는 매우 큰 합집합이라 여기서 전부 나열하지 않고, 렌더링이 깨지지 않을 최소 조건(빈 값이
// 아닌 문자열)만 본다. usesWeight/weightUnit/guideVideoId 등 선택 필드는 없어도 안전하게
// 동작하도록 이미 옵셔널 체이닝으로 짜여 있어 여기서 검증하지 않는다.
function isBackupExerciseShape(value: unknown): value is Exercise {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.icon === 'string' &&
    v.icon.length > 0 &&
    (v.measureType === 'time' || v.measureType === 'reps')
  );
}

function isBackupExerciseDataShape(value: unknown): value is BackupExerciseData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.records) || !Array.isArray(v.repsRecords)) return false;
  if (!v.settings || typeof v.settings !== 'object') return false;
  const settings = v.settings as Record<string, unknown>;
  return typeof settings.countdownSeconds === 'number' && typeof settings.bellIntervalSeconds === 'number';
}

function isBackupPayloadShape(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (
    typeof v.schemaVersion !== 'number' ||
    typeof v.exportedAt !== 'string' ||
    !Array.isArray(v.exercises) ||
    typeof v.exerciseData !== 'object' ||
    v.exerciseData === null ||
    typeof v.theme !== 'string' ||
    !THEME_PRESET_IDS.includes(v.theme as (typeof THEME_PRESET_IDS)[number])
  ) {
    return false;
  }
  // 이번 기능 이전 백업 파일엔 아예 없는 필드라 optional — 있다면 유효한 값이어야 한다.
  if (
    v.colorSchemeOverride !== undefined &&
    !COLOR_SCHEME_OVERRIDE_VALUES.includes(v.colorSchemeOverride as (typeof COLOR_SCHEME_OVERRIDE_VALUES)[number])
  ) {
    return false;
  }
  if (!v.exercises.every(isBackupExerciseShape)) return false;

  const exerciseData = v.exerciseData as Record<string, unknown>;
  // exerciseData에 아예 항목이 없는 운동은 storage.ts의 restoreFromBackup이 조용히 건너뛰므로
  // 허용한다 — 다만 항목이 "있다면" 온전한 형태여야 한다(JSON.stringify(undefined)가 문자열이
  // 아닌 값으로 저장되는 것을 막기 위함).
  return (v.exercises as Exercise[]).every((exercise) => {
    const data = exerciseData[exercise.id];
    return data === undefined || isBackupExerciseDataShape(data);
  });
}

// 취소 시 null 반환(에러 아님) — 호출부는 아무 것도 하지 않고 조용히 끝난다.
export async function pickBackupFile(): Promise<BackupPayload | null> {
  // MIME 필터를 'application/json'으로 좁히면 일부 안드로이드 파일 제공자(구글 드라이브 등)가
  // .json을 'application/octet-stream'으로 보고해 목록에서 안 보이는 경우가 있다 —
  // '*/*'로 열고 내용 기반으로 검증한다.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled) return null;

  let text: string;
  try {
    text = await new File(result.assets[0].uri).text();
  } catch {
    // JSON.parse 실패("유효한 백업 파일이 아님")와는 원인이 다른, 파일 자체를 읽지 못한
    // 경우(권한 문제 등)라 구분되는 에러 코드로 분류해 사용자에게 다른 안내를 보여준다.
    throw new BackupError('READ_FAILED');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('INVALID_JSON');
  }
  // 화면 모드는 부가 정보라, 값이 깨져 있다고(오타 등) 운동 데이터 전체를 가져오지 못하게
  // 막을 이유는 없다 — 형태 검증 전에 미리 지워서 나머지 파일은 정상 처리되게 한다
  // (storage.ts의 restoreFromBackup이 필드가 없을 때와 똑같이 'system'으로 처리한다).
  if (parsed && typeof parsed === 'object' && 'colorSchemeOverride' in parsed) {
    const raw = parsed as Record<string, unknown>;
    if (!COLOR_SCHEME_OVERRIDE_VALUES.includes(raw.colorSchemeOverride as (typeof COLOR_SCHEME_OVERRIDE_VALUES)[number])) {
      delete raw.colorSchemeOverride;
    }
  }
  if (!isBackupPayloadShape(parsed)) throw new BackupError('INVALID_SHAPE');
  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) throw new BackupError('UNSUPPORTED_VERSION');
  return parsed;
}
