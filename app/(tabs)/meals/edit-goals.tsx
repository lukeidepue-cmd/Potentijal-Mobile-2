// app/(tabs)/meals/edit-goals.tsx
// Screen for editing macro goals

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { useMeals } from '../../../providers/MealsContext';
import type { MacroGoals } from '../../../lib/api/meals';

export default function EditMacroGoalsScreen() {
  const { macroGoals, loadMacroGoals, updateMacroGoals } = useMeals();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [goals, setGoals] = useState<MacroGoals>({
    calories: 2500,
    protein: 150,
    carbs: 400,
    fats: 100,
    sugar: 80,
    sodium: 2000,
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    await loadMacroGoals();
    if (macroGoals) {
      setGoals(macroGoals);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMacroGoals(goals);
      Alert.alert('Success', 'Macro goals updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update macro goals.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Edit Macro Goals</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  const macroFields: Array<{ key: keyof MacroGoals; label: string; unit: string; convertToDisplay?: (v: number) => number; convertFromDisplay?: (v: number) => number }> = [
    { key: 'calories', label: 'Calories', unit: 'kcal' },
    { key: 'protein', label: 'Protein', unit: 'g' },
    { key: 'carbs', label: 'Carbs', unit: 'g' },
    { key: 'fats', label: 'Fats', unit: 'g' },
    { key: 'sugar', label: 'Sugar', unit: 'g' },
    { key: 'sodium', label: 'Sodium', unit: 'mg', convertToDisplay: (v) => v * 1000, convertFromDisplay: (v) => v / 1000 }, // DB stores grams, UI shows mg
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg0 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textHi }]}>Edit Macro Goals</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {macroFields.map((field) => {
          const displayValue = field.convertToDisplay 
            ? field.convertToDisplay(goals[field.key])
            : goals[field.key];
          
          return (
            <View key={field.key} style={styles.inputRow}>
              <View style={styles.labelContainer}>
                <Text style={[styles.label, { color: theme.colors.textHi }]}>{field.label}</Text>
                <Text style={[styles.unit, { color: theme.colors.textLo }]}>{field.unit}</Text>
              </View>
              <TextInput
                value={String(Math.round(displayValue))}
                onChangeText={(text) => {
                  const num = Number(text.replace(/[^\d]/g, ''));
                  if (!isNaN(num)) {
                    const dbValue = field.convertFromDisplay 
                      ? field.convertFromDisplay(num)
                      : num;
                    setGoals({ ...goals, [field.key]: dbValue });
                  }
                }}
                keyboardType="numeric"
                style={[styles.input, { 
                  backgroundColor: theme.colors.bg1, 
                  color: theme.colors.textHi,
                  borderColor: theme.colors.bg2,
                }]}
                placeholderTextColor={theme.colors.textLo}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.bg0, borderTopColor: theme.colors.bg1 }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.saveButtonText, { color: '#fff' }]}>Save Goals</Text>
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
    gap: 20,
  },
  inputRow: {
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  unit: {
    fontSize: 14,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '600',
  },
});

