// app/(tabs)/(home)/add-weekly-goal.tsx
// Screen for adding a new weekly goal
import React, { useState } from 'react';
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
import { createWeeklyGoal } from '../../../lib/api/goals';

export default function AddWeeklyGoalScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [goalName, setGoalName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!goalName.trim()) {
      Alert.alert('Error', 'Please enter a goal name.');
      return;
    }

    const target = parseFloat(targetValue);
    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Please enter a valid target number.');
      return;
    }

    setSaving(true);
    const { data, error } = await createWeeklyGoal({
      mode: mode || 'basketball',
      name: goalName.trim(),
      targetValue: target,
    });

    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to create goal. Please try again.');
      return;
    }

    Alert.alert('Success', 'Goal created!', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Add Weekly Goal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textHi }]}>Goal Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.bg1, color: theme.colors.textHi }]}
            placeholder="e.g. 3 pointers made"
            placeholderTextColor={theme.colors.textLo}
            value={goalName}
            onChangeText={setGoalName}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textHi }]}>Target Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.bg1, color: theme.colors.textHi }]}
            placeholder="e.g. 100"
            placeholderTextColor={theme.colors.textLo}
            value={targetValue}
            onChangeText={setTargetValue}
            keyboardType="numeric"
          />
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
            <Text style={styles.saveButtonText}>Save Goal</Text>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 24,
    paddingBottom: 100,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
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


