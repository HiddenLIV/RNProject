import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MeasureTypeTag from '../components/MeasureTypeTag';
import { CUSTOM_EXERCISE_ICON, CUSTOM_ICON_CHOICES, EXERCISE_NAME_MAX_LENGTH, PRESET_EXERCISES } from '../lib/exercisePresets';
import { addExercise, createId, getExercises } from '../lib/storage';
import { Exercise, MeasureType } from '../lib/types';
import { extractYoutubeVideoId } from '../lib/youtube';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  onBack: () => void;
  onCreated: () => void;
};

export default function AddExerciseScreen({ onBack, onCreated }: Props) {
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [namesLoaded, setNamesLoaded] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<Exercise['icon']>(CUSTOM_EXERCISE_ICON);
  const [measureType, setMeasureType] = useState<MeasureType>('time');
  const [usesWeight, setUsesWeight] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [videoLinkText, setVideoLinkText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExercises().then((exercises) => {
      setExistingNames(exercises.map((e) => e.name));
      setNamesLoaded(true);
    });
  }, []);

  const normalizedExistingNames = existingNames.map((n) => n.toLocaleLowerCase());
  // 목록을 아직 못 읽어온 동안은 아무 프리셋도 보여주지 않는다 — 이미 있는 운동(매달리기 등)이
  // 잠깐 노출됐다가 사라지는 깜빡임과, 그 틈에 중복 생성되는 것을 함께 막는다.
  const availablePresets = namesLoaded
    ? PRESET_EXERCISES.filter((p) => !normalizedExistingNames.includes(p.name.toLocaleLowerCase()))
    : [];

  const selectPreset = (preset: (typeof PRESET_EXERCISES)[number]) => {
    setName(preset.name);
    setIcon(preset.icon);
    setMeasureType(preset.measureType);
    setUsesWeight(preset.usesWeight ?? false);
    setError('');
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setError('');
  };

  const handleAdd = async () => {
    if (!namesLoaded || saving) return; // 기존 운동 목록을 아직 못 읽어온 상태 + 저장 중 연타 방지
    const trimmed = name.trim();
    if (!trimmed) {
      setError('운동 이름을 입력해 주세요');
      return;
    }
    if (trimmed.length > EXERCISE_NAME_MAX_LENGTH) {
      setError(`이름은 ${EXERCISE_NAME_MAX_LENGTH}자 이내로 입력해 주세요`);
      return;
    }
    if (normalizedExistingNames.includes(trimmed.toLocaleLowerCase())) {
      setError('이미 같은 이름의 운동이 있습니다');
      return;
    }
    const trimmedLink = videoLinkText.trim();
    let guideVideoId: string | undefined;
    if (trimmedLink) {
      const id = extractYoutubeVideoId(trimmedLink);
      if (!id) {
        setError('유튜브 영상 링크 형식이 아닙니다 (watch, youtu.be, shorts 링크만 지원)');
        return;
      }
      guideVideoId = id;
    }
    setSaving(true);
    const exercise: Exercise = {
      id: createId(),
      name: trimmed,
      icon,
      measureType,
      guideVideoId,
      ...(measureType === 'reps' ? { usesWeight, weightUnit: usesWeight ? weightUnit : undefined } : {}),
    };
    await addExercise(exercise);
    onCreated();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>운동 추가</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {availablePresets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>프리셋에서 고르기</Text>
            <View style={styles.presetSheet}>
              {availablePresets.map((preset, index) => {
                const selected = name === preset.name;
                return (
                  <Pressable
                    key={preset.name}
                    style={[styles.presetRow, index > 0 && styles.presetRowDivider, selected && styles.presetRowSelected]}
                    onPress={() => selectPreset(preset)}
                  >
                    <Text style={[styles.presetIndex, selected && styles.presetIndexSelected]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <View style={[styles.presetIconBadge, selected && styles.presetIconBadgeSelected]}>
                      <Ionicons name={preset.icon} size={17} color={selected ? colors.white : colors.primary} />
                    </View>
                    <Text style={[styles.presetName, selected && styles.presetNameSelected]}>{preset.name}</Text>
                    <MeasureTypeTag measureType={preset.measureType} />
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selected ? colors.primary : colors.border}
                      style={styles.presetCheck}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>직접 입력</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={handleNameChange}
            placeholder="운동 이름"
            placeholderTextColor={colors.textFaint}
            maxLength={EXERCISE_NAME_MAX_LENGTH}
          />
          <View style={styles.iconGrid}>
            {CUSTOM_ICON_CHOICES.map((choice) => {
              const selected = icon === choice;
              return (
                <Pressable
                  key={choice}
                  style={[styles.iconChoice, selected && styles.iconChoiceSelected]}
                  onPress={() => setIcon(choice)}
                  accessibilityLabel="아이콘 선택"
                >
                  <Ionicons name={choice} size={20} color={selected ? colors.white : colors.primary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>측정 방식</Text>
          <View style={styles.segmentRow}>
            <Pressable
              style={[styles.segment, measureType === 'time' && styles.segmentSelected]}
              onPress={() => setMeasureType('time')}
            >
              <Text style={[styles.segmentText, measureType === 'time' && styles.segmentTextSelected]}>시간</Text>
            </Pressable>
            <Pressable
              style={[styles.segment, measureType === 'reps' && styles.segmentSelected]}
              onPress={() => setMeasureType('reps')}
            >
              <Text style={[styles.segmentText, measureType === 'reps' && styles.segmentTextSelected]}>
                횟수·세트
              </Text>
            </Pressable>
          </View>
        </View>

        {measureType === 'reps' && (
          <View style={styles.section}>
            <View style={styles.weightRow}>
              <Text style={styles.sectionLabel}>무게 기록 사용</Text>
              <Switch
                value={usesWeight}
                onValueChange={setUsesWeight}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
            {usesWeight && (
              <View style={styles.segmentRow}>
                <Pressable
                  style={[styles.segment, weightUnit === 'kg' && styles.segmentSelected]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text style={[styles.segmentText, weightUnit === 'kg' && styles.segmentTextSelected]}>kg</Text>
                </Pressable>
                <Pressable
                  style={[styles.segment, weightUnit === 'lb' && styles.segmentSelected]}
                  onPress={() => setWeightUnit('lb')}
                >
                  <Text style={[styles.segmentText, weightUnit === 'lb' && styles.segmentTextSelected]}>파운드</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>자세 영상 링크 (선택)</Text>
          <TextInput
            style={styles.nameInput}
            value={videoLinkText}
            onChangeText={(text) => {
              setVideoLinkText(text);
              setError('');
            }}
            placeholder="유튜브 링크 붙여넣기"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.addButton, saving && styles.addButtonDisabled]} onPress={handleAdd} disabled={saving}>
          <Text style={styles.addButtonText}>운동 추가</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textMuted,
  },
  presetSheet: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
  },
  presetRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetRowSelected: {
    backgroundColor: colors.primarySoft,
  },
  presetIndex: {
    width: 20,
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  presetIndexSelected: {
    color: colors.accent,
  },
  presetIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetIconBadgeSelected: {
    backgroundColor: colors.primary,
  },
  presetName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text,
  },
  presetNameSelected: {
    color: colors.accent,
  },
  presetCheck: {
    marginLeft: 2,
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.card,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceSelected: {
    backgroundColor: colors.primary,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentTextSelected: {
    color: colors.white,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  addButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.white,
  },
});
