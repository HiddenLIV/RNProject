import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Text from './AppText';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** 증감 단위 (기본 1) */
  step?: number;
  /** 값 뒤에 붙는 단위 텍스트 */
  unit?: string;
  /** true면 값을 탭해 숫자를 직접 입력할 수 있다 (min~max로 보정) */
  editable?: boolean;
  /** true면 라벨을 숨기고 버튼을 줄여 표 형태의 좁은 칸에 맞춘다 (예: 세트 목록) */
  compact?: boolean;
  onChange: (value: number) => void;
};

export default function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  editable = false,
  compact = false,
  onChange,
}: Props) {
  const accent = useAccentColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const decrease = () => {
    if (value > min) onChange(Math.max(min, value - step));
  };

  const increase = () => {
    if (value < max) onChange(Math.min(max, value + step));
  };

  const startEditing = () => {
    if (!editable) return;
    setDraft(String(value));
    setEditing(true);
  };

  // 타이핑할 때마다 곧바로 부모에 반영한다 — blur/제출 시점까지 미루면, 값을 막 입력한
  // 직후 다른 버튼(예: 저장)을 눌렀을 때 그 버튼이 이전 값을 먼저 읽어버릴 수 있다.
  const handleDraftChange = (text: string) => {
    setDraft(text);
    const parsed = parseInt(text, 10);
    if (!Number.isNaN(parsed)) {
      onChange(Math.min(max, Math.max(min, parsed)));
    }
  };

  const commit = () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) return;
    onChange(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {label !== '' && <Text style={[styles.label, { color: accent.textMuted }]}>{label}</Text>}
      <View style={[styles.controls, compact && styles.controlsCompact]}>
        <Pressable
          style={[styles.button, { backgroundColor: accent.primarySoft }, compact && styles.buttonCompact]}
          onPress={decrease}
          hitSlop={4}
        >
          <Ionicons name="remove" size={compact ? 15 : 20} color={accent.primary} />
        </Pressable>
        {editing ? (
          <TextInput
            style={[
              styles.value,
              { color: accent.text },
              compact && styles.valueCompact,
              styles.input,
              { borderColor: accent.primary },
            ]}
            value={draft}
            onChangeText={handleDraftChange}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            maxLength={3}
            onBlur={commit}
            onSubmitEditing={commit}
          />
        ) : (
          <Pressable onPress={startEditing}>
            <Text
              style={[
                styles.value,
                { color: accent.text },
                compact && styles.valueCompact,
                editable && { textDecorationLine: 'underline', textDecorationColor: accent.primary },
              ]}
            >{`${value}${unit}`}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.button, { backgroundColor: accent.primarySoft }, compact && styles.buttonCompact]}
          onPress={increase}
          hitSlop={4}
        >
          <Ionicons name="add" size={compact ? 15 : 20} color={accent.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  rowCompact: {
    justifyContent: 'flex-start',
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  controlsCompact: {
    gap: spacing.xs,
  },
  // M3 최소 터치 타겟(48dp) 기준에 맞춘 크기 — 이전엔 40px이라 살짝 못 미쳤다.
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    width: 28,
    height: 28,
  },
  value: {
    fontSize: fontSize.base,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  valueCompact: {
    minWidth: 36,
  },
  input: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.sm - 4,
  },
});
