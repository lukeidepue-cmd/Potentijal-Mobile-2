// app/(tabs)/settings/premium/manage-subscription.tsx
// Manage Subscription (Placeholder - needs payment integration)
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";

const FONT = { uiRegular: "Geist_400Regular", uiBold: "Geist_700Bold" };

export default function ManageSubscription() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Subscription</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.placeholder}>
        <Ionicons name="card-outline" size={64} color={theme.colors.textLo} />
        <Text style={styles.placeholderText}>Coming Soon</Text>
        <Text style={styles.placeholderSubtext}>Subscription management will be available once payment system is integrated</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg0 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.strokeSoft },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.textHi, fontFamily: FONT.uiBold },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  placeholderText: { fontSize: 18, fontWeight: "600", color: theme.colors.textHi, marginTop: 16, fontFamily: FONT.uiBold },
  placeholderSubtext: { fontSize: 14, color: theme.colors.textLo, marginTop: 8, textAlign: "center", fontFamily: FONT.uiRegular },
});

