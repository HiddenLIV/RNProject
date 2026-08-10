import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import Text from '../components/AppText';
import ExerciseIcon from '../components/ExerciseIcon';
import MeasureTypeTag from '../components/MeasureTypeTag';
import OutlinedTextField from '../components/OutlinedTextField';
import YoutubeSearchButton from '../components/YoutubeSearchButton';
import {
  CUSTOM_EXERCISE_ICON,
  EXERCISE_NAME_MAX_LENGTH,
  getExerciseDisplayName,
  hasPresetKey,
  ICON_CHOICES,
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
  sharedVideoLink?: string;
  onConsumeSharedVideoLink?: () => void;
};

export default function AddExerciseScreen({ onBack, onCreated, sharedVideoLink, onConsumeSharedVideoLink }: Props) {
  const accent = useAccentColors();
  const t = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const videoLinkFocusedRef = useRef(false);
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
  const [presetsExpanded, setPresetsExpanded] = useState(true);

  useEffect(() => {
    getExercises().then((exercises) => {
      setExistingExercises(exercises);
      setNamesLoaded(true);
    });
  }, []);

  useEffect(() => {
    // 맨 아래 있는 유튜브 링크 인풋에 포커스가 가 있는 동안만, 키보드가 다 올라와
    // 뷰포트 리사이즈가 끝난 뒤(포커스 시점엔 아직 안 끝나 있어 바로 스크롤하면 위치가 어긋난다)
    // 화면을 끝까지 내려 인풋이 키보드에 가리지 않게 한다. 이름 인풋 등 위쪽 필드는 대상 아님.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const subscription = Keyboard.addListener(showEvent, () => {
      if (videoLinkFocusedRef.current) {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // 유튜브 등에서 공유받은 링크 — 이미 뭔가 입력돼 있으면 덮어쓰지 않는다. 채우고 나면
    // 바로 소비 처리해서, 뒤로 갔다가 다시 들어와도 같은 링크가 또 채워지지 않게 한다.
    if (sharedVideoLink && !videoLinkText) {
      setVideoLinkText(sharedVideoLink);
      setError('');
      onConsumeSharedVideoLink?.();
    }
  }, [sharedVideoLink, videoLinkText, onConsumeSharedVideoLink]);

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
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8} accessibilityLabel={t.common.back}>
          <Ionicons name="chevron-back" size={26} color={accent.primaryText} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: accent.text }]}>{t.addExercise.headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {availablePresets.length > 0 && (
            <View style={styles.section}>
              <Pressable
                style={styles.presetToggle}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setPresetsExpanded((v) => !v);
                }}
              >
                <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.addExercise.presetSectionLabel}</Text>
                <Ionicons
                  name={presetsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={accent.textMuted}
                />
              </Pressable>
              {presetsExpanded && (
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
                        <View
                          style={[
                            styles.presetIconBadge,
                            selected
                              ? { backgroundColor: accent.primary, borderColor: accent.primary }
                              : { backgroundColor: 'transparent', borderColor: accent.primary },
                          ]}
                        >
                          <Ionicons name={preset.icon} size={17} color={selected ? accent.onPrimary : accent.primary} />
                        </View>
                        <Text style={[styles.presetName, { color: accent.text }, selected && { color: accent.accent }]}>
                          {presetName}
                        </Text>
                        <MeasureTypeTag measureType={preset.measureType} tone={selected ? 'onChip' : undefined} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: accent.textMuted }]}>{t.addExercise.customSectionLabel}</Text>
            <OutlinedTextField
              label={t.addExercise.namePlaceholder}
              backgroundColor={accent.background}
              value={name}
              onChangeText={handleNameChange}
              maxLength={EXERCISE_NAME_MAX_LENGTH}
            />
            <View style={styles.iconGrid}>
              {ICON_CHOICES.map((choice) => {
                const selected = icon === choice;
                return (
                  <Pressable
                    key={choice}
                    style={[
                      styles.iconChoice,
                      selected
                        ? { backgroundColor: accent.primary, borderColor: accent.primary }
                        : { backgroundColor: 'transparent', borderColor: accent.primary },
                    ]}
                    onPress={() => setIcon(choice)}
                    accessibilityLabel={t.addExercise.iconChoiceAccessibility}
                  >
                    <ExerciseIcon icon={choice} size={20} color={selected ? accent.onPrimary : accent.primary} />
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
                onPress={() => {
                  setMeasureType('reps');
                  setUsesWeight(true); // 횟수·세트를 직접 고르면 무게 기록을 기본으로 켠다
                }}
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
            <YoutubeSearchButton exerciseName={name} />
            <OutlinedTextField
              label={t.addExercise.videoLinkPlaceholder}
              backgroundColor={accent.background}
              value={videoLinkText}
              onChangeText={(text) => {
                setVideoLinkText(text);
                setError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onFocus={() => {
                videoLinkFocusedRef.current = true;
                // 다른 인풋(이름 등)에서 이미 키보드가 떠 있는 상태로 여기로 포커스만 옮기면
                // 키보드 show/hide 전환이 없어 keyboardDidShow가 안 터진다 — 그 경우를 위해
                // 포커스 시점에도 한 번 스크롤한다(키보드가 새로 올라오는 경우엔 이 호출이
                // 리사이즈 전이라 부족해도, 뒤이은 keyboardDidShow가 다시 보정해준다).
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
              onBlur={() => {
                videoLinkFocusedRef.current = false;
              }}
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoider: {
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
  presetToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '700',
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
    borderWidth: 1.5,
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
