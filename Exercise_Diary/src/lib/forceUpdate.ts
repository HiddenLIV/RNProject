import Constants from 'expo-constants';
import { Platform } from 'react-native';

const VERSION_CONFIG_URL = 'https://hiddenliv.github.io/RNProject/version.json';
const FETCH_TIMEOUT_MS = 4000;

type PlatformVersionInfo = {
  minVersion: string; // "1.2.3" 형식
  storeUrl: string;
};

type RemoteVersionConfig = {
  ios: unknown;
  android: unknown;
};

export type ForceUpdateResult = { blocked: false } | { blocked: true; storeUrl: string };

// "1.9.0" < "1.10.0"을 문자열 사전순 비교하면 잘못 판단하므로 세그먼트를 숫자로 비교한다.
// 세그먼트 개수가 다르면(예: "1.2" vs "1.2.0") 없는 자리는 0으로 취급한다.
function compareVersions(a: string, b: string): number {
  const segA = a.split('.').map(Number);
  const segB = b.split('.').map(Number);
  const len = Math.max(segA.length, segB.length);
  for (let i = 0; i < len; i++) {
    const diff = (segA[i] ?? 0) - (segB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// "v1.1.0"·"1.1.0-rc1"처럼 숫자가 아닌 세그먼트가 섞이면 compareVersions가 NaN을 반환해
// 항상 통과 처리되므로(의도치 않은 fail-open), 여기서 미리 걸러 설정 자체를 무효화한다.
function isNumericVersion(value: string): boolean {
  return value.split('.').every((segment) => Number.isFinite(Number(segment)) && segment.trim() !== '');
}

// gh-pages 계정이 탈취/변조되면 storeUrl로 임의 사이트를 심을 수 있으므로,
// 실제 스토어 도메인인지 확인한 뒤에만 업데이트 안내에 사용한다.
const ALLOWED_STORE_HOSTS: Record<'ios' | 'android', readonly string[]> = {
  ios: ['apps.apple.com'],
  android: ['play.google.com'],
};

function isAllowedStoreUrl(platform: 'ios' | 'android', storeUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(storeUrl);
    return protocol === 'https:' && ALLOWED_STORE_HOSTS[platform].includes(hostname);
  } catch {
    return false;
  }
}

function isValidPlatformInfo(
  value: unknown,
  platform: 'ios' | 'android'
): value is PlatformVersionInfo {
  if (!value || typeof value !== 'object') return false;
  const info = value as Record<string, unknown>;
  return (
    typeof info.minVersion === 'string' &&
    isNumericVersion(info.minVersion) &&
    typeof info.storeUrl === 'string' &&
    isAllowedStoreUrl(platform, info.storeUrl)
  );
}

// ios/android 각각을 독립적으로 검증한다 — 한쪽 플랫폼 값이 비어있거나 잘못돼도
// (예: iOS storeUrl 미확정) 다른 플랫폼의 안내가 함께 죽지 않도록 여기서는 형태만 확인한다.
function isValidConfig(value: unknown): value is RemoteVersionConfig {
  return !!value && typeof value === 'object';
}

// 네트워크 오류·타임아웃·JSON 파싱 실패·필드 누락 등 어떤 이유로든 실패하면 null을 반환한다 —
// 호출부는 null이면 차단하지 않고 그대로 앱을 진행시킨다(오프라인 사용자를 막지 않기 위함).
async function fetchRemoteVersionConfig(): Promise<RemoteVersionConfig | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // gh-pages 응답에 cache-control: max-age=600이 붙어 있는데, RN Android는 fetch의
    // cache: 'no-store'를 지키지 않고 OkHttp 디스크 캐시를 그대로 쓰는 알려진 버그가 있다
    // (facebook/react-native#23905) — 헤더 옵션만으로는 minVersion을 올려 재배포해도 기기가
    // 계속 이전 값을 볼 수 있어, 매 호출마다 URL 자체를 다르게 만들어 캐시를 무조건 우회한다.
    const res = await fetch(`${VERSION_CONFIG_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    const json = await res.json();
    return isValidConfig(json) ? json : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkForceUpdate(): Promise<ForceUpdateResult> {
  const config = await fetchRemoteVersionConfig();
  if (!config) return { blocked: false };

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const info = Platform.OS === 'ios' ? config.ios : config.android;
  if (!isValidPlatformInfo(info, platform)) return { blocked: false };

  const current = Constants.expoConfig?.version;
  if (!current) return { blocked: false };

  if (compareVersions(current, info.minVersion) < 0) {
    return { blocked: true, storeUrl: info.storeUrl };
  }
  return { blocked: false };
}
