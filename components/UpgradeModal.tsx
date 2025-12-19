// components/UpgradeModal.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme } from "../constants/theme";
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

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function UpgradeModal({
  visible,
  onClose,
  featureName = "this feature",
}: UpgradeModalProps) {
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = geistLoaded;

  const handleUpgrade = () => {
    onClose();
    router.push("/(tabs)/purchase-premium");
  };

  if (!fontsReady) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Lock Icon */}
          <View style={styles.lockContainer}>
            <Ionicons name="lock-closed" size={48} color={theme.colors.primary600} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Premium Feature</Text>

          {/* Message */}
          <Text style={styles.message}>
            Purchase Premium to unlock {featureName}
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.benefitText}>Log Games & Practices</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.benefitText}>AI Trainer</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.benefitText}>Add Highlights</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.benefitText}>Meals Progress Graph</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.benefitText}>View Creator Workouts</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary600} />
              <Text style={styles.benefitText}>Add More Sports</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </Pressable>
            <Pressable onPress={handleUpgrade} style={styles.upgradeButton}>
              <LinearGradient
                colors={[theme.colors.primary600, "#3BAA6F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: Math.min(width - 40, 400),
    backgroundColor: theme.colors.surface1,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.strokeSoft,
    ...theme.shadow.large,
  },
  lockContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textHi,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: FONT.uiBold,
  },
  message: {
    fontSize: 16,
    color: theme.colors.textLo,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: FONT.uiRegular,
  },
  benefitsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    color: theme.colors.textHi,
    fontFamily: FONT.uiRegular,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHi,
    fontFamily: FONT.uiSemi,
  },
  upgradeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  upgradeGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#06160D",
    fontFamily: FONT.uiBold,
  },
});

