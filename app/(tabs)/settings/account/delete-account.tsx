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
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Section */}
        <View style={styles.warningBox}>
          <Ionicons name="warning-outline" size={32} color={theme.colors.danger} />
          <Text style={styles.warningTitle}>Warning: This action is permanent</Text>
          <Text style={styles.warningText}>
            Deleting your account will permanently remove all your data including:
          </Text>
          <View style={styles.warningList}>
            <Text style={styles.warningListItem}>• All workouts and exercise data</Text>
            <Text style={styles.warningListItem}>• All games and practices</Text>
            <Text style={styles.warningListItem}>• Your profile and social connections</Text>
            <Text style={styles.warningListItem}>• All highlights and media</Text>
            <Text style={styles.warningListItem}>• AI Trainer settings and memory</Text>
            <Text style={styles.warningListItem}>• All progress and history</Text>
          </View>
          <Text style={styles.warningText}>
            This cannot be undone. If you're sure, type "DELETE" below to confirm.
          </Text>
        </View>

        {/* Confirmation Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Type "DELETE" to confirm</Text>
          <TextInput
            style={styles.input}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            placeholderTextColor={theme.colors.textLo}
            autoCapitalize="characters"
            autoCorrect={false}
          />
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
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Permanently Delete Account</Text>
            </>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.strokeSoft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
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
    padding: 16,
    paddingBottom: 40,
  },
  warningBox: {
    backgroundColor: theme.colors.danger + "15",
    borderWidth: 1,
    borderColor: theme.colors.danger + "40",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.danger,
    marginTop: 12,
    marginBottom: 12,
    fontFamily: FONT.uiBold,
    textAlign: "center",
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.textHi,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: FONT.uiRegular,
    textAlign: "center",
  },
  warningList: {
    width: "100%",
    marginVertical: 12,
  },
  warningListItem: {
    fontSize: 14,
    color: theme.colors.textHi,
    lineHeight: 22,
    marginBottom: 4,
    fontFamily: FONT.uiRegular,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textHi,
    marginBottom: 8,
    fontFamily: FONT.uiSemi,
  },
  input: {
    backgroundColor: theme.colors.surface1,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
    textTransform: "uppercase",
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
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

