import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '../lib/i18n';
import { updateRepsRecord } from '../lib/storage';
import { useAccentColors } from '../lib/ThemeContext';
import { Exercise, RepsRecord, RepsSet } from '../lib/types';
import { buttonShadowShape, fontSize, radius, spacing } from '../theme';
import Text from './AppText';
import SetListEditor from './SetListEditor';

type Props = {
  exercise: Exercise;
  record: RepsRecord;
  onSaved: (next: RepsRecord) => void;
};

// 측정 화면(RepsScreen)과 같은 SetListEditor로 오늘 저장된 기록의 세트를 편집한다. 라이브 측정과
// 달리 즉시 반영하지 않고, 로컬 편집 버퍼를 두었다가 "저장"을 눌러야 한 번에 반영한다 — 측정
// 화면이 원래 쓰던 "여러 세트를 편집하다 한 번에 저장" 패턴을 그대로 재사용한다.
export default function EditRepsRecordSheetContent({ exercise, record, onSaved }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [sets, setSets] = useState<RepsSet[]>(record.sets);
  const [currentReps, setCurrentReps] = useState(1);
  const [currentWeightText, setCurrentWeightText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = () => {
    if (currentReps < 1) {
      setError(t.reps.errorMinReps);
      return;
    }
    setError('');
    const nextSet: RepsSet = {
      reps: currentReps,
      weight: exercise.usesWeight ? parseFloat(currentWeightText) || 0 : undefined,
    };
    if (editingIndex != null) {
      const index = editingIndex;
      setSets((prev) => prev.map((s, i) => (i === index ? nextSet : s)));
      setEditingIndex(null);
    } else {
      setSets((prev) => [...prev, nextSet]);
    }
  };

  const handleStartEdit = (index: number) => {
    const set = sets[index];
    setEditingIndex(index);
    setCurrentReps(set.reps);
    setCurrentWeightText(set.weight != null ? String(set.weight) : '');
  };

  const handleRemove = (index: number) => {
    setSets((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentReps(1);
      setCurrentWeightText('');
    } else if (editingIndex != null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (sets.length === 0) {
      setError(t.reps.errorNoSets);
      return;
    }
    setSaving(true);
    await updateRepsRecord(exercise.id, record.id, { sets });
    setSaving(false);
    onSaved({ ...record, sets });
  };

  return (
    <View style={styles.container}>
      <SetListEditor
        exercise={exercise}
        sets={sets}
        currentReps={currentReps}
        currentWeightText={currentWeightText}
        editingIndex={editingIndex}
        error={error}
        onRepsChange={setCurrentReps}
        onWeightTextChange={setCurrentWeightText}
        onConfirm={handleConfirm}
        onStartEdit={handleStartEdit}
        onRemove={handleRemove}
      />
      <Pressable
        style={[
          styles.saveButton,
          { backgroundColor: accent.primary, ...buttonShadowShape, shadowColor: accent.primary },
          saving && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={[styles.saveButtonText, { color: accent.onPrimary }]}>
          {t.reps.saveConfirmButton}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  saveButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
