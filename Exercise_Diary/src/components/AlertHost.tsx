import { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { AlertButton, AlertButtonStyle, AlertRequest, registerAlertListener } from '../lib/alert';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  // true면 자체 <Modal>을 새로 열지 않고 절대 위치 오버레이로만 그린다 — EditExerciseModal·
  // BackupModal·CameraPermissionModal처럼 이미 자체 <Modal> 안에서 이 컴포넌트를 마운트하는
  // 경우에 쓴다. iOS는 이미 present된 Modal 위에 또 다른 Modal을 present하려 하면 조용히
  // 실패하기 때문에(경고만 찍히고 알림이 아예 안 뜸), 그 경우엔 새 네이티브 Modal 대신 이미
  // 떠 있는 화면 안에 겹쳐 그린다. 이때는 onRequestClose가 없어 안드로이드 하드웨어 뒤로가기가
  // 부모 Modal로 그대로 전달되므로, 아래 BackHandler로 직접 가로챈다.
  embedded?: boolean;
};

// Alert.alert를 대신하는 앱 전체 공용 알림. App.tsx 최상단에 한 번(embedded 아님) 마운트되어
// 화면 전환과 무관한 대부분의 showAlert() 호출을 구독하고, EditExerciseModal·BackupModal·
// CameraPermissionModal은 자기 자신의 <Modal> 안에 embedded 인스턴스를 추가로 두어 자신이
// 열려 있는 동안의 알림을 대신 받는다(registerAlertListener는 스택이라 나중에 마운트된 쪽이
// 우선한다). 스타일은 CameraPermissionModal의 backdrop/card/버튼 배치를 그대로 따른다.
export default function AlertHost({ embedded = false }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    return registerAlertListener(setRequest);
  }, []);

  const buttons: AlertButton[] = request
    ? request.buttons.length > 0
      ? request.buttons
      : [{ text: t.common.confirm }]
    : [];

  const close = () => setRequest(null);

  const handleDismiss = () => {
    const cancelButton = buttons.find((b) => b.style === 'cancel');
    close();
    cancelButton?.onPress?.();
  };

  // embedded 모드는 자체 <Modal>이 없어서, RN이 안드로이드 하드웨어 뒤로가기를 자동으로
  // onRequestClose에 연결해주는 혜택을 못 받는다 — 알림이 떠 있는 동안 뒤로가기를 직접
  // 가로채지 않으면 부모 Modal(EditExerciseModal 등)의 onRequestClose로 그대로 전달돼
  // 알림이 아니라 부모 화면 전체가 닫힌다. 알림이 없을 때는 리스너를 등록하지 않아, 그때는
  // 뒤로가기가 평소처럼 부모 Modal로 전달된다.
  useEffect(() => {
    if (!embedded || !request) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });
    return () => subscription.remove();
  }, [embedded, request]);

  if (!request) return null;

  const handlePress = (button: AlertButton) => {
    close();
    button.onPress?.();
  };

  const backgroundColorFor = (style: AlertButtonStyle = 'default') => {
    if (style === 'cancel') return accent.card;
    if (style === 'destructive') return accent.dangerSoft;
    return accent.primary;
  };

  const textColorFor = (style: AlertButtonStyle = 'default') => {
    if (style === 'cancel') return accent.text;
    if (style === 'destructive') return accent.danger;
    return accent.onPrimary;
  };

  const content = (
    <Pressable style={styles.backdrop} onPress={handleDismiss}>
      <Pressable style={[styles.card, { backgroundColor: accent.background }]} onPress={() => {}}>
        <Text style={[styles.title, { color: accent.text }]}>{request.title}</Text>
        {request.message && (
          <Text style={[styles.body, { color: accent.textMuted }]}>{request.message}</Text>
        )}
        <View style={styles.buttonRow}>
          {buttons.map((button, index) => (
            <Pressable
              key={index}
              style={[styles.button, { backgroundColor: backgroundColorFor(button.style) }]}
              onPress={() => handlePress(button)}
            >
              <Text style={[styles.buttonText, { color: textColorFor(button.style) }]}>{button.text}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Pressable>
  );

  if (embedded) {
    return <View style={styles.embeddedOverlay}>{content}</View>;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  embeddedOverlay: {
    ...StyleSheet.absoluteFill,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
