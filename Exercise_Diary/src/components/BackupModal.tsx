import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Text from './AppText';
import Toast from './Toast';
import { BackupError, exportBackup, pickBackupFile } from '../lib/backup';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { restoreFromBackup } from '../lib/storage';
import { BackupPayload } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  // 가져오기 적용까지 끝난 뒤 한 번 호출된다 — 모달 닫기·목록 새로고침·완료 안내는
  // 호출부(HomeScreen)가 맡는다(EditExerciseModal의 onSaved와 같은 역할 분담).
  onRestored: () => void;
  // 복원 도중 실패했을 때도 호출된다 — 모달은 열어둔 채(에러 얼럿으로 이미 안내했으므로) 목록만
  // 저장소 최신 상태로 다시 읽어온다. 성공 토스트·모달 닫기는 하지 않는다는 점이 onRestored와 다르다.
  onRestoreFailed: () => void;
};

type Busy = 'idle' | 'exporting' | 'importing';

export default function BackupModal({ visible, onClose, onRestored, onRestoreFailed }: Props) {
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
      Alert.alert(
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
      onRestored();
    } catch {
      Alert.alert(t.backup.importErrorTitle, t.backup.importErrorMessage);
      // 저장소가 부분적으로만 바뀌었을 가능성이 있으므로, 모달은 열어둔 채 목록만 최신 상태로
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
      Alert.alert(t.backup.importConfirmTitle, t.backup.importConfirmMessage, [
        { text: t.backup.cancel, style: 'cancel', onPress: () => setBusy('idle') },
        { text: t.backup.importConfirmButton, style: 'destructive', onPress: () => applyImport(payload) },
      ], {
        // 안드로이드에서 뒤로가기/바깥 탭으로 얼럿을 닫으면 버튼 onPress가 전혀 호출되지
        // 않는다 — onDismiss가 없으면 busy가 'importing'에 계속 머물러 두 행이 영구히
        // 비활성화된다.
        onDismiss: () => setBusy('idle'),
      });
    } catch (err) {
      const code = err instanceof BackupError ? err.code : null;
      Alert.alert(t.backup.importErrorTitle, importErrorMessage(code));
      setBusy('idle');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* HelpModal과 같은 이유로 Modal 내부에 SafeAreaProvider를 새로 둔다 —
          별도 네이티브 창이라 바깥 SafeAreaProvider의 top 값을 못 물려받는다. */}
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, { backgroundColor: accent.background }]} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={[styles.headerTitle, { color: accent.text }]}>{t.backup.title}</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel={t.backup.closeAccessibility}
            >
              <Ionicons name="close" size={24} color={accent.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Pressable
              style={[styles.row, { backgroundColor: accent.card }]}
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
                <Text style={[styles.rowDescription, { color: accent.textMuted }]}>{t.backup.exportDescription}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.row, { backgroundColor: accent.card }]}
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
                <Text style={[styles.rowDescription, { color: accent.textMuted }]}>{t.backup.importDescription}</Text>
              </View>
            </Pressable>
          </ScrollView>
          <Toast
            visible={exportToastVisible}
            message={t.backup.exportSuccessToast}
            onHide={() => setExportToastVisible(false)}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.smd,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    borderRadius: radius.md,
    padding: spacing.md,
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
