import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { MeasureType } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  measureType: MeasureType;
  // 이 태그가 항상 어두운 칩(primarySoft 등) 위에 얹혀서 표시되는 자리에서 쓸 때 지정한다 —
  // 기본값(textMuted/border)은 페이지 배경 기준이라 어두운 칩 위에서는 라이트 모드에서 안 보인다.
  tone?: 'onChip';
};

// 앱 전체에서 "이 운동을 어떻게 재는지"를 같은 모양으로 표시하는 태그.
// 홈 목록·프리셋 고르기·운동 수정에서 반복해 등장해 하나의 표식으로 읽히게 한다.
const ICONS: Record<MeasureType, keyof typeof Ionicons.glyphMap> = {
  time: 'time-outline',
  reps: 'layers-outline',
};

export default function MeasureTypeTag({ measureType, tone }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const color = tone === 'onChip' ? accent.accent : accent.textMuted;
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Ionicons name={ICONS[measureType]} size={12} color={color} />
      <Text style={[styles.text, { color }]}>{t.measureType[measureType]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
