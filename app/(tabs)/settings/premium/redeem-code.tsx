// app/(tabs)/settings/premium/redeem-code.tsx
// Redeem Code Screen
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { redeemCode } from "../../../../lib/api/settings";

const FONT = { uiRegular: "Geist_400Regular", uiSemi: "Geist_600SemiBold", uiBold: "Geist_700Bold" };

export default function RedeemCode() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a code");
      return;
    }

    setRedeeming(true);
    try {
      const { data, error } = await redeemCode(code.trim().toUpperCase());
      if (error) {
        Alert.alert("Error", error.message || "Invalid code");
      } else if (data) {
        Alert.alert("Success", data.message);
        setCode("");
        router.back();
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to redeem code");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Redeem Code</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Enter Code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter code"
            placeholderTextColor={theme.colors.textLo}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Pressable style={[styles.redeemButton, redeeming && styles.redeemButtonDisabled]} onPress={handleRedeem} disabled={redeeming}>
            {redeeming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.redeemButtonText}>Redeem</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            Enter a creator code or premium discount code to unlock features or get discounts.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.strokeSoft },
  backButton: { /* No box styling - matches onboarding screens */ },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textHi, fontFamily: FONT.uiBold },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 32 },
  label: { fontSize: 14, fontWeight: "600", color: theme.colors.textHi, marginBottom: 8, fontFamily: FONT.uiSemi },
  input: { backgroundColor: theme.colors.surface1, borderWidth: 1, borderColor: theme.colors.strokeSoft, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: theme.colors.textHi, fontFamily: FONT.uiRegular, textTransform: "uppercase" },
  redeemButton: { backgroundColor: theme.colors.primary600, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginTop: 16 },
  redeemButtonDisabled: { opacity: 0.6 },
  redeemButtonText: { fontSize: 16, fontWeight: "600", color: "#06160D", fontFamily: FONT.uiSemi },
  helpSection: { marginTop: 24, padding: 16, backgroundColor: theme.colors.surface1, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.strokeSoft },
  helpText: { fontSize: 14, color: theme.colors.textLo, lineHeight: 20, fontFamily: FONT.uiRegular },
});

