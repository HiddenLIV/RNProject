import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import RecordsScreen from './RecordsScreen';
import TimerScreen from './TimerScreen';

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
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>매달리기</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>{tab === 'timer' ? <TimerScreen /> : <RecordsScreen />}</View>
      <View style={styles.tabBar}>
        <Pressable style={styles.tabButton} onPress={() => setTab('timer')}>
          <Text style={[styles.tabText, tab === 'timer' && styles.tabTextActive]}>타이머</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('records')}>
          <Text style={[styles.tabText, tab === 'records' && styles.tabTextActive]}>기록</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 32,
    lineHeight: 36,
    color: '#2563eb',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
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
    borderTopColor: '#d1d5db',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#2563eb',
  },
});
