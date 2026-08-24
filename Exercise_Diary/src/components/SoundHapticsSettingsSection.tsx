import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { setHapticsEnabledCache } from '../lib/haptics';
import { useTranslation } from '../lib/i18n';
import {
  getAlarmVolumeMode,
  getHapticsEnabled,
  setAlarmVolumeMode,
  setHapticsEnabled,
} from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { AlarmVolumeMode, DEFAULT_ALARM_VOLUME_MODE } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import ColorSwitch from './ColorSwitch';

const ALARM_VOLUME_MODES: AlarmVolumeMode[] = ['device', 'max'];

// 포인트 컬러·화면 모드·리마인더와 같은 자리에 얹히는 설정 섹션(ReminderSettingsSection과 같은
// 패턴) — 이 컴포넌트가 storage를 직접 읽고 쓴다.
export default function SoundHapticsSettingsSection() {
  const accent = useAccentColors();
  const t = useTranslation();
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [alarmVolumeMode, setAlarmVolumeModeState] =
    useState<AlarmVolumeMode>(DEFAULT_ALARM_VOLUME_MODE);

  useEffect(() => {
    getHapticsEnabled().then(setHapticsEnabledState);
    getAlarmVolumeMode().then(setAlarmVolumeModeState);
  }, []);

  const onHapticsToggle = (value: boolean) => {
    setHapticsEnabledState(value); // 화면엔 즉시 반영
    setHapticsEnabledCache(value); // 캐시도 즉시 갱신 — 다음 버튼 탭부터 바로 적용
    setHapticsEnabled(value); // 저장은 백그라운드
  };

  const onAlarmVolumeModeChange = (mode: AlarmVolumeMode) => {
    setAlarmVolumeModeState(mode);
    setAlarmVolumeMode(mode);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: accent.text }]}>{t.settings.hapticsLabel}</Text>
        <ColorSwitch
          value={hapticsEnabled}
          onValueChange={onHapticsToggle}
          color={accent.primary}
        />
      </View>

      {/* iOS는 OS 정책상 앱이 시스템 볼륨 자체를 바꿀 수 없어, 이미 최대 상대음량으로 재생 중인
          지금과 이 설정이 체감상 구분되지 않는다 — Android에서만 노출한다(요구사항 1-3).
          진동이 꺼져 있으면 알림 자체에 관심이 없는 상태로 보고, 그 아래 알림음 볼륨 설정도 함께
          숨긴다. */}
      {Platform.OS === 'android' && hapticsEnabled && (
        <View style={styles.volumeSection}>
          <Text style={[styles.fieldLabel, { color: accent.textMuted }]}>
            {t.settings.alarmVolumeLabel}
          </Text>
          <View style={styles.segmentRow}>
            {ALARM_VOLUME_MODES.map((mode) => {
              const selected = mode === alarmVolumeMode;
              const label =
                mode === 'device' ? t.settings.alarmVolumeDevice : t.settings.alarmVolumeMax;
              return (
                <Pressable
                  key={mode}
                  style={[
                    styles.segment,
                    { borderColor: accent.border, backgroundColor: accent.background },
                    selected && { backgroundColor: accent.primary, borderColor: accent.primary },
                  ]}
                  onPress={() => onAlarmVolumeModeChange(mode)}
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
        </View>
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
  volumeSection: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  segmentRow: {
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
});
