import { StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import BackupSheetContent from './BackupSheetContent';
import ColorSchemeSelector from './ColorSchemeSelector';
import ReminderSettingsSection from './ReminderSettingsSection';
import SoundHapticsSettingsSection from './SoundHapticsSettingsSection';
import ThemeSwatchRow from './ThemeSwatchRow';

type Props = {
  // BackupSheetContent로 그대로 전달 — 가져오기 완료/실패 처리는 호출부(HomeScreen)가 맡는다.
  onRestored: () => void;
  onRestoreFailed: () => void;
};

// 포인트 컬러 · 화면 모드 · 소리·진동 · 리마인더 · 백업/복원을 한 시트 안에 세로로 조합한다.
// 다섯 섹션 모두 카드 배경(section 스타일)으로 감싸 경계를 분명히 하고, 그 위에 동일한
// sectionLabel 스타일로 타이틀을 달아 섹션마다 제각각이던 타이틀 크기를 통일한다.
// BackupSheetContent 내부의 두 행은 이 카드와 같은 배경색(accent.card) 대신 outline
// 스타일(투명 배경 + 테두리)을 쓴다 — 안의 행이 바깥 카드와 같은 색이면 경계가 사라지기 때문.
// 각 섹션은 독립적으로 context/storage를 직접 읽고 쓰므로(ThemeSwatchRow, ColorSchemeSelector)
// 이 컴포넌트엔 별도 로컬 상태가 없다.
export default function SettingsSheetContent({ onRestored, onRestoreFailed }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <>
      <View style={[styles.section, { backgroundColor: accent.card }]}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
          {t.settings.colorSectionLabel}
        </Text>
        <ThemeSwatchRow />
      </View>
      <View style={[styles.section, { backgroundColor: accent.card }]}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
          {t.settings.modeSectionLabel}
        </Text>
        <ColorSchemeSelector />
      </View>
      <View style={[styles.section, { backgroundColor: accent.card }]}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
          {t.settings.soundHapticsSectionLabel}
        </Text>
        <SoundHapticsSettingsSection />
      </View>
      <View style={[styles.section, { backgroundColor: accent.card }]}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
          {t.settings.reminderSectionLabel}
        </Text>
        <ReminderSettingsSection />
      </View>
      <View style={[styles.section, { backgroundColor: accent.card }]}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.backup.title}</Text>
        <BackupSheetContent onRestored={onRestored} onRestoreFailed={onRestoreFailed} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
