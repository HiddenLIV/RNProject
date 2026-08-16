import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import AlertHost from './AlertHost';
import Text from './AppText';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeAccessibilityLabel: string;
  children: ReactNode;
};

// 도움말·백업복원처럼 홈 화면에서 여는 보조 화면을 한 종류의 바텀시트로 통일한다.
// 항상 이 컴포넌트 하나만 마운트해 두고 내용(children)만 바꿔 끼우는 방식이라, RN Modal(각각
// 별도 네이티브 창)이 두 개 동시에 열리는 상황 자체가 구조적으로 생기지 않는다 — 예전에는
// 이걸 상태 플래그와 타임아웃 워치독으로 일일이 막아야 했다.
export default function BottomSheet({
  visible,
  onClose,
  title,
  closeAccessibilityLabel,
  children,
}: Props) {
  const accent = useAccentColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* 별도 네이티브 창이라 바깥 SafeAreaProvider의 인셋을 못 물려받아 이 창 기준으로 새로 둔다 */}
      <SafeAreaProvider>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <SafeAreaView
            edges={['bottom']}
            style={[styles.sheet, { backgroundColor: accent.background }]}
          >
            <View style={styles.header}>
              <View style={styles.headerSpacer} />
              <Text style={[styles.headerTitle, { color: accent.text }]}>{title}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel={closeAccessibilityLabel}
              >
                <Ionicons name="close" size={22} color={accent.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </View>
        {/* BackupSheetContent의 가져오기 확인 alert처럼, 이 시트가 떠 있는 동안엔 전역
            AlertHost(App.tsx) 대신 이 창 안에 겹쳐 그려야 한다 — 별도 네이티브 창 위에 또
            다른 Modal을 present하는 건 iOS에서 조용히 실패한다(alert.ts 참고). */}
        {visible && <AlertHost embedded />}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
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
  // maxHeight로 시트 전체 높이는 제한하고, ScrollView는 flexShrink로 그 안에서만
  // 줄어들게 해 내용이 짧으면(백업) 시트가 내용 크기로, 길면(도움말) 스크롤되게 한다.
  scroll: {
    flexShrink: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.smd,
    paddingBottom: spacing.xl,
  },
});
