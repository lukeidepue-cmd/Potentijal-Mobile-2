// app/(tabs)/(home)/schedule-week.tsx
// Screen for editing weekly schedule (current week and next week)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useMode } from '../../../providers/ModeContext';
import {
  getWeeklySchedule,
  upsertWeeklySchedule,
  getCurrentWeekStart,
  getNextWeekStart,
  type ScheduleItem,
} from '../../../lib/api/schedule';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekDates(weekStart: string): Date[] {
  const start = new Date(weekStart);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function ScheduleWeekScreen() {
  const { mode } = useMode();
  const m = (mode || 'lifting').toLowerCase();
  
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<ScheduleItem[]>([]);
  const [nextWeekSchedule, setNextWeekSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentWeekStart = getCurrentWeekStart();
  const nextWeekStart = getNextWeekStart();
  const currentWeekDates = getWeekDates(currentWeekStart);
  const nextWeekDates = getWeekDates(nextWeekStart);

  useEffect(() => {
    loadSchedules();
  }, [m]);

  const loadSchedules = async () => {
    setLoading(true);
    
    const [currentResult, nextResult] = await Promise.all([
      getWeeklySchedule({ mode: m, weekStartDate: currentWeekStart }),
      getWeeklySchedule({ mode: m, weekStartDate: nextWeekStart }),
    ]);

    if (currentResult.data) {
      setCurrentWeekSchedule(currentResult.data);
    } else {
      // Initialize empty schedule
      setCurrentWeekSchedule(
        Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, label: null }))
      );
    }

    if (nextResult.data) {
      setNextWeekSchedule(nextResult.data);
    } else {
      // Initialize empty schedule
      setNextWeekSchedule(
        Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, label: null }))
      );
    }

    setLoading(false);
  };

  const updateCurrentWeekLabel = (dayIndex: number, label: string) => {
    setCurrentWeekSchedule((prev) =>
      prev.map((item) =>
        item.dayIndex === dayIndex ? { ...item, label: label || null } : item
      )
    );
  };

  const updateNextWeekLabel = (dayIndex: number, label: string) => {
    setNextWeekSchedule((prev) =>
      prev.map((item) =>
        item.dayIndex === dayIndex ? { ...item, label: label || null } : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);

    const [currentError, nextError] = await Promise.all([
      upsertWeeklySchedule({
        mode: m,
        weekStartDate: currentWeekStart,
        items: currentWeekSchedule,
      }),
      upsertWeeklySchedule({
        mode: m,
        weekStartDate: nextWeekStart,
        items: nextWeekSchedule,
      }),
    ]);

    setSaving(false);

    if (currentError.error || nextError.error) {
      Alert.alert('Error', 'Failed to save schedule. Please try again.');
      return;
    }

    Alert.alert('Success', 'Schedule saved!', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Schedule Week</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Schedule Week</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Current Week */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textHi }]}>Current Week</Text>
          {currentWeekDates.map((date, idx) => (
            <View key={idx} style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Text style={[styles.dayName, { color: theme.colors.textHi }]}>
                  {DAY_NAMES[idx]}
                </Text>
                <Text style={[styles.dayDate, { color: theme.colors.textLo }]}>
                  {formatDate(date)}
                </Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.bg1, color: theme.colors.textHi }]}
                placeholder="e.g. Leg Day, Rest"
                placeholderTextColor={theme.colors.textLo}
                value={currentWeekSchedule[idx]?.label || ''}
                onChangeText={(text) => updateCurrentWeekLabel(idx, text)}
                autoCorrect={false}
                autoCapitalize="words"
                keyboardType="default"
                returnKeyType="done"
                multiline={false}
              />
            </View>
          ))}
        </View>

        {/* Next Week */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textHi }]}>Next Week</Text>
          {nextWeekDates.map((date, idx) => (
            <View key={idx} style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Text style={[styles.dayName, { color: theme.colors.textHi }]}>
                  {DAY_NAMES[idx]}
                </Text>
                <Text style={[styles.dayDate, { color: theme.colors.textLo }]}>
                  {formatDate(date)}
                </Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.bg1, color: theme.colors.textHi }]}
                placeholder="e.g. Leg Day, Rest"
                placeholderTextColor={theme.colors.textLo}
                value={nextWeekSchedule[idx]?.label || ''}
                onChangeText={(text) => updateNextWeekLabel(idx, text)}
                autoCorrect={false}
                autoCapitalize="words"
                keyboardType="default"
                returnKeyType="done"
                multiline={false}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: theme.colors.bg0, borderTopColor: theme.colors.bg1 }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Schedule</Text>
          )}
        </Pressable>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
    paddingBottom: 100,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  dayInfo: {
    width: 100,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayDate: {
    fontSize: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});


