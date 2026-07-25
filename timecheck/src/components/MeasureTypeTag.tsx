import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { MeasureType } from '../lib/types';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  measureType: MeasureType;
};

// 앱 전체에서 "이 운동을 어떻게 재는지"를 같은 모양으로 표시하는 태그.
// 홈 목록·프리셋 고르기·운동 수정에서 반복해 등장해 하나의 표식으로 읽히게 한다.
const CONFIG: Record<MeasureType, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  time: { icon: 'time-outline', label: '시간' },
  reps: { icon: 'layers-outline', label: '횟수·세트' },
};

export default function MeasureTypeTag({ measureType }: Props) {
  const { icon, label } = CONFIG[measureType];
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <Text style={styles.text}>{label}</Text>
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
    borderColor: colors.border,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
