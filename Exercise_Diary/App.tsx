import { setAudioModeAsync } from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AddExerciseScreen from './src/screens/AddExerciseScreen';
import ExerciseScreen from './src/screens/ExerciseScreen';
import HomeScreen from './src/screens/HomeScreen';
import { ThemeProvider } from './src/lib/ThemeContext';
import { Exercise } from './src/lib/types';
import { colors } from './src/theme';

type Screen = { name: 'home' } | { name: 'exercise'; exercise: Exercise } | { name: 'addExercise' };

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    // playsInSilentMode: 무음 스위치가 켜져 있어도 초 읽기 음성이 나오도록
    // doNotMix: 측정 중 우리 오디오가 재생되면 다른 앱의 음악·영상을 일시정지
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
  }, []);

  // 안드로이드 하드웨어/제스처 뒤로 가기: 홈이 아니면 홈으로, 홈에서는 기본 동작(앱 종료)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name !== 'home') {
        setScreen({ name: 'home' });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        {screen.name === 'home' && (
          <HomeScreen
            onSelectExercise={(exercise) => setScreen({ name: 'exercise', exercise })}
            onAddExercise={() => setScreen({ name: 'addExercise' })}
          />
        )}
        {screen.name === 'exercise' && (
          <ExerciseScreen exercise={screen.exercise} onBack={() => setScreen({ name: 'home' })} />
        )}
        {screen.name === 'addExercise' && (
          <AddExerciseScreen
            onBack={() => setScreen({ name: 'home' })}
            onCreated={() => setScreen({ name: 'home' })}
          />
        )}
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
