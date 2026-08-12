import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '../lib/ads';
import { useAccentColors } from '../lib/ThemeContext';

// 로드되기 전/실패 시에는 높이 0으로 접어 빈 공간을 남기지 않는다.
export default function BottomBannerAd() {
  const accent = useAccentColors();
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.wrap, { backgroundColor: accent.background }, !loaded && styles.collapsed]}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  collapsed: {
    height: 0,
    overflow: 'hidden',
  },
});
