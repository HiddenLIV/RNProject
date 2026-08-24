import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';

type Props = {
  remainingSec: number;
  totalSec: number;
  /** 3초마다 바뀌는 동기부여 문구 — useMotivationalQuote(RepsScreen)가 계산해 내려준다 */
  quote: string;
  /** 햅틱 등 부수 효과는 호출부(RepsScreen)의 책임 — 이 컴포넌트는 표시와 탭 전달만 한다 */
  onSkip: () => void;
};

// 세트 추가 직후 자동으로 뜨는 휴식 카운트다운 — "이번 세트" 입력 위에 얹히는 카드일 뿐,
// 아래 입력·저장 버튼을 가리거나 비활성화하지 않는다(RepsScreen이 조건부로 이 자리에만 렌더링).
export default function RestTimerBanner({ remainingSec, totalSec, quote, onSkip }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const progress = totalSec > 0 ? Math.min(1, Math.max(0, remainingSec / totalSec)) : 0;

  return (
    <View style={[styles.card, { backgroundColor: accent.primarySoft }]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.label, { color: accent.primary }]}>{t.reps.restingLabel}</Text>
          <Text style={[styles.value, { color: accent.primary }]}>
            {remainingSec}
            <Text style={[styles.unit, { color: accent.primary }]}>{t.units.seconds}</Text>
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.skipButton,
            { borderColor: accent.primary },
            pressed && styles.pressed,
          ]}
          onPress={onSkip}
          hitSlop={8}
        >
          <Text style={[styles.skipButtonText, { color: accent.primary }]}>
            {t.reps.skipRestButton}
          </Text>
        </Pressable>
      </View>
      {quote !== '' && (
        <Text style={[styles.quote, { color: accent.primary }]} numberOfLines={2}>
          {quote}
        </Text>
      )}
      {/* primarySoft 카드는 라이트/다크 모드와 무관하게 항상 어둡다 — 트랙도 그 전제로,
          accent.card처럼 모드별로 바뀌는 색 대신 고정된 반투명 흰색을 써서 다크 모드에서도
          채워지지 않은 부분이 카드 배경에 묻히지 않게 한다. */}
      <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
        <View
          style={[styles.fill, { backgroundColor: accent.primary, width: `${progress * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.smd,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  skipButton: {
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  skipButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  quote: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  track: {
    height: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
