import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useShareIntent } from 'expo-share-intent';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AddExerciseScreen from './src/screens/AddExerciseScreen';
import AlertHost from './src/components/AlertHost';
import ExerciseScreen from './src/screens/ExerciseScreen';
import ForceUpdateModal from './src/components/ForceUpdateModal';
import HomeScreen from './src/screens/HomeScreen';
import { initializeAds } from './src/lib/ads';
import { checkForceUpdate } from './src/lib/forceUpdate';
import { LanguageProvider } from './src/lib/i18n';
import { fontAssets } from './src/lib/fonts';
import { ThemeProvider, useAccentColors } from './src/lib/ThemeContext';
import { Exercise } from './src/lib/types';

type Screen = { name: 'home' } | { name: 'exercise'; exercise: Exercise } | { name: 'addExercise' };

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  // 유튜브 등에서 공유한 링크 — 운동 추가/수정 화면이 떠 있을 때만 링크 입력칸에 채워 넣는다
  // (Provider보다 위에서 훅을 호출해야 공유로 콜드 스타트해도 첫 렌더부터 값을 받는다).
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  if (!fontsLoaded) return <View style={styles.container} />;

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent
          sharedVideoLink={hasShareIntent ? (shareIntent.webUrl ?? undefined) : undefined}
          onConsumeSharedVideoLink={resetShareIntent}
        />
      </ThemeProvider>
    </LanguageProvider>
  );
}

type AppContentProps = {
  sharedVideoLink?: string;
  onConsumeSharedVideoLink: () => void;
};

function AppContent({ sharedVideoLink, onConsumeSharedVideoLink }: AppContentProps) {
  const accent = useAccentColors();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [forceUpdateStoreUrl, setForceUpdateStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    // playsInSilentMode: 무음 스위치가 켜져 있어도 초 읽기 음성이 나오도록
    // doNotMix: 측정 중 우리 오디오가 재생되면 다른 앱의 음악·영상을 일시정지
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
    initializeAds();
    // 콜드 스타트 1회만 체크 — 실패해도 forceUpdate.ts 내부에서 이미 흡수하지만 이중 안전망으로 catch
    checkForceUpdate()
      .then((result) => {
        if (result.blocked) setForceUpdateStoreUrl(result.storeUrl);
      })
      .catch(() => {});
  }, []);

  const dismissForceUpdate = () => setForceUpdateStoreUrl(null);

  // 안드로이드 하드웨어/제스처 뒤로 가기: 업데이트 바텀시트가 떠 있으면 "나중에"와 동일하게 닫기만 하고,
  // 그 외엔 홈이 아니면 홈으로, 홈에서는 기본 동작(앱 종료)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (forceUpdateStoreUrl) {
        dismissForceUpdate();
        return true;
      }
      if (screen.name !== 'home') {
        setScreen({ name: 'home' });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen, forceUpdateStoreUrl]);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: accent.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        {screen.name === 'home' && (
          <HomeScreen
            onSelectExercise={(exercise) => setScreen({ name: 'exercise', exercise })}
            onAddExercise={() => setScreen({ name: 'addExercise' })}
            sharedVideoLink={sharedVideoLink}
            onConsumeSharedVideoLink={onConsumeSharedVideoLink}
          />
        )}
        {screen.name === 'exercise' && (
          <ExerciseScreen exercise={screen.exercise} onBack={() => setScreen({ name: 'home' })} />
        )}
        {screen.name === 'addExercise' && (
          <AddExerciseScreen
            onBack={() => setScreen({ name: 'home' })}
            onCreated={() => setScreen({ name: 'home' })}
            sharedVideoLink={sharedVideoLink}
            onConsumeSharedVideoLink={onConsumeSharedVideoLink}
          />
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
      <AlertHost />
      <ForceUpdateModal
        visible={!!forceUpdateStoreUrl}
        storeUrl={forceUpdateStoreUrl ?? ''}
        onDismiss={dismissForceUpdate}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
