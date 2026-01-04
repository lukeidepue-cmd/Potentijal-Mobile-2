// app/(tabs)/settings/app-preferences/units.tsx
// Units Settings Screen
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../../constants/theme";
import { useSettings } from "../../../../providers/SettingsContext";

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

export default function UnitsSettings() {
  const insets = useSafeAreaInsets();
  const { unitsWeight, unitsDistance, setUnitsWeight, setUnitsDistance } = useSettings();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

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
        <Text style={styles.headerTitle}>Units</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Units */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight</Text>
          
          <Pressable
            style={[
              styles.optionItem,
              unitsWeight === 'lbs' && styles.optionItemSelected,
            ]}
            onPress={() => setUnitsWeight('lbs')}
          >
            <Text
              style={[
                styles.optionText,
                unitsWeight === 'lbs' && styles.optionTextSelected,
              ]}
            >
              Pounds (lbs)
            </Text>
            {unitsWeight === 'lbs' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary600} />
            )}
          </Pressable>

          <Pressable
            style={[
              styles.optionItem,
              unitsWeight === 'kg' && styles.optionItemSelected,
            ]}
            onPress={() => setUnitsWeight('kg')}
          >
            <Text
              style={[
                styles.optionText,
                unitsWeight === 'kg' && styles.optionTextSelected,
              ]}
            >
              Kilograms (kg)
            </Text>
            {unitsWeight === 'kg' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary600} />
            )}
          </Pressable>
        </View>

        {/* Distance Units */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance</Text>
          
          <Pressable
            style={[
              styles.optionItem,
              unitsDistance === 'miles' && styles.optionItemSelected,
            ]}
            onPress={() => setUnitsDistance('miles')}
          >
            <Text
              style={[
                styles.optionText,
                unitsDistance === 'miles' && styles.optionTextSelected,
              ]}
            >
              Miles
            </Text>
            {unitsDistance === 'miles' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary600} />
            )}
          </Pressable>

          <Pressable
            style={[
              styles.optionItem,
              unitsDistance === 'km' && styles.optionItemSelected,
            ]}
            onPress={() => setUnitsDistance('km')}
          >
            <Text
              style={[
                styles.optionText,
                unitsDistance === 'km' && styles.optionTextSelected,
              ]}
            >
              Kilometers (km)
            </Text>
            {unitsDistance === 'km' && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary600} />
            )}
          </Pressable>
        </View>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textLo,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: FONT.uiSemi,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    marginBottom: 8,
  },
  optionItemSelected: {
    borderColor: theme.colors.primary600,
    backgroundColor: theme.colors.primary600 + "15",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
  },
  optionTextSelected: {
    color: theme.colors.primary600,
    fontFamily: FONT.uiSemi,
  },
});

