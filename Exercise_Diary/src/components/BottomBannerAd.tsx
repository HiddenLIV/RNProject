import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '../lib/ads';
import { useAccentColors } from '../lib/ThemeContext';
import { radius } from '../theme';

// 화면 전환으로 홈이 언마운트→재마운트될 때마다 광고가 새로 로드되는데, 그 사이 이 컴포넌트가
// height 0으로 접히면 위에 있는 FAB이 순간적으로 광고 자리까지 내려왔다가 로드 후 다시 튀어
// 올라오는 것처럼 보인다. 이번 앱 실행 중 광고가 한 번이라도 로드에 성공한 적이 있으면, 그
// 사실을 모듈 스코프에 기억해두고 재로딩 중에도 표준 배너 높이만큼 자리를 미리 예약해서
// 레이아웃이 흔들리지 않게 한다(광고가 아예 로드된 적 없을 때만 완전히 접어 빈 공간을 없앤다).
let hasEverLoadedAd = false;
const RESERVED_HEIGHT = 50; // 표준 배너 높이(iOS/Android 공통) — 적응형 배너의 실제 높이도 보통 이 이상이다.

type Status = 'loading' | 'loaded' | 'failed';

// 로딩/실패를 구분해야 하는 이유: 오프라인 등으로 로드가 실패하면(예: 비행기 모드) 재확보된
// 자리에서 로딩 애니메이션만 무한히 도는 것처럼 보이면 안 된다 — 실패가 확정되면 애니메이션을
// 멈추고 조용한 빈 자리로 남긴다(자리 자체는 계속 예약해 FAB이 내려오는 문제는 재발하지 않음).
// 화면을 나갔다 돌아오면(홈 재마운트) 컴포넌트가 새로 로드를 시도하므로 별도 재시도 로직은 두지 않는다.
export default function BottomBannerAd() {
  const accent = useAccentColors();
  const [status, setStatus] = useState<Status>('loading');
  const shimmerOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (status !== 'loading') return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmerOpacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [status, shimmerOpacity]);

  const handleLoaded = () => {
    hasEverLoadedAd = true;
    setStatus('loaded');
  };

  // 이번 세션에서 한 번도 로드에 성공한 적 없으면(예: 첫 실행이 오프라인) 자리 자체를 예약하지
  // 않는다 — 광고가 이 환경에서 아예 나오지 않을 가능성(미승인·미지원 지역 등)까지 감안해,
  // 성공을 확인하기 전까지는 원래대로 빈 공간을 남기지 않는 쪽을 우선한다.
  const reserveSpace = hasEverLoadedAd && status !== 'loaded';
  const showShimmer = hasEverLoadedAd && status === 'loading';
  const collapsed = !hasEverLoadedAd && status !== 'loaded';

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: accent.background },
        reserveSpace && { height: RESERVED_HEIGHT },
        collapsed && styles.collapsed,
      ]}
    >
      {showShimmer && (
        <Animated.View
          style={[styles.shimmer, { backgroundColor: accent.cardMuted, opacity: shimmerOpacity }]}
        />
      )}
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={handleLoaded}
        // 적응형 배너는 자동 새로고침으로 이미 로드되어 화면에 붙어 있는 광고에 대해서도 이
        // 콜백을 다시 호출할 수 있다 — 이미 떠 있는 광고를 status='failed'로 되돌리면
        // reserveSpace가 RESERVED_HEIGHT(50)로 되돌아가 더 큰 실제 배너가 잘려 보인다.
        // 한 번 'loaded'가 되면 그 상태는 유지하고, 처음 로드 시도가 실패한 경우에만 반영한다.
        onAdFailedToLoad={() => setStatus((prev) => (prev === 'loaded' ? prev : 'failed'))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsed: {
    height: 0,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    width: '92%',
    height: 40,
    borderRadius: radius.sm,
  },
});
