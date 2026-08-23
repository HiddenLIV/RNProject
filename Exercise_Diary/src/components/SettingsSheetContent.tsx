import { StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, spacing } from '../theme';
import Text from './AppText';
import BackupSheetContent from './BackupSheetContent';
import ColorSchemeSelector from './ColorSchemeSelector';
import ReminderSettingsSection from './ReminderSettingsSection';
import ThemeSwatchRow from './ThemeSwatchRow';

type Props = {
  // BackupSheetContent로 그대로 전달 — 가져오기 완료/실패 처리는 호출부(HomeScreen)가 맡는다.
  onRestored: () => void;
  onRestoreFailed: () => void;
};

// 포인트 컬러 · 화면 모드 · 백업/복원을 한 시트 안에 세로로 조합한다. 각 섹션은 독립적으로
// context/storage를 직접 읽고 쓰므로(ThemeSwatchRow, ColorSchemeSelector) 이 컴포넌트엔
// 별도 로컬 상태가 없다.
export default function SettingsSheetContent({ onRestored, onRestoreFailed }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  return (
    <>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
          {t.settings.colorSectionLabel}
        </Text>
        <ThemeSwatchRow />
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
          {t.settings.modeSectionLabel}
        </Text>
        <ColorSchemeSelector />
      </View>
      <View style={styles.section}>
        <ReminderSettingsSection />
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.backup.title}</Text>
        <BackupSheetContent onRestored={onRestored} onRestoreFailed={onRestoreFailed} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
