import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import RecordsScreen from './RecordsScreen';
import TimerScreen from './TimerScreen';
import { colors, fontSize, spacing } from '../theme';

type Tab = 'timer' | 'records';

type Props = {
  onBack: () => void;
};

export default function HangScreen({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('timer');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>매달리기</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>{tab === 'timer' ? <TimerScreen /> : <RecordsScreen />}</View>
      <View style={styles.tabBar}>
        <Pressable style={styles.tabButton} onPress={() => setTab('timer')}>
          <Ionicons
            name={tab === 'timer' ? 'timer' : 'timer-outline'}
            size={22}
            color={tab === 'timer' ? colors.primary : colors.textFaint}
          />
          <Text style={[styles.tabText, tab === 'timer' && styles.tabTextActive]}>타이머</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('records')}>
          <Ionicons
            name={tab === 'records' ? 'list' : 'list-outline'}
            size={22}
            color={tab === 'records' ? colors.primary : colors.textFaint}
          />
          <Text style={[styles.tabText, tab === 'records' && styles.tabTextActive]}>기록</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.smd,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textFaint,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primary,
  },
});
