// app/onboarding/first-win.tsx
// Log your first exercise - same background/heading as sport-selection, single exercise square by sport type
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { FirstExerciseData, useOnboardingData } from '../../providers/OnboardingDataContext';
import { useSettings } from '../../providers/SettingsContext';

const TOTAL_STEPS = 7;
const CURRENT_STEP = 3;

// Sport → square type (same as workout tab)
type FirstWinKind = 'exercise' | 'bb_shot' | 'bs_hit' | 'sc_drill' | 'hk_shoot' | 'tn_drill';
const SPORT_TO_KIND: Record<string, FirstWinKind> = {
  workout: 'exercise',
  lifting: 'exercise',
  basketball: 'bb_shot',
  football: 'exercise',
  baseball: 'bs_hit',
  soccer: 'sc_drill',
  hockey: 'hk_shoot',
  tennis: 'tn_drill',
};

type SetRecord = Record<string, string>;

const FIELD_SETS: Record<FirstWinKind, { key: string; label: string; numeric?: boolean }[]> = {
  exercise: [
    { key: 'reps', label: 'Reps', numeric: true },
    { key: 'weight', label: 'Weight (lb)', numeric: true },
  ],
  bb_shot: [
    { key: 'attempted', label: 'Attempted', numeric: true },
    { key: 'made', label: 'Made', numeric: true },
  ],
  bs_hit: [
    { key: 'reps', label: 'Reps', numeric: true },
    { key: 'avgDistance', label: 'Avg. Distance (ft)', numeric: true },
  ],
  sc_drill: [
    { key: 'reps', label: 'Reps', numeric: true },
    { key: 'time', label: 'Time (min)', numeric: true },
  ],
  hk_shoot: [
    { key: 'attempted', label: 'Attempted', numeric: true },
    { key: 'made', label: 'Made', numeric: true },
  ],
  tn_drill: [
    { key: 'reps', label: 'Reps', numeric: true },
    { key: 'time', label: 'Time (min)', numeric: true },
  ],
};

function getTypeLabel(kind: FirstWinKind): string {
  if (kind === 'exercise') return 'Exercise';
  if (kind === 'bb_shot' || kind === 'hk_shoot') return 'Shooting';
  if (kind === 'bs_hit') return 'Hitting';
  if (kind === 'sc_drill' || kind === 'tn_drill') return 'Drill';
  return 'Exercise';
}

function getHeaderGradientColors(kind: FirstWinKind): readonly [string, string, string] {
  if (kind === 'exercise') {
    return ['rgba(90, 166, 255, 0.3)', 'rgba(90, 166, 255, 0.1)', 'transparent'];
  }
  if (kind === 'bb_shot' || kind === 'hk_shoot') {
    return ['rgba(100, 200, 120, 0.3)', 'rgba(100, 200, 120, 0.1)', 'transparent'];
  }
  if (kind === 'bs_hit') {
    return ['rgba(180, 140, 255, 0.3)', 'rgba(180, 140, 255, 0.1)', 'transparent'];
  }
  return ['rgba(180, 140, 255, 0.3)', 'rgba(180, 140, 255, 0.1)', 'transparent'];
}

function formatSetDisplay(set: SetRecord, fields: { key: string; label: string }[]): string {
  const parts = fields.map(f => {
    const v = set[f.key];
    return v && v.trim() ? `${f.label}: ${v}` : null;
  }).filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : 'Tap to add';
}

