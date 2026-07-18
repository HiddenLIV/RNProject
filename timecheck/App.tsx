import { setAudioModeAsync } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import HangScreen from './src/screens/HangScreen';
import HomeScreen from './src/screens/HomeScreen';

type Screen = 'home' | 'hang';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    // playsInSilentMode: 무음 스위치가 켜져 있어도 초 읽기 음성이 나오도록
    // doNotMix: 측정 중 우리 오디오가 재생되면 다른 앱의 음악·영상을 일시정지
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
  }, []);

  // 안드로이드 하드웨어/제스처 뒤로 가기: 메뉴 화면에서는 홈으로, 홈에서는 기본 동작(앱 종료)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'home') {
        setScreen('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const handleSelectMenu = (menuId: string) => {
    if (menuId === 'hang') setScreen('hang');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        {screen === 'home' ? (
          <HomeScreen onSelect={handleSelectMenu} />
        ) : (
          <HangScreen onBack={() => setScreen('home')} />
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
