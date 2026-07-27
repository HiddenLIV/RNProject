import { StyleSheet } from 'react-native';
import Text from './AppText';
import { useAccentColors } from '../lib/ThemeContext';
import { fontSize } from '../theme';

export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const hundredths = Math.floor((clamped % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

type Props = {
  ms: number;
};

export default function TimeDisplay({ ms }: Props) {
  const accent = useAccentColors();
  return <Text style={[styles.time, { color: accent.text }]}>{formatDuration(ms)}</Text>;
}

const styles = StyleSheet.create({
  time: {
    fontSize: fontSize.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