export default function FirstWinScreen() {
  const insets = useSafeAreaInsets();
  const { data: onboardingData, setFirstExercise } = useOnboardingData();
  const { unitsWeight } = useSettings();

  const sport = onboardingData.primarySport || 'workout';
  const kind = SPORT_TO_KIND[sport] || 'exercise';
  const baseFields = FIELD_SETS[kind];
  const fields = useMemo(() => {
    return baseFields.map(f =>
      f.key === 'weight'
        ? { ...f, label: `Weight (${unitsWeight === 'kg' ? 'kg' : 'lb'})` }
        : f
    );
  }, [baseFields, unitsWeight]);

  const [exerciseName, setExerciseName] = useState('');
  const [setData, setSetData] = useState<SetRecord>(() => {
    const empty: SetRecord = {};
    baseFields.forEach(f => (empty[f.key] = ''));
    return empty;
  });
  const [editingSet, setEditingSet] = useState(false);
  const [showNameHint, setShowNameHint] = useState(true);

  const isFormValid = useMemo(() => {
    if (!exerciseName.trim()) return false;
    const f0 = fields[0];
    const f1 = fields[1];
    if (!f0 || !f1) return false;
    const v0 = (setData[f0.key] ?? '').trim();
    const v1 = (setData[f1.key] ?? '').trim();
    if (!v0 || !v1) return false;
    if (f0.numeric && isNaN(parseFloat(v0))) return false;
    if (f1.numeric && isNaN(parseFloat(v1))) return false;
    return true;
  }, [exerciseName, setData, fields]);

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const handleNext = () => {
    if (!isFormValid) return;
    const f0 = fields[0];
    const f1 = fields[1];
    if (!f0 || !f1) return;
    const exerciseData: FirstExerciseData = {
      name: exerciseName.trim(),
      kind,
      mode: sport,
      field1: f0.key,
      field2: f1.key,
      value1: parseFloat(setData[f0.key] ?? '0') || 0,
      value2: parseFloat(setData[f1.key] ?? '0') || 0,
      label1: f0.label,
      label2: f1.label,
    };
    setFirstExercise(exerciseData);
    router.push('/onboarding/visualization');
  };

  const typeLabel = getTypeLabel(kind);
  const headerGradientColors = getHeaderGradientColors(kind);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.touchableChild}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Same background as sport-selection */}
          <View style={styles.background} />

        {/* Header - same as sport-selection */}
        <View style={[styles.header, { zIndex: 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{CURRENT_STEP}/{TOTAL_STEPS}</Text>
          </View>
        </View>

        {/* Content - same heading style as sport-selection */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Log your first exercise</Text>

          {/* Single exercise square (workout-tab style) */}
          <View style={styles.card}>
            <LinearGradient
              colors={headerGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardHeaderStrip}
            >
              <View style={styles.cardHeaderContent}>
                <TextInput
                  value={exerciseName}
                  onChangeText={setExerciseName}
                  placeholder={typeLabel}
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  style={styles.cardHeaderText}
                />
              </View>
            </LinearGradient>
            <View style={styles.setsListContainer}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEditingSet(true);
                }}
                style={({ pressed }) => [styles.setRow, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.setRowContent}>
                  <Text style={styles.setRowLabel}>Set 1</Text>
                  <Text style={styles.setRowValue}>{formatSetDisplay(setData, fields)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.4)" />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Next button - same as sport-selection (white / frosted) */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              isFormValid && styles.nextButtonEnabled,
              !isFormValid && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            {!isFormValid && (
              <>
                <BlurView intensity={Platform.OS === 'ios' ? 32 : 24} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </>
            )}
            <Text style={[styles.nextButtonText, !isFormValid && styles.nextButtonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
        </View>

        {/* Name hint overlay: dimmed screen + small glass card, tap anywhere to dismiss */}
        {showNameHint && (
          <Pressable
            style={styles.hintOverlay}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNameHint(false);
            }}
          >
            <View style={styles.hintCardWrapper}>
              <View style={styles.hintCard}>
                <BlurView
                  intensity={Platform.OS === 'ios' ? 36 : 28}
                  tint="dark"
                  style={styles.hintCardBlur}
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <Text style={styles.hintCardArrow}>^</Text>
                <Text style={styles.hintCardText}>Name your exercise here</Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Set editor bottom sheet */}
        {editingSet && (
          <SetEditorBottomSheet
          set={setData}
          fields={fields}
          onSave={(updated) => {
            setSetData(updated);
            setEditingSet(false);
          }}
          onClose={() => setEditingSet(false)}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

function SetEditorBottomSheet({
  set,
  fields,
  onSave,
  onClose,
}: {
  set: SetRecord;
  fields: { key: string; label: string; numeric?: boolean }[];
  onSave: (updated: SetRecord) => void;
  onClose: () => void;
}) {
  const [localSet, setLocalSet] = useState<SetRecord>({ ...set });
  const insets = useSafeAreaInsets();

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(localSet);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.bottomSheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.bottomSheetHandle} />
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Edit Set</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.textHi} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.bottomSheetScrollView}
              contentContainerStyle={styles.bottomSheetContent}
              keyboardShouldPersistTaps="handled"
            >
              {fields.map(f => (
                <View key={f.key} style={styles.bottomSheetField}>
                  <Text style={styles.bottomSheetFieldLabel}>{f.label}</Text>
                  <TextInput
                    value={localSet[f.key] ?? ''}
                    onChangeText={t => {
                      setLocalSet(prev => ({
                        ...prev,
                        [f.key]: f.numeric ? t.replace(/[^\d.]/g, '') : t,
                      }));
                    }}
                    placeholder={`Enter ${f.label.toLowerCase()}`}
                    placeholderTextColor={theme.colors.textLo}
                    keyboardType={f.numeric ? 'numeric' : 'default'}
                    style={styles.bottomSheetInput}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.bottomSheetFooter}>
              <Pressable onPress={handleSave} style={styles.bottomSheetSaveButton}>
                <Text style={styles.bottomSheetSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  touchableChild: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.strokeSoft,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary600,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLo,
    minWidth: 30,
    textAlign: 'right',
  },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
    marginBottom: 28,
    letterSpacing: -0.3,
  },
  /* Card - match workout tab */
  card: {
    backgroundColor: 'rgba(10, 14, 16, 0.55)',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
    width: '100%',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  cardHeaderStrip: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderContent: { flex: 1 },
  cardHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  setsListContainer: {
    padding: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  setRowContent: { flex: 1, gap: 4 },
  setRowLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  setRowValue: {
    color: theme.colors.textHi,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  nextButtonEnabled: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  nextButtonDisabled: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nextButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
  },
  nextButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  /* Name hint overlay + card (sport-selection glass style) */
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 270,
    paddingHorizontal: 24,
  },
  hintCardWrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginLeft: -116,
  },
  hintCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 200,
    maxWidth: 280,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  hintCardBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  hintCardArrow: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 4,
    zIndex: 1,
  },
  hintCardText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
  /* Bottom sheet */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -8 },
      },
      android: { elevation: 20 },
    }),
  },
  bottomSheetScrollView: { maxHeight: 400 },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  bottomSheetTitle: {
    color: theme.colors.textHi,
    fontSize: 22,
    fontWeight: '700',
  },
  bottomSheetContent: { gap: 20, paddingBottom: 24, paddingTop: 8 },
  bottomSheetField: { gap: 8 },
  bottomSheetFieldLabel: {
    color: theme.colors.textLo,
    fontSize: 13,
  },
  bottomSheetInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: theme.colors.textHi,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomSheetFooter: { paddingTop: 16 },
  bottomSheetSaveButton: {
    backgroundColor: theme.colors.primary600,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomSheetSaveText: {
    color: '#052d1b',
    fontSize: 16,
    fontWeight: '700',
  },
});
