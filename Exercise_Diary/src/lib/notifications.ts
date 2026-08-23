import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getMostRecentRecordAt, getReminderSettings } from './storage';
import { ReminderSettings } from './types';

// video.ts의 PermissionState와 같은 규칙 — canAskAgain이 false면 '다시 묻지 않음'으로
// 영구 거부된 상태이므로 OS 설정으로 보내야 한다.
export type NotificationPermissionState = 'granted' | 'undetermined' | 'denied' | 'blocked';

const CHANNEL_ID = 'reminders';

// OS 팝업을 띄우지 않고 현재 권한 상태만 읽는다.
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const { granted, canAskAgain, status } = await Notifications.getPermissionsAsync();
  if (granted) return 'granted';
  if (canAskAgain === false) return 'blocked';
  if (status === 'undetermined') return 'undetermined';
  return 'denied';
}

// 실제 OS 권한 팝업을 띄운다 — 토글을 켤 때만 호출한다.
export async function requestNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

// 안드로이드 8+는 채널이 있어야 알림을 보낼 수 있다 — 앱 시작 시 한 번 호출(멱등).
export async function ensureAndroidChannelAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// 기본값(핸들러 미설정)은 앱이 포그라운드일 때 알림을 표시하지 않는다 — 이 앱을 이미 열어
// 쓰고 있는 중에 리마인더가 도착해도(예: N일 모드 알림이 딱 앱을 켠 순간 울리는 경우) 배너로
// 보이게 앱 시작 시 한 번 등록한다(멱등, ensureAndroidChannelAsync와 같은 자리에서 호출).
export function registerNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// N일간 미기록 모드의 다음 발송 시각을 계산한다. "기준일 + N일, 그날의 hour:minute"이 이미
// 과거라면(설정을 켠 시점에 이미 N일이 지나 있던 경우 등) 다음으로 hour:minute이 돌아오는
// 시점까지 앞당긴다 — 최소 지금부터는 미래인 시각을 반환한다.
export function computeDaysSinceTarget(
  baseIso: string,
  days: number,
  hour: number,
  minute: number,
): Date {
  const base = new Date(baseIso);
  const target = new Date(base);
  target.setDate(target.getDate() + days);
  target.setHours(hour, minute, 0, 0);

  const now = Date.now();
  if (target.getTime() <= now) {
    target.setTime(now);
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now) target.setDate(target.getDate() + 1);
  }
  return target;
}

export type ReminderNotificationContent = {
  dailyTitle: string;
  dailyBody: string;
  // 실제 daysSinceLastRecord 값은 이 모듈이 설정을 조회한 뒤에야 정해지므로, 호출부가 미리
  // 문자열로 만들어 넘기지 않고 번역 함수(t.reminder.daysSinceNotificationTitle)를 그대로 넘긴다.
  daysSinceTitle: (days: number) => string;
  daysSinceBody: string;
};

// 설정과 "가장 최근 기록 시각"을 받아 예약을 현재 상태와 일치시킨다. 무엇이 이미 예약돼
// 있었는지 추적하지 않고 항상 전부 취소 후 다시 예약한다 — 이 앱에 알림 기능이 이거 하나뿐이라
// 다른 예약과 뒤섞일 일이 없고, 상태 불일치보다 단순함을 우선한다.
export async function applyReminderSchedule(
  settings: ReminderSettings,
  lastRecordAt: string | null,
  content: ReminderNotificationContent,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  if (settings.mode === 'dailyTime') {
    await Notifications.scheduleNotificationAsync({
      content: { title: content.dailyTitle, body: content.dailyBody },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
        channelId: CHANNEL_ID,
      },
    });
    return;
  }

  const baseIso = lastRecordAt ?? new Date().toISOString();
  const target = computeDaysSinceTarget(
    baseIso,
    settings.daysSinceLastRecord,
    settings.hour,
    settings.minute,
  );
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.daysSinceTitle(settings.daysSinceLastRecord),
      body: content.daysSinceBody,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
      channelId: CHANNEL_ID,
    },
  });
}

// 시간형·횟수형 어느 쪽이든 새 기록이 저장된 직후 호출한다 — N일간 미기록 모드일 때만
// "지금을 기준으로 N일 뒤"로 예약을 다시 민다(카운트 리셋). 다른 경우는 즉시 반환해
// 리마인더가 꺼져 있거나 매일 모드일 땐 이 함수를 불러도 아무 일도 일어나지 않는다.
export async function notifyReminderRecordSaved(
  content: ReminderNotificationContent,
): Promise<void> {
  const settings = await getReminderSettings();
  if (!settings.enabled || settings.mode !== 'daysSinceLastRecord') return;
  await applyReminderSchedule(settings, new Date().toISOString(), content);
}

// N일간 미기록 모드는 1회성 DATE 트리거라, 알림이 한 번 울리고도 사용자가 계속 기록을
// 안 남기면 그 뒤로는 재예약할 계기가 전혀 없다(QA 중 발견) — 설정 변경도, 새 기록도 없기
// 때문이다. 진짜 백그라운드 재예약(expo-task-manager 등)은 이번 범위 밖이라, 최소한 앱을
// 다시 열 때마다(App.tsx 콜드 스타트) 저장된 설정 기준으로 다시 계산해 밀어준다 — 이미 지난
// 시각이었다면 computeDaysSinceTarget이 "다음으로 돌아오는 hour:minute"으로 앞당겨 재예약한다.
export async function resyncReminderSchedule(content: ReminderNotificationContent): Promise<void> {
  const settings = await getReminderSettings();
  if (!settings.enabled) return;
  const lastRecordAt = await getMostRecentRecordAt();
  await applyReminderSchedule(settings, lastRecordAt, content);
}
