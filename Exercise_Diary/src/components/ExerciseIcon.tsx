import { Ionicons } from '@expo/vector-icons';
import { CUSTOM_ICON_COMPONENTS } from './CustomWeightIcons';
import { isCustomIconKey } from '../lib/customIcons';
import { Exercise } from '../lib/types';

type Props = {
  icon: Exercise['icon'];
  size: number;
  color: string;
};

// 운동 아이콘은 Ionicons 문자열 또는 Ionicons에 없는 웨이트 기구용 커스텀 SVG 키, 둘 중 하나로 저장된다
export default function ExerciseIcon({ icon, size, color }: Props) {
  if (isCustomIconKey(icon)) {
    const CustomIcon = CUSTOM_ICON_COMPONENTS[icon];
    return <CustomIcon size={size} color={color} />;
  }
  return <Ionicons name={icon} size={size} color={color} />;
}
