import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { useShareIntent } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import AlertHost from './src/components/AlertHost';
import ForceUpdateModal from './src/components/ForceUpdateModal';
import { initializeAds } from './src/lib/ads';
import { fontAssets } from './src/lib/fonts';
import { checkForceUpdate } from './src/lib/forceUpdate';
import { LanguageProvider, useTranslation } from './src/lib/i18n';
import {
  ensureAndroidChannelAsync,
  registerNotificationHandler,
  resyncReminderSchedule,
} from './src/lib/notifications';
import { ThemeProvider, useAccentColors } from './src/lib/ThemeContext';
import { Exercise } from './src/lib/types';
import ActivityScreen from './src/screens/ActivityScreen';
import AddExerciseScreen from './src/screens/AddExerciseScreen';
import ExerciseScreen from './src/screens/ExerciseScreen';
import HomeScreen from './src/screens/HomeScreen';

type Screen =
  | { name: 'home' }
  | { name: 'exercise'; exercise: Exercise; initialTab?: 'records'; returnTo?: 'home' | 'activity' }
  | { name: 'addExercise' }
  | { name: 'activity' };

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
  const t = useTranslation();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [forceUpdateStoreUrl, setForceUpdateStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    // playsInSilentMode: 무음 스위치가 켜져 있어도 초 읽기 음성이 나오도록
    // doNotMix: 측정 중 우리 오디오가 재생되면 다른 앱의 음악·영상을 일시정지
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
    initializeAds();
    // 안드로이드 8+ 알림 채널 생성 — 리마인더를 아직 켜지 않은 사용자도 있으니 매번 멱등하게 호출
    ensureAndroidChannelAsync().catch(() => {});
    // 앱이 포그라운드에 있을 때도 리마인더 알림이 배너로 보이게 등록 — 리마인더를 아직 켜지
    // 않은 사용자에게는 아무 영향도 없다(예약된 알림이 없으니 핸들러가 호출될 일이 없다)
    registerNotificationHandler();
    // N일간 미기록 모드는 1회성 알림이라 발송 후 사용자가 계속 기록을 안 남기면 재예약할
    // 계기가 없다(notifications.ts 참고) — 최소한 앱을 다시 열 때마다 저장된 설정 기준으로
    // 다시 계산해 밀어준다. 리마인더를 아직 켜지 않은 사용자에게는 아무 영향도 없다.
    resyncReminderSchedule({
      dailyTitle: t.reminder.dailyNotificationTitle,
      dailyBody: t.reminder.dailyNotificationBody,
      daysSinceTitle: t.reminder.daysSinceNotificationTitle,
      daysSinceBody: t.reminder.daysSinceNotificationBody,
    }).catch(() => {});
    // 콜드 스타트 1회만 체크 — 실패해도 forceUpdate.ts 내부에서 이미 흡수하지만 이중 안전망으로 catch
    checkForceUpdate()
      .then((result) => {
        if (result.blocked) setForceUpdateStoreUrl(result.storeUrl);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 콜드 스타트 1회 실행 의도, t는 첫 렌더 시점 값으로 충분
  }, []);

  const dismissForceUpdate = () => setForceUpdateStoreUrl(null);

  // 활동 기록 화면에서 연 운동 화면은 뒤로가기(화면 버튼·하드웨어 모두)로 홈이 아니라 활동
  // 기록 화면으로 돌아가야 한다 — 화면 전환에 별도 히스토리 스택이 없는 구조라, 그 한 단계를
  // exercise 화면 자신의 상태(returnTo)에 담아 왔던 곳으로만 되돌아간다.
  const goBack = useCallback(() => {
    setScreen((current) =>
      current.name === 'exercise' && current.returnTo === 'activity'
        ? { name: 'activity' }
        : { name: 'home' },
    );
  }, []);

  // 안드로이드 하드웨어/제스처 뒤로 가기: 업데이트 바텀시트가 떠 있으면 "나중에"와 동일하게 닫기만 하고,
  // 그 외엔 홈이 아니면 goBack으로, 홈에서는 기본 동작(앱 종료)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (forceUpdateStoreUrl) {
        dismissForceUpdate();
        return true;
      }
      if (screen.name !== 'home') {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen, forceUpdateStoreUrl, goBack]);

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
            onOpenActivity={() => setScreen({ name: 'activity' })}
            sharedVideoLink={sharedVideoLink}
            onConsumeSharedVideoLink={onConsumeSharedVideoLink}
          />
        )}
        {screen.name === 'exercise' && (
          <ExerciseScreen exercise={screen.exercise} initialTab={screen.initialTab} onBack={goBack} />
        )}
        {screen.name === 'addExercise' && (
          <AddExerciseScreen
            onBack={() => setScreen({ name: 'home' })}
            onCreated={() => setScreen({ name: 'home' })}
            sharedVideoLink={sharedVideoLink}
            onConsumeSharedVideoLink={onConsumeSharedVideoLink}
          />
        )}
        {screen.name === 'activity' && (
          <ActivityScreen
            onBack={() => setScreen({ name: 'home' })}
            onOpenExerciseRecords={(exercise) =>
              setScreen({ name: 'exercise', exercise, initialTab: 'records', returnTo: 'activity' })
            }
          />
        )}
        {/* expo-status-bar의 "auto"는 기기 시스템 설정만 보고 밝기를 정해서, 화면 모드를
            시스템과 반대로 고정했을 때(예: 기기는 라이트인데 앱은 다크) 상태바가 배경과
            거의 같은 색이 돼 안 보인다 — 앱이 실제로 쓰는 팔레트(accent.colorScheme) 기준으로 정한다. */}
        <StatusBar style={accent.colorScheme === 'light' ? 'dark' : 'light'} />
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
