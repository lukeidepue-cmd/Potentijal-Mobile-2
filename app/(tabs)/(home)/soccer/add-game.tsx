import React, { useState } from "react";
import { SafeAreaView, View, Text, Pressable, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { theme } from "../../../../constants/theme";
import { createGame } from "../../../../lib/api/games";
import { useMode } from "../../../../providers/ModeContext";

/* --- Font 2 (Geist) for heading & chip labels --- */
import {
  useFonts as useGeist,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";

export default function AddGameScreen() {
  const [geistLoaded] = useGeist({ Geist_700Bold, Geist_800ExtraBold });
  const { mode } = useMode();
  const m = (mode || "soccer").toLowerCase();
  
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [stats, setStats] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<"W" | "L" | "T" | "">("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!when.trim()) {
      Alert.alert("Error", "Please enter a date.");
      return;
    }

    if (!result) {
      Alert.alert("Error", "Please select a result (Win, Loss, or Tie).");
      return;
    }

    // Store stats as text (not parsed as numbers)
    // User can type anything and it will be stored as-is
    let statsText = stats.trim();

    // Parse date (accept various formats, default to today)
    let playedAt = when.trim();
    if (!playedAt) {
      playedAt = new Date().toISOString().split('T')[0];
    } else {
      // Try to parse date string - handle MM/DD/YYYY format
      let date: Date;
      if (playedAt.includes('/')) {
        // Format: MM/DD/YYYY or M/D/YYYY
        const parts = playedAt.split('/');
        if (parts.length === 3) {
          const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
          const day = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);
          date = new Date(year, month, day);
        } else {
          date = new Date(playedAt);
        }
      } else {
        date = new Date(playedAt);
      }
      
      if (isNaN(date.getTime())) {
        Alert.alert("Error", "Please enter a valid date (e.g., 2025-11-21 or 11/21/2025).");
        return;
      }
      // Format as YYYY-MM-DD using local date
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      playedAt = `${year}-${month}-${day}`;
    }

    setSaving(true);
    Haptics.selectionAsync();

    const resultMap: Record<string, 'win' | 'loss' | 'tie'> = {
      W: 'win',
      L: 'loss',
      T: 'tie',
    };

    const { data, error } = await createGame({
      mode: m,
      playedAt,
      result: resultMap[result],
      title: title.trim() || undefined,
      stats: statsText ? { text: statsText } : {},
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message || "Failed to save game. Please try again.");
      return;
    }

    Alert.alert("Success", "Game saved!", [
      {
        text: "OK",
        onPress: () => router.back(),
      },
    ]);
  };

  if (!geistLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg0 }}>
      {/* Back button */}
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading + rule (match Edit Profile) */}
        <Text style={styles.title}>Add Game</Text>
        <View style={styles.rule} />

        {/* Inputs */}
        <View style={{ marginTop: 20 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Game Title..."
            placeholderTextColor={theme.colors.textLo}
            style={styles.input}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <TextInput
            value={when}
            onChangeText={setWhen}
            placeholder="Date..."
            placeholderTextColor={theme.colors.textLo}
            style={styles.input}
          />
        </View>

        {/* 2px gap between Date and Stats */}
        <View style={{ marginTop: 16 }}>
          <TextInput
            value={stats}
            onChangeText={setStats}
            placeholder="Stats..."
            placeholderTextColor={theme.colors.textLo}
            multiline
            style={[styles.input, styles.inputMed]}
          />
        </View>

        {/* Result chips */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 26, marginBottom: 16 }}>
          <Chip label="Win" active={result === "W"} onPress={() => setResult("W")} />
          <Chip label="Loss" active={result === "L"} onPress={() => setResult("L")} />
          <Chip label="Tie" active={result === "T"} onPress={() => setResult("T")} />
        </View>

        {/* Notes */}
        <View style={{ marginTop: 12 }}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes..."
            placeholderTextColor={theme.colors.textLo}
            multiline
            style={[styles.input, styles.inputBig]}
          />
        </View>

        {/* Save (8px under last box) */}
        <Pressable 
          onPress={save} 
          disabled={saving}
          style={{ marginTop: 20, alignSelf: "flex-start" }}
        >
          <View style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: "Win" | "Loss" | "Tie";
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { borderColor: theme.colors.primary600, backgroundColor: "#0E1316" },
      ]}
    >
      <Text style={[styles.chipText, active && { color: theme.colors.primary600 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 16,
  },

  title: {
    color: theme.colors.textHi,
    fontSize: 28,
    marginTop: 18,
    fontFamily: "Geist_800ExtraBold",
    letterSpacing: 0.2,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    marginTop: 8,
  },

  input: {
    backgroundColor: "#0E1216",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    color: theme.colors.textHi,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMed: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputBig: {
    minHeight: 160,
    textAlignVertical: "top",
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "#0A0F12",
  },
  chipText: {
    color: theme.colors.textHi,
    fontFamily: "Geist_700Bold",
    letterSpacing: 0.2,
  },

  saveBtn: {
    backgroundColor: theme.colors.primary600,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  saveText: {
    color: "#06160D",
    fontFamily: "Geist_700Bold",
    fontSize: 16,
  },
});

