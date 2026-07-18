import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
        <Pressable style={styles.button} onPress={decrease}>
          <Text style={styles.buttonText}>−</Text>
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
        <Pressable style={styles.button} onPress={increase}>
          <Text style={styles.buttonText}>+</Text>
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
    fontSize: 16,
    color: '#374151',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 22,
    color: '#111',
    lineHeight: 26,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    minWidth: 48,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  valueEditable: {
    textDecorationLine: 'underline',
  },
  input: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
  },
});
