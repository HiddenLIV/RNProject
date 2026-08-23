import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { showAlert } from '../lib/alert';
import { useTranslation } from '../lib/i18n';
import {
  applyReminderSchedule,
  getNotificationPermissionState,
  NotificationPermissionState,
  ReminderNotificationContent,
  requestNotificationPermission,
} from '../lib/notifications';
import { getMostRecentRecordAt, getReminderSettings, saveReminderSettings } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import {
  DEFAULT_REMINDER_SETTINGS,
  REMINDER_DAYS_MAX,
  REMINDER_DAYS_MIN,
  ReminderMode,
  ReminderSettings,
} from '../lib/types';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import NumberStepper from './NumberStepper';

const MODES: ReminderMode[] = ['dailyTime', 'daysSinceLastRecord'];

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// 포인트 컬러·화면 모드·백업/복원과 같은 자리에 얹히는 설정 섹션 — 이 컴포넌트가 storage를
// 직접 읽고 쓰며(SettingsSheetContent 패턴), 권한 요청·안내 흐름까지 스스로 책임진다.
export default function ReminderSettingsSection() {
  const accent = useAccentColors();
  const t = useTranslation();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [busy, setBusy] = useState(false);
  // 안드로이드는 버튼을 눌러야 다이얼로그가 뜨는 방식이라 열림 여부를 직접 관리한다.
  // iOS는 display="compact"가 자체적으로 팝오버를 처리해 이 state가 필요 없다.
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
  // 세그먼트·시각 피커·스테퍼를 빠르게 연달아 조작하면 각 핸들러의 cancelAll+schedule이
  // 겹쳐 실행돼 오래된 설정이 마지막에 예약되거나 알림이 중복될 수 있다 — 항상 이 체인 뒤에
  // 이어붙여 이전 재예약이 끝난 뒤에만 다음 재예약이 시작되게 직렬화한다.
  const rescheduleQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    getReminderSettings().then(setSettings);
  }, []);

  const notificationContent: ReminderNotificationContent = {
    dailyTitle: t.reminder.dailyNotificationTitle,
    dailyBody: t.reminder.dailyNotificationBody,
    daysSinceTitle: t.reminder.daysSinceNotificationTitle,
    daysSinceBody: t.reminder.daysSinceNotificationBody,
  };

  const updateAndReschedule = (next: ReminderSettings) => {
    setSettings(next); // 화면 즉시 반영
    const run = rescheduleQueueRef.current
      .then(() => saveReminderSettings(next))
      .then(() => getMostRecentRecordAt())
      .then((lastRecordAt) => applyReminderSchedule(next, lastRecordAt, notificationContent));
    // 이 호출이 실패해도 항상 fulfilled 상태로 남겨 반환한다 — 그래야 (1) 큐가 한 번의 실패로
    // 이 화면이 떠 있는 동안 이후 모든 저장/재예약을 조용히 무시하는 상태(QA 중 발견)에 빠지지
    // 않고, (2) 세그먼트/스테퍼/시각 피커처럼 반환값을 기다리지 않는 호출부에서 unhandled
    // rejection이 뜨지 않는다 — 다른 알림 부수효과(notifyReminderRecordSaved)와 같은 관례로,
    // 알림 예약 실패를 사용자 흐름까지 전파하지 않는다.
    rescheduleQueueRef.current = run.catch(() => {});
    return rescheduleQueueRef.current;
  };

  // 이 바텀시트는 이미 자체 <Modal>(BottomSheet.tsx) 안에 떠 있어서, 여기서 또 새 <Modal>을
  // 열면 iOS가 조용히 실패한다(BottomSheet.tsx 참고) — 전역 showAlert()를 쓰면 BottomSheet가
  // 이미 마운트해 둔 embedded AlertHost가 대신 받아 정상적으로 겹쳐 뜬다.
  const showPermissionAlert = (state: NotificationPermissionState) => {
    const blocked = state === 'blocked';
    showAlert(t.reminderPermission.title, t.reminderPermission.body, [
      { text: t.reminderPermission.cancel, style: 'cancel' },
      {
        text: blocked ? t.reminderPermission.openSettings : t.reminderPermission.grant,
        onPress: blocked ? handleOpenSettings : handleGrantFromAlert,
      },
    ]);
  };

  const handleToggle = async (value: boolean) => {
    if (!value) {
      await updateAndReschedule({ ...settings, enabled: false });
      return;
    }
    setBusy(true);
    try {
      const state = await getNotificationPermissionState();
      if (state === 'granted') {
        await updateAndReschedule({ ...settings, enabled: true });
        return;
      }
      if (state === 'blocked') {
        showPermissionAlert('blocked');
        return;
      }
      const granted = await requestNotificationPermission();
      if (granted) {
        await updateAndReschedule({ ...settings, enabled: true });
      } else {
        showPermissionAlert(await getNotificationPermissionState());
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGrantFromAlert = async () => {
    setBusy(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await updateAndReschedule({ ...settings, enabled: true });
      } else {
        // 다시 거부됐으면 최신 상태(이번엔 영구 차단일 수도 있다) 기준으로 다시 안내한다.
        showPermissionAlert(await getNotificationPermissionState());
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setAndroidPickerOpen(false);
    if (event.type !== 'set' || !date) return;
    updateAndReschedule({ ...settings, hour: date.getHours(), minute: date.getMinutes() });
  };

  const timeValue = new Date();
  timeValue.setHours(settings.hour, settings.minute, 0, 0);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: accent.text }]}>{t.reminder.enabledLabel}</Text>
        <Switch
          value={settings.enabled}
          onValueChange={handleToggle}
          disabled={busy}
          trackColor={{ true: accent.primary, false: accent.border }}
        />
      </View>

      {settings.enabled && (
        <>
          <View style={styles.modeRow}>
            {MODES.map((mode) => {
              const selected = mode === settings.mode;
              const label =
                mode === 'dailyTime'
                  ? t.reminder.modeDailyTimeLabel
                  : t.reminder.modeDaysSinceLabel;
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.segment,
                    { borderColor: accent.border, backgroundColor: accent.background },
                    selected && { backgroundColor: accent.primary, borderColor: accent.primary },
                  ]}
                  onPress={() => updateAndReschedule({ ...settings, mode })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: accent.textMuted },
                      selected && { color: accent.onPrimary },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.timeSection}>
            <Text style={[styles.fieldLabel, { color: accent.textMuted }]}>
              {t.reminder.timeLabel}
            </Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={timeValue}
                mode="time"
                display="compact"
                onChange={handleTimeChange}
              />
            ) : (
              <>
                <Pressable
                  style={[styles.timeButton, { borderColor: accent.primary }]}
                  onPress={() => setAndroidPickerOpen(true)}
                >
                  <Text style={[styles.timeButtonText, { color: accent.text }]}>
                    {formatTime(settings.hour, settings.minute)}
                  </Text>
                </Pressable>
                {androidPickerOpen && (
                  <DateTimePicker
                    value={timeValue}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </View>

          {settings.mode === 'daysSinceLastRecord' && (
            <NumberStepper
              label={t.reminder.daysLabel}
              value={settings.daysSinceLastRecord}
              min={REMINDER_DAYS_MIN}
              max={REMINDER_DAYS_MAX}
              unit={t.units.days}
              onChange={(v) => updateAndReschedule({ ...settings, daysSinceLastRecord: v })}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeSection: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  timeButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
