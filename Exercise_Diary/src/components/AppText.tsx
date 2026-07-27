import { Text as RNText, StyleSheet, TextProps } from 'react-native';

// fontWeight 숫자값을 실제 로드된 Pretendard 정적 굵기 파일로 매핑한다.
// RN은 커스텀 폰트에 fontWeight를 얹으면 합성 볼드(faux bold)를 시도해 흐릿하게 보이므로,
// fontWeight는 항상 제거하고 그에 대응하는 fontFamily로 치환한다.
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '400': 'Pretendard-Regular',
  normal: 'Pretendard-Regular',
  '500': 'Pretendard-Regular',
  '600': 'Pretendard-SemiBold',
  '700': 'Pretendard-Bold',
  bold: 'Pretendard-Bold',
  '800': 'Pretendard-ExtraBold',
  '900': 'Pretendard-ExtraBold',
};

export default function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const weightKey = flat.fontWeight != null ? String(flat.fontWeight) : '400';
  const fontFamily = FAMILY_BY_WEIGHT[weightKey] ?? 'Pretendard-Regular';
  const { fontWeight: _fontWeight, ...rest } = flat;
  return <RNText {...props} style={{ ...rest, fontFamily }} />;
}
