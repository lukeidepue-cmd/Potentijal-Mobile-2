// app/(tabs)/profile/edit.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../providers/AuthProvider";
import { getMyProfile, updateMyProfile } from "../../../lib/api/profile";
import { useEffect } from "react";
import { Alert } from "react-native";

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_700Bold,
  Geist_800ExtraBold, // Heading (Font 2)
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_700Bold, // Section labels (Font 3)
} from "@expo-google-fonts/space-grotesk";

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [geistLoaded] = useGeist({ Geist_700Bold, Geist_800ExtraBold });
  const [sgLoaded] = useSpaceGrotesk({ SpaceGrotesk_700Bold });
  const fontsReady = geistLoaded && sgLoaded;

  // local state
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current profile data
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoading(true);
      const { data, error } = await getMyProfile();
      if (data) {
        setBio(data.bio || "");
        setDisplayName(data.display_name || "");
        setUsername(data.username || "");
      }
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { data, error } = await updateMyProfile({
      bio: bio.trim(),
      displayName: displayName.trim(),
      username: username.trim(),
    });

    setSaving(false);

    if (error) {
      if (error.code === 'USERNAME_TAKEN' || error.message?.includes('username')) {
        Alert.alert("Error", "Username is already taken. Please choose a different username.");
      } else {
        Alert.alert("Error", error.message || "Failed to update profile");
      }
      return;
    }

    if (data) {
      Alert.alert("Success", "Profile updated successfully");
      // Navigate to profile index instead of back (which might go to wrong screen)
      router.replace("/(tabs)/profile");
    }
  };

  if (!fontsReady || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg0, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg0, paddingTop: insets.top + 16 }}>
      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={10}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title (Font 2 / Geist) */}
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.rule} />

        {/* Edit Bio */}
        <View style={{ marginTop: 22 }}>
          <View style={styles.labelRow}>
            <View style={styles.labelTick} />
            <Text style={styles.labelText}>Edit Bio</Text>
          </View>

          {/* 2px gap between label and input */}
          <View style={{ height: 2 }} />

          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Current Bio"
            placeholderTextColor={theme.colors.textLo}
            multiline
            style={[styles.input, styles.inputBig]}
          />
        </View>

        {/* Edit Display Name */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.labelRow}>
            <View style={styles.labelTick} />
            <Text style={styles.labelText}>Edit Display Name</Text>
          </View>

          {/* 2px gap between label and input */}
          <View style={{ height: 2 }} />

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Current Display name"
            placeholderTextColor={theme.colors.textLo}
            style={styles.input}
          />
        </View>

        {/* Edit Username */}
        <View style={{ marginTop: 20 }}>
          <View style={styles.labelRow}>
            <View style={styles.labelTick} />
            <Text style={styles.labelText}>Edit Username</Text>
          </View>

          {/* 2px gap between label and input */}
          <View style={{ height: 2 }} />

          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Current username"
            autoCapitalize="none"
            placeholderTextColor={theme.colors.textLo}
            style={styles.input}
          />
        </View>

        {/* Save button — 8px under last text box */}
        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
      </ScrollView>
    </View>
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
  },

  title: {
    color: theme.colors.textHi,
    fontSize: 28,
    marginTop: 18,
    fontFamily: "Geist_800ExtraBold", // Font 2 (heading font)
    letterSpacing: 0.2,
  },
  rule: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    marginTop: 8,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  labelTick: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: theme.colors.primary600, // green bar
  },
  labelText: {
    color: theme.colors.textHi,
    fontSize: 18,
    letterSpacing: 0.2,
    fontFamily: "SpaceGrotesk_700Bold", // Font 3
  },

  input: {
    backgroundColor: "#0E1216",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    color: theme.colors.textHi,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    // Font 1 (default) -> no explicit fontFamily
  },
  inputBig: {
    minHeight: 120,
    textAlignVertical: "top",
  },

  // Save button
  saveBtn: {
    marginTop: 20,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primary600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: {
    color: "#06160D",
    fontWeight: "900",
  },
});




