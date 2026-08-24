import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { showAlert } from '../lib/alert';
import { BackupError, exportBackup, pickBackupFile } from '../lib/backup';
import { useTranslation } from '../lib/i18n';
import { restoreFromBackup } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { BackupPayload } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import Toast from './Toast';

type Props = {
  // 가져오기 적용까지 끝난 뒤 한 번 호출된다 — 시트 닫기·목록 새로고침·완료 안내는
  // 호출부(HomeScreen)가 맡는다(EditExerciseModal의 onSaved와 같은 역할 분담).
  onRestored: () => void;
  // 복원 도중 실패했을 때도 호출된다 — 시트는 열어둔 채(에러 얼럿으로 이미 안내했으므로) 목록만
  // 저장소 최신 상태로 다시 읽어온다. 성공 토스트·시트 닫기는 하지 않는다는 점이 onRestored와 다르다.
  onRestoreFailed: () => void;
};

type Busy = 'idle' | 'exporting' | 'importing';

export default function BackupSheetContent({ onRestored, onRestoreFailed }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [busy, setBusy] = useState<Busy>('idle');
  const [exportToastVisible, setExportToastVisible] = useState(false);

  const importErrorMessage = (code: BackupError['code'] | null) => {
    if (code === 'INVALID_JSON' || code === 'INVALID_SHAPE') return t.backup.errorInvalidFile;
    if (code === 'UNSUPPORTED_VERSION') return t.backup.errorUnsupportedVersion;
    if (code === 'READ_FAILED') return t.backup.errorReadFailed;
    return t.backup.importErrorMessage;
  };

  const handleExport = async () => {
    if (busy !== 'idle') return;
    setBusy('exporting');
    try {
      await exportBackup();
      setExportToastVisible(true);
    } catch (err) {
      const code = err instanceof BackupError ? err.code : null;
      showAlert(
        t.backup.exportErrorTitle,
        code === 'SHARE_UNAVAILABLE' ? t.backup.errorShareUnavailable : t.backup.exportErrorMessage,
      );
    } finally {
      setBusy('idle');
    }
  };

  const applyImport = async (payload: BackupPayload) => {
    try {
      await restoreFromBackup(payload);
      accent.setPresetId(payload.theme);
      accent.setColorSchemeOverride(payload.colorSchemeOverride ?? 'system');
      onRestored();
    } catch {
      showAlert(t.backup.importErrorTitle, t.backup.importErrorMessage);
      // 저장소가 부분적으로만 바뀌었을 가능성이 있으므로, 시트는 열어둔 채 목록만 최신 상태로
      // 다시 읽어와 화면이 실제 저장소 내용과 어긋나지 않게 한다.
      onRestoreFailed();
    } finally {
      setBusy('idle');
    }
  };

  const handleImport = async () => {
    if (busy !== 'idle') return;
    setBusy('importing');
    try {
      const payload = await pickBackupFile();
      if (!payload) {
        setBusy('idle');
        return;
      }
      // 커스텀 알림은 바깥 탭/뒤로가기로 닫아도 cancel 버튼의 onPress를 그대로 실행해주므로,
      // 별도의 onDismiss 없이도 'importing' 상태가 항상 풀린다.
      showAlert(t.backup.importConfirmTitle, t.backup.importConfirmMessage, [
        { text: t.backup.cancel, style: 'cancel', onPress: () => setBusy('idle') },
        {
          text: t.backup.importConfirmButton,
          style: 'destructive',
          onPress: () => applyImport(payload),
        },
      ]);
    } catch (err) {
      const code = err instanceof BackupError ? err.code : null;
      showAlert(t.backup.importErrorTitle, importErrorMessage(code));
      setBusy('idle');
    }
  };

  return (
    <>
      <Pressable
        style={[styles.row, { backgroundColor: accent.background, borderColor: accent.border }]}
        onPress={handleExport}
        disabled={busy !== 'idle'}
      >
        <View style={[styles.iconBadge, { backgroundColor: accent.primary }]}>
          {busy === 'exporting' ? (
            <ActivityIndicator color={accent.onPrimary} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={24} color={accent.onPrimary} />
          )}
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: accent.text }]}>{t.backup.exportLabel}</Text>
          <Text style={[styles.rowDescription, { color: accent.textMuted }]}>
            {t.backup.exportDescription}
          </Text>
        </View>
      </Pressable>
      <Pressable
        style={[styles.row, { backgroundColor: accent.background, borderColor: accent.border }]}
        onPress={handleImport}
        disabled={busy !== 'idle'}
      >
        <View style={[styles.iconBadge, { backgroundColor: accent.primary }]}>
          {busy === 'importing' ? (
            <ActivityIndicator color={accent.onPrimary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={24} color={accent.onPrimary} />
          )}
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: accent.text }]}>{t.backup.importLabel}</Text>
          <Text style={[styles.rowDescription, { color: accent.textMuted }]}>
            {t.backup.importDescription}
          </Text>
        </View>
      </Pressable>
      <Toast
        visible={exportToastVisible}
        message={t.backup.exportSuccessToast}
        onHide={() => setExportToastVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  rowDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
