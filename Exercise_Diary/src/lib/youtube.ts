import { Linking } from 'react-native';
import { Translations } from './i18n';

// 링크가 문자열 맨 앞에서 시작해야 하고(다른 URL 안에 끼워 넣은 youtu.be는 거부),
// 캡처한 11자리 뒤에 word/dash 문자가 더 이어지면(잘못 잘린 ID) 거부한다.
const PATTERNS = [
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?[^#]*\bv=([\w-]{11})(?![\w-])/,
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtu\.be\/([\w-]{11})(?![\w-])/,
  /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([\w-]{11})(?![\w-])/,
];

// watch/youtu.be/shorts 링크에서 11자리 유튜브 영상 ID를 뽑아낸다. 형식이 아니면 null.
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// GuideVideoPanel·EditExerciseModal이 공유하는 검증 — 형식이 아니면 번역된 에러 메시지를 함께 반환한다.
export function parseYoutubeLink(input: string, t: Translations): { id: string; error?: undefined } | { id?: undefined; error: string } {
  const id = extractYoutubeVideoId(input);
  return id ? { id } : { error: t.editExercise.errorInvalidVideoLink };
}

// 유튜브 앱(딥링크)과 웹(폴백)용 검색 URL을 함께 만든다.
export function buildYoutubeSearchUrls(exerciseName: string, keyword: string): { appUrl: string; webUrl: string } {
  const query = encodeURIComponent(`${exerciseName} ${keyword}`.trim());
  return {
    appUrl: `youtube://results?search_query=${query}`,
    webUrl: `https://www.youtube.com/results?search_query=${query}`,
  };
}

// 유튜브 앱이 있으면 앱으로, 없으면 브라우저로 검색을 연다. 둘 다 실패하면 ok: false를 반환해
// 호출부가 사용자에게 알릴 수 있게 한다 (실패를 조용히 삼키지 않기 위함).
export async function openYoutubeSearch(exerciseName: string, keyword: string): Promise<{ ok: boolean }> {
  const { appUrl, webUrl } = buildYoutubeSearchUrls(exerciseName, keyword);
  const canOpenApp = await Linking.canOpenURL(appUrl).catch(() => false);
  return Linking.openURL(canOpenApp ? appUrl : webUrl).then(
    () => ({ ok: true }),
    () => ({ ok: false }),
  );
}
