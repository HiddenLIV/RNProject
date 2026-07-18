import { setAudioModeAsync } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import RecordsScreen from './src/screens/RecordsScreen';
import TimerScreen from './src/screens/TimerScreen';

type Tab = 'timer' | 'records';

export default function App() {
  const [tab, setTab] = useState<Tab>('timer');

  useEffect(() => {
    // 헬스장에서 무음 스위치가 켜져 있어도 초 읽기 음성이 나오도록
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{tab === 'timer' ? <TimerScreen /> : <RecordsScreen />}</View>
      <View style={styles.tabBar}>
        <Pressable style={styles.tabButton} onPress={() => setTab('timer')}>
          <Text style={[styles.tabText, tab === 'timer' && styles.tabTextActive]}>타이머</Text>
        </Pressable>
        <Pressable style={styles.tabButton} onPress={() => setTab('records')}>
          <Text style={[styles.tabText, tab === 'records' && styles.tabTextActive]}>기록</Text>
        </Pressable>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
