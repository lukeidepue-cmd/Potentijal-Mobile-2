// app/(tabs)/settings/ai-trainer/index.tsx
// AI Trainer Settings (Premium)
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useFeatures } from "@/hooks/useFeatures";
import { getAITrainerSettings, updateAITrainerSettings, clearAIMemory } from "@/lib/api/settings";
import UpgradeModal from "@/components/UpgradeModal";

const FONT = { uiRegular: "Geist_400Regular", uiSemi: "Geist_600SemiBold", uiBold: "Geist_700Bold" };

export default function AITrainerSettings() {
  const insets = useSafeAreaInsets();
  const { isPremium, isCreator } = useFeatures();
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    personality: 'balanced' as 'strict' | 'balanced' | 'supportive',
    data_access_permissions: {
      use_workouts: true,
      use_games: true,
      use_practices: true,
    },
    persistent_memory_enabled: true,
  });

  useEffect(() => {
    if (isPremium || isCreator) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [isPremium, isCreator]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await getAITrainerSettings();
      if (data) {
        setSettings({
          enabled: data.enabled,
          personality: data.personality,
          data_access_permissions: data.data_access_permissions,
          persistent_memory_enabled: data.persistent_memory_enabled,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const updates = { [key]: value };
    const { error } = await updateAITrainerSettings(updates);
    if (error) {
      Alert.alert("Error", "Failed to update setting");
      loadSettings();
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  if (!isPremium && !isCreator) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
          </Pressable>
          <Text style={styles.headerTitle}>AI Trainer</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={theme.colors.textLo} />
          <Text style={styles.lockedText}>Premium Feature</Text>
          <Text style={styles.lockedSubtext}>Upgrade to access AI Trainer settings</Text>
          <Pressable style={styles.upgradeButton} onPress={() => setShowUpgrade(true)}>
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
        <UpgradeModal visible={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary600} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>AI Trainer</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable AI Trainer</Text>
            </View>
            <Switch value={settings.enabled} onValueChange={(v) => updateSetting('enabled', v)} trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }} thumbColor="#fff" />
          </View>
        </View>
        {settings.enabled && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personality</Text>
              {(['strict', 'balanced', 'supportive'] as const).map((personality) => (
                <Pressable key={personality} style={[styles.optionItem, settings.personality === personality && styles.optionItemSelected]} onPress={() => updateSetting('personality', personality)}>
                  <Text style={[styles.optionText, settings.personality === personality && styles.optionTextSelected]}>{personality.charAt(0).toUpperCase() + personality.slice(1)}</Text>
                  {settings.personality === personality && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary600} />}
                </Pressable>
              ))}
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Access</Text>
              {Object.entries(settings.data_access_permissions).map(([key, value]) => (
                <View key={key} style={styles.settingRow}>
                  <Text style={styles.settingLabel}>{key.replace('use_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                  <Switch value={value} onValueChange={(v) => updateSetting('data_access_permissions', { ...settings.data_access_permissions, [key]: v })} trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }} thumbColor="#fff" />
                </View>
              ))}
            </View>
            <View style={styles.section}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Persistent Memory</Text>
                  <Text style={styles.settingDescription}>AI remembers context from conversations</Text>
                </View>
                <Switch value={settings.persistent_memory_enabled} onValueChange={(v) => updateSetting('persistent_memory_enabled', v)} trackColor={{ false: theme.colors.strokeSoft, true: theme.colors.primary600 }} thumbColor="#fff" />
              </View>
              <Pressable style={styles.clearButton} onPress={() => {
                Alert.alert("Clear Memory", "This will clear all AI memory. Continue?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: async () => {
                    const { error } = await clearAIMemory();
                    if (error) Alert.alert("Error", "Failed to clear memory");
                    else Alert.alert("Success", "AI memory cleared");
                  }},
                ]);
              }}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                <Text style={styles.clearButtonText}>Clear AI Memory</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.strokeSoft },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textHi, fontFamily: FONT.uiBold },
  lockedContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  lockedText: { fontSize: 18, fontWeight: "600", color: theme.colors.textHi, marginTop: 16, fontFamily: FONT.uiSemi },
  lockedSubtext: { fontSize: 14, color: theme.colors.textLo, marginTop: 8, fontFamily: FONT.uiRegular },
  upgradeButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, backgroundColor: theme.colors.primary600 },
  upgradeButtonText: { fontSize: 16, fontWeight: "600", color: "#06160D", fontFamily: FONT.uiSemi },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: theme.colors.textLo, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, fontFamily: FONT.uiSemi },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 16, backgroundColor: theme.colors.surface1, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.strokeSoft, marginBottom: 8 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, color: theme.colors.textHi, fontFamily: FONT.uiRegular, marginBottom: 4 },
  settingDescription: { fontSize: 12, color: theme.colors.textLo, fontFamily: FONT.uiRegular },
  optionItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: theme.colors.surface1, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.strokeSoft, marginBottom: 8 },
  optionItemSelected: { borderColor: theme.colors.primary600, backgroundColor: theme.colors.primary600 + "15" },
  optionText: { flex: 1, fontSize: 16, color: theme.colors.textHi, fontFamily: FONT.uiRegular },
  optionTextSelected: { color: theme.colors.primary600, fontFamily: FONT.uiSemi },
  clearButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 16, backgroundColor: theme.colors.surface1, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger + "40", marginTop: 8 },
  clearButtonText: { fontSize: 16, color: theme.colors.danger, fontFamily: FONT.uiSemi },
});

