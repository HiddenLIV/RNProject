import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise, RepsSet } from '../lib/types';
import { fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import NumberStepper from './NumberStepper';

const MAX_REPS = 200;

type Props = {
  exercise: Exercise;
  sets: RepsSet[];
  currentReps: number;
  currentWeightText: string;
  /** null이면 "새 세트 추가" 모드, 인덱스가 있으면 그 세트를 수정 중 */
  editingIndex: number | null;
  error: string;
  onRepsChange: (reps: number) => void;
  onWeightTextChange: (text: string) => void;
  /** 추가(+) 또는 수정 확정(체크) — 어느 모드인지는 editingIndex로 판단한다 */
  onConfirm: () => void;
  onStartEdit: (index: number) => void;
  onRemove: (index: number) => void;
};

// 무게·횟수 측정 화면(RepsScreen)의 라이브 세트 입력과, 저장된 오늘 기록을 여는
// 수정 시트(EditRepsRecordSheetContent) 양쪽이 같은 세트 추가/수정/삭제 UI를 쓴다.
export default function SetListEditor({
  exercise,
  sets,
  currentReps,
  currentWeightText,
  editingIndex,
  error,
  onRepsChange,
  onWeightTextChange,
  onConfirm,
  onStartEdit,
  onRemove,
}: Props) {
  const accent = useAccentColors();
  const t = useTranslation();

  return (
    <>
      <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>
        {t.reps.currentSetLabel} :{' '}
        {t.reps.setNumberLabel(editingIndex != null ? editingIndex + 1 : sets.length + 1)}
      </Text>
      <View style={styles.currentEntryRow}>
        {exercise.usesWeight && (
          <View style={[styles.weightField, { borderColor: accent.primary }]}>
            <TextInput
              style={[styles.weightInput, { color: accent.text }]}
              value={currentWeightText}
              onChangeText={onWeightTextChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={accent.textFaint}
            />
            <Text style={[styles.weightUnit, { color: accent.textMuted }]}>
              {exercise.weightUnit === 'lb' ? t.units.lb : t.units.kg}
            </Text>
          </View>
        )}
        <View style={styles.currentReps}>
          <NumberStepper
            label=""
            value={currentReps}
            min={0}
            max={MAX_REPS}
            unit={t.units.reps}
            editable
            onChange={onRepsChange}
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: accent.primary },
            pressed && styles.pressedHighlight,
          ]}
          onPress={onConfirm}
          hitSlop={8}
          accessibilityLabel={
            editingIndex != null ? t.reps.confirmEditAccessibility : t.reps.addSetButton
          }
        >
          <Ionicons
            name={editingIndex != null ? 'checkmark' : 'add'}
            size={22}
            color={accent.onPrimary}
          />
        </Pressable>
      </View>

      {sets.length > 0 && (
        <>
          <Text
            style={[
              styles.sectionLabel,
              styles.recordedLabel,
              { color: accent.textMuted, borderTopColor: accent.border },
            ]}
          >
            {t.reps.recordedSetsLabel}
          </Text>
          {sets
            .map((set, index) => ({ set, index }))
            .reverse()
            .map(({ set, index }) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.setRow,
                  { borderTopColor: accent.border },
                  editingIndex === index && { backgroundColor: accent.primarySoft },
                  pressed && styles.pressedHighlight,
                ]}
                onPress={() => onStartEdit(index)}
              >
                <Text
                  style={[
                    styles.setIndex,
                    { color: editingIndex === index ? accent.primary : accent.textMuted },
                  ]}
                >
                  {t.reps.setNumberLabel(index + 1)}
                </Text>
                <Text
                  style={[
                    styles.setSummary,
                    { color: editingIndex === index ? accent.primary : accent.text },
                  ]}
                >
                  {exercise.usesWeight
                    ? `${set.weight ?? 0}${exercise.weightUnit === 'lb' ? t.units.lb : t.units.kg} × ${set.reps}${t.units.reps}`
                    : `${set.reps}${t.units.reps}`}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.removeButton, pressed && styles.pressedHighlight]}
                  onPress={() => onRemove(index)}
                  hitSlop={16}
                  accessibilityLabel={t.reps.removeSetAccessibility}
                >
                  <Ionicons name="close" size={16} color={accent.danger} />
                </Pressable>
              </Pressable>
            ))}
        </>
      )}

      {error !== '' && <Text style={[styles.error, { color: accent.danger }]}>{error}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  // 진동이 꺼져 있어도(또는 진동이 있는 상태에서도) 눌림을 시각적으로 알 수 있게 하는 공용 효과.
  pressedHighlight: {
    opacity: 0.7,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recordedLabel: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  currentEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentReps: {
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  setIndex: {
    width: 48,
    fontSize: fontSize.base,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  setSummary: {
    flex: 1,
    fontSize: fontSize.base,
    fontVariant: ['tabular-nums'],
  },
  // 옆에 나란히 오는 횟수 스테퍼(48px 원형 버튼)와 시각적 무게가 비슷하도록, 테두리 없는
  // 밑줄 텍스트 대신 같은 높이의 알약형 박스로 감싼다.
  weightField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    minWidth: 76,
    paddingHorizontal: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.pill,
  },
  weightInput: {
    minWidth: 28,
    padding: 0,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
