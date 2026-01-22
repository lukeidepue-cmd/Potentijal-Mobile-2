// app/(tabs)/settings/account/delete-account.tsx
// Delete Account Screen
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { useAuth } from "../../../../providers/AuthProvider";
import { deleteAccount } from "../../../../lib/api/settings";
import { LinearGradient } from "expo-linear-gradient";

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";

const FONT = {
  uiRegular: "Geist_400Regular",
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  uiBold: "Geist_700Bold",
};

export default function DeleteAccount() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    if (confirmText.toLowerCase() !== "delete") {
      Alert.alert("Error", 'Please type "DELETE" to confirm');
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await deleteAccount();
              if (error) {
                Alert.alert(
                  "Error",
                  error.message || "Failed to delete account. Please contact support."
                );
                setDeleting(false);
              } else {
                // Account deleted, user will be signed out
                router.replace("/(tabs)/(home)");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete account");
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!fontsReady) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#4A1A1A", "rgba(75, 26, 26, 0.5)", "transparent", theme.colors.bg0]}
        locations={[0, 0.2, 0.4, 0.7]}
        style={styles.gradientBackground}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 40, alignItems: "flex-start" }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textHi} />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Text */}
        <Text style={styles.warningText}>
          Please know that deleting your account will remove all of your data
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bullet Points */}
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• All workouts and exercise data</Text>
          <Text style={styles.bulletItem}>• All games and practices</Text>
          <Text style={styles.bulletItem}>• Your profile and social connections</Text>
          <Text style={styles.bulletItem}>• All highlights and media</Text>
          <Text style={styles.bulletItem}>• AI Trainer settings and memory</Text>
          <Text style={styles.bulletItem}>• All progress and history</Text>
        </View>

        {/* Confirmation Input */}
        <View style={styles.inputLine}>
          <TextInput
            style={styles.lineInput}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder='Type "DELETE" to confirm'
            placeholderTextColor={theme.colors.textLo}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <View style={styles.lineUnderline} />
        </View>

        {/* Delete Button */}
        <Pressable
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleting || confirmText.toLowerCase() !== "delete"}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: FONT.uiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  warningText: {
    fontSize: 16,
    color: theme.colors.textHi,
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: FONT.uiRegular,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 32,
  },
  bulletList: {
    marginBottom: 48,
  },
  bulletItem: {
    fontSize: 16,
    color: theme.colors.textHi,
    lineHeight: 32,
    marginBottom: 8,
    fontFamily: FONT.uiRegular,
  },
  inputLine: {
    marginBottom: 24,
  },
  lineInput: {
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
    paddingVertical: 12,
    paddingHorizontal: 0,
    textTransform: "uppercase",
  },
  lineUnderline: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    fontFamily: FONT.uiSemi,
  },
});

