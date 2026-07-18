import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** 증감 단위 (기본 1초) */
  step?: number;
  onChange: (value: number) => void;
};

export default function SecondsStepper({ label, value, min, max, step = 1, onChange }: Props) {
  const decrease = () => {
    if (value > min) onChange(Math.max(min, value - step));
  };

  const increase = () => {
    if (value < max) onChange(Math.min(max, value + step));
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={decrease}>
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{`${value}초`}</Text>
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
});
