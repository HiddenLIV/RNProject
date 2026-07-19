import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** 증감 단위 (기본 1초) */
  step?: number;
  /** true면 값을 탭해 숫자를 직접 입력할 수 있다 (min~max로 보정) */
  editable?: boolean;
  onChange: (value: number) => void;
};

export default function SecondsStepper({ label, value, min, max, step = 1, editable = false, onChange }: Props) {
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

  const commit = () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed)) return;
    onChange(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={decrease} hitSlop={4}>
          <Ionicons name="remove" size={20} color={colors.primary} />
        </Pressable>
        {editing ? (
          <TextInput
            style={[styles.value, styles.input]}
            value={draft}
            onChangeText={setDraft}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            maxLength={3}
            onBlur={commit}
            onSubmitEditing={commit}
          />
        ) : (
          <Pressable onPress={startEditing}>
            <Text style={[styles.value, editable && styles.valueEditable]}>{`${value}초`}</Text>
          </Pressable>
        )}
        <Pressable style={styles.button} onPress={increase} hitSlop={4}>
          <Ionicons name="add" size={20} color={colors.primary} />
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
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
    minWidth: 52,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  valueEditable: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
  input: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.sm - 4,
  },
});
