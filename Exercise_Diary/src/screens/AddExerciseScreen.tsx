import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MeasureTypeTag from '../components/MeasureTypeTag';
import {
  CUSTOM_EXERCISE_ICON,
  CUSTOM_ICON_CHOICES,
  EXERCISE_NAME_MAX_LENGTH,
  getExerciseDisplayName,
  hasPresetKey,
  PRESET_EXERCISES,
} from '../lib/exercisePresets';
import { useTranslation } from '../lib/i18n';
import { useAccentColors } from '../lib/ThemeContext';
import { addExercise, createId, getExercises } from '../lib/storage';
import { Exercise, MeasureType } from '../lib/types';
import { extractYoutubeVideoId } from '../lib/youtube';
import { fontSize, radius, spacing } from '../theme';

type Props = {
  onBack: () => void;
  onCreated: () => void;
};

export default function AddExerciseScreen({ onBack, onCreated }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const [existingExercises, setExistingExercises] = useState<Exercise[]>([]);
  const [namesLoaded, setNamesLoaded] = useState(false);
  const [name, setName] = useState('');
  const [selectedPresetKey, setSelectedPresetKey] = useState<Exercise['presetKey'] | null>(null);
  const [icon, setIcon] = useState<Exercise['icon']>(CUSTOM_EXERCISE_ICON);
  const [measureType, setMeasureType] = useState<MeasureType>('time');
  const [usesWeight, setUsesWeight] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [videoLinkText, setVideoLinkText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExercises().then((exercises) => {
      setExistingExercises(exercises);
      setNamesLoaded(true);
    });
  }, []);

  const normalizedExistingNames = existingExercises.map((e) => getExerciseDisplayName(e, t).toLocaleLowerCase());
  // 목록을 아직 못 읽어온 동안은 아무 프리셋도 보여주지 않는다 — 이미 있는 운동(매달리기 등)이
  // 잠깐 노출됐다가 사라지는 깜빡임과, 그 틈에 중복 생성되는 것을 함께 막는다.
  const availablePresets = namesLoaded
    ? PRESET_EXERCISES.filter((p) => !hasPresetKey(existingExercises, p.key))
    : [];

  const selectPreset = (preset: (typeof PRESET_EXERCISES)[number]) => {
    setName(t.exercisePresets[preset.key]);
    setSelectedPresetKey(preset.key);
    setIcon(preset.icon);
    setMeasureType(preset.measureType);
    setUsesWeight(preset.usesWeight ?? false);
    setError('');
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setSelectedPresetKey(null);
    setError('');
  };

  const handleAdd = async () => {
    if (!namesLoaded || saving) return; // 기존 운동 목록을 아직 못 읽어온 상태 + 저장 중 연타 방지
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.addExercise.errorNameRequired);
      return;
    }
    if (trimmed.length > EXERCISE_NAME_MAX_LENGTH) {
      setError(t.addExercise.errorNameTooLong(EXERCISE_NAME_MAX_LENGTH));
      return;
    }
    if (normalizedExistingNames.includes(trimmed.toLocaleLowerCase())) {
      setError(t.addExercise.errorDuplicateName);
      return;
    }
    const trimmedLink = videoLinkText.trim();
    let guideVideoId: string | undefined;
    if (trimmedLink) {
      const id = extractYoutubeVideoId(trimmedLink);
      if (!id) {
        setError(t.addExercise.errorInvalidVideoLink);
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
      presetKey: selectedPresetKey ?? undefined,
      ...(measureType === 'reps' ? { usesWeight, weightUnit: usesWeight ? weightUnit : undefined } : {}),
    };
    await addExercise(exercise);
    onCreated();
  };

  // 세그먼트 버튼(측정 방식·무게 단위)이 공통으로 쓰는 선택 상태 색
  const segmentSelectedStyle = { backgroundColor: accent.primary, borderColor: accent.primary };

  return (
    <View style={[styles.container, { backgroundColor: accent.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={accent.primaryText} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: accent.text }]}>{t.addExercise.headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {availablePresets.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.addExercise.presetSectionLabel}</Text>
            <View style={[styles.presetSheet, { backgroundColor: accent.card, borderColor: accent.border }]}>
              {availablePresets.map((preset, index) => {
                const selected = selectedPresetKey === preset.key;
                const presetName = t.exercisePresets[preset.key];
                return (
                  <Pressable
                    key={preset.key}
                    style={[
                      styles.presetRow,
                      index > 0 && { borderTopWidth: 1, borderTopColor: accent.border },
                      selected && { backgroundColor: accent.primarySoft },
                    ]}
                    onPress={() => selectPreset(preset)}
                  >
                    <Text style={[styles.presetIndex, { color: accent.textFaint }, selected && { color: accent.accent }]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <View style={[styles.presetIconBadge, { backgroundColor: selected ? accent.primary : accent.primarySoft }]}>
                      <Ionicons name={preset.icon} size={17} color={selected ? accent.onPrimary : accent.primary} />
                    </View>
                    <Text style={[styles.presetName, { color: accent.text }, selected && { color: accent.accent }]}>
                      {presetName}
                    </Text>
                    <MeasureTypeTag measureType={preset.measureType} tone={selected ? 'onChip' : undefined} />
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selected ? accent.primary : accent.border}
                      style={styles.presetCheck}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.addExercise.customSectionLabel}</Text>
          <TextInput
            style={[styles.nameInput, { borderColor: accent.border, color: accent.text, backgroundColor: accent.card }]}
            value={name}
            onChangeText={handleNameChange}
            placeholder={t.addExercise.namePlaceholder}
            placeholderTextColor={accent.textFaint}
            maxLength={EXERCISE_NAME_MAX_LENGTH}
          />
          <View style={styles.iconGrid}>
            {CUSTOM_ICON_CHOICES.map((choice) => {
              const selected = icon === choice;
              return (
                <Pressable
                  key={choice}
                  style={[styles.iconChoice, { backgroundColor: selected ? accent.primary : accent.primarySoft }]}
                  onPress={() => setIcon(choice)}
                  accessibilityLabel={t.addExercise.iconChoiceAccessibility}
                >
                  <Ionicons name={choice} size={20} color={selected ? accent.onPrimary : accent.primary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.addExercise.measureTypeSectionLabel}</Text>
          <View style={styles.segmentRow}>
            <Pressable
              style={[
                styles.segment,
                { borderColor: accent.border, backgroundColor: accent.background },
                measureType === 'time' && segmentSelectedStyle,
              ]}
              onPress={() => setMeasureType('time')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: accent.textMuted },
                  measureType === 'time' && { color: accent.onPrimary },
                ]}
              >
                {t.measureType.time}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segment,
                { borderColor: accent.border, backgroundColor: accent.background },
                measureType === 'reps' && segmentSelectedStyle,
              ]}
              onPress={() => setMeasureType('reps')}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: accent.textMuted },
                  measureType === 'reps' && { color: accent.onPrimary },
                ]}
              >
                {t.measureType.reps}
              </Text>
            </Pressable>
          </View>
        </View>

        {measureType === 'reps' && (
          <View style={styles.section}>
            <View style={styles.weightRow}>
              <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.addExercise.weightSectionLabel}</Text>
              <Switch
                value={usesWeight}
                onValueChange={setUsesWeight}
                trackColor={{ true: accent.primary, false: accent.border }}
              />
            </View>
            {usesWeight && (
              <View style={styles.segmentRow}>
                <Pressable
                  style={[
                    styles.segment,
                    { borderColor: accent.border, backgroundColor: accent.background },
                    weightUnit === 'kg' && segmentSelectedStyle,
                  ]}
                  onPress={() => setWeightUnit('kg')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: accent.textMuted },
                      weightUnit === 'kg' && { color: accent.onPrimary },
                    ]}
                  >
                    {t.units.kg}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.segment,
                    { borderColor: accent.border, backgroundColor: accent.background },
                    weightUnit === 'lb' && segmentSelectedStyle,
                  ]}
                  onPress={() => setWeightUnit('lb')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: accent.textMuted },
                      weightUnit === 'lb' && { color: accent.onPrimary },
                    ]}
                  >
                    {t.units.lb}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.addExercise.videoLinkSectionLabel}</Text>
          <TextInput
            style={[styles.nameInput, { borderColor: accent.border, color: accent.text, backgroundColor: accent.card }]}
            value={videoLinkText}
            onChangeText={(text) => {
              setVideoLinkText(text);
              setError('');
            }}
            placeholder={t.addExercise.videoLinkPlaceholder}
            placeholderTextColor={accent.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {error !== '' && <Text style={[styles.error, { color: accent.danger }]}>{error}</Text>}

        <Pressable
          style={[styles.addButton, { backgroundColor: accent.primary }, saving && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={saving}
        >
          <Text style={[styles.addButtonText, { color: accent.onPrimary }]}>{t.addExercise.addButton}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  presetSheet: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
  },
  presetIndex: {
    width: 20,
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  presetIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  presetCheck: {
    marginLeft: 2,
  },
  nameInput: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.smd,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.base,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  segmentText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  error: {
    fontSize: fontSize.sm,
  },
  addButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
