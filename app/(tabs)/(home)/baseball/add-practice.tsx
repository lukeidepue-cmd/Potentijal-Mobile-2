import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { theme } from "../../../../constants/theme";
import { createPractice } from "../../../../lib/api/practices";
import { useMode } from "../../../../providers/ModeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

/* --- Font 2 (Geist) for heading --- */
import {
  useFonts as useGeist,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.25; // 25% of screen height

export default function AddPracticeScreen() {
  const [geistLoaded] = useGeist({ Geist_700Bold, Geist_800ExtraBold });
  const { mode } = useMode();
  const m = (mode || "baseball").toLowerCase();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [title, setTitle] = useState("");
  const [drills, setDrills] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Refs for keyboard handling
  const notesInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Button press animation
  const buttonScale = useSharedValue(1);
  const buttonTranslateY = useSharedValue(0);
  const buttonShadowOpacity = useSharedValue(0.25);
  const buttonShadowOffset = useSharedValue(10);

  // Get image source
  const imageSource = params.imageSource === "judge" 
    ? require("../../../../assets/players/judge.webp")
    : require("../../../../assets/players/judge.webp");

  // Initialize animation values based on params - set synchronously before render
  const hasAnimationData = params.initialX && params.initialY && params.initialWidth && params.initialHeight;
  const initialX = hasAnimationData ? parseFloat(params.initialX as string) : 0;
  const initialY = hasAnimationData ? parseFloat(params.initialY as string) : 0;
  const initialWidth = hasAnimationData ? parseFloat(params.initialWidth as string) : SCREEN_WIDTH;
  const initialHeight = hasAnimationData ? parseFloat(params.initialHeight as string) : IMAGE_HEIGHT;

  // Animation values - initialize with starting positions immediately
  const imageX = useSharedValue(initialX);
  const imageY = useSharedValue(initialY);
  const imageWidth = useSharedValue(initialWidth);
  const imageHeight = useSharedValue(initialHeight);
  const formY = useSharedValue(hasAnimationData ? SCREEN_HEIGHT : IMAGE_HEIGHT);
  const imageOpacity = useSharedValue(1); // Start visible so it appears to move

  useEffect(() => {
    // Start animation immediately - no delay
    if (hasAnimationData) {
      // Final position (top of screen, full width, 25% height, NO top padding)
      const finalX = 0;
      const finalY = 0; // Go all the way to top (no insets.top)
      const finalWidth = SCREEN_WIDTH;
      const finalHeight = IMAGE_HEIGHT;

      // Animate image to top - smooth transition (start immediately)
      // Higher damping = less bounce, smoother animation
      imageX.value = withSpring(finalX, { damping: 35, stiffness: 50 });
      imageY.value = withSpring(finalY, { damping: 35, stiffness: 50 });
      imageWidth.value = withSpring(finalWidth, { damping: 35, stiffness: 50 });
      imageHeight.value = withSpring(finalHeight, { damping: 35, stiffness: 50 });

      // Animate form sliding up from bottom - starts immediately
      formY.value = withSpring(IMAGE_HEIGHT, { 
        damping: 35, 
        stiffness: 50,
      }, () => {
        runOnJS(setAnimationComplete)(true);
      });
    } else {
      // No animation data, already set to final positions
      setAnimationComplete(true);
    }
  }, []);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: imageX.value,
    top: imageY.value,
    width: imageWidth.value,
    height: imageHeight.value,
    opacity: imageOpacity.value,
    zIndex: 1,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formY.value - IMAGE_HEIGHT }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: buttonScale.value },
      { translateY: buttonTranslateY.value },
    ],
  }));

  const save = async () => {
    // Automatically assign today's date (local date, not UTC)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const practicedAt = `${year}-${month}-${day}`;

    setSaving(true);
    Haptics.selectionAsync();

    const { data, error } = await createPractice({
      mode: m,
      practicedAt,
      title: title.trim() || undefined,
      drill: drills.trim(),
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message || "Failed to save practice. Please try again.");
      return;
    }

    Alert.alert("Success", "Practice saved!", [
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
    <View style={{ flex: 1, backgroundColor: theme.colors.bg0 }}>
      {/* Animated Image - Part of the screen (not overlay) */}
      <Animated.View style={imageAnimatedStyle}>
        <Image 
          source={imageSource} 
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        {/* Gradient Scrim Overlay */}
        <LinearGradient
          colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
          locations={[0, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Back button - positioned absolutely over the image */}
        <Pressable 
          onPress={() => router.back()} 
          hitSlop={10} 
          style={[styles.backBtn, { 
            position: "absolute",
            top: insets.top + 16,
            left: 16,
            zIndex: 1001,
          }]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
        </Pressable>
      </Animated.View>

      {/* Content - Slides up from bottom */}
      <Animated.View style={[styles.contentContainer, formAnimatedStyle]}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 400 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading Section - Clear, prominent like to-do list */}
          <View style={styles.headingSection}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Practice Title..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              style={styles.headingInput}
            />
          </View>

          {/* Drills and Notes sections with overlapping labels */}
          <View style={styles.contentSection}>
            {/* Drills Section */}
            <View style={styles.inputSection}>
              <View style={styles.labelOverlay}>
                <Text style={styles.labelText}>Drills</Text>
              </View>
              <TextInput
                value={drills}
                onChangeText={setDrills}
                placeholder=""
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                style={styles.textBox}
              />
            </View>

            {/* Notes Section */}
            <View style={styles.inputSection}>
              <View style={styles.labelOverlay}>
                <Text style={styles.labelText}>Notes</Text>
              </View>
              <TextInput
                ref={notesInputRef}
                value={notes}
                onChangeText={setNotes}
                placeholder=""
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                multiline
                style={styles.textBox}
                onFocus={() => {
                  // Scroll to end when Notes input is focused to ensure it's visible above keyboard
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Floating Save Button - Bottom Right */}
      <View style={[styles.floatingButtonContainer, { bottom: 24 + insets.bottom }]}>
        {/* Shadow wrapper with glow effect */}
        <Animated.View 
          style={[
            styles.buttonShadowWrapper,
            buttonAnimatedStyle,
          ]}
        >
          <Pressable 
            onPress={save} 
            disabled={saving}
            onPressIn={() => {
              buttonScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
              buttonTranslateY.value = withSpring(1, { damping: 15, stiffness: 300 });
              buttonShadowOpacity.value = withTiming(0.15, { duration: 100 });
              buttonShadowOffset.value = withTiming(6, { duration: 100 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              buttonTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
              buttonShadowOpacity.value = withTiming(0.25, { duration: 100 });
              buttonShadowOffset.value = withTiming(10, { duration: 100 });
            }}
            style={[styles.floatingSaveButton, saving && { opacity: 0.6 }]}
          >
            {/* Subtle gradient overlay for depth */}
            <LinearGradient
              colors={["rgba(255,255,255,0.18)", "rgba(0,0,0,0.12)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.floatingSaveText}>Save Practice</Text>
            <Ionicons name="checkmark" size={20} color="#0B0E10" style={{ zIndex: 1 }} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    marginTop: IMAGE_HEIGHT,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headingSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: theme.colors.bg0,
  },
  headingInput: {
    fontSize: 32,
    fontFamily: "Geist_800ExtraBold",
    fontWeight: "800",
    color: theme.colors.textHi,
    letterSpacing: -0.5,
    minHeight: 48,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  inputSection: {
    position: "relative",
    marginTop: 12,
  },
  labelOverlay: {
    position: "absolute",
    top: -8,
    left: 16,
    zIndex: 10,
    backgroundColor: "#74C69D", // Middle green shade (mint green)
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0B0E10", // Dark text on mint green
    fontFamily: "Geist_700Bold",
    letterSpacing: 0.3,
  },
  textBox: {
    fontSize: 16,
    color: theme.colors.textHi,
    backgroundColor: "#1A1F28", // Dark background that complements the screen
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 24, // Extra top padding for label overlap - increased for better spacing
    minHeight: 120,
    textAlignVertical: "top",
  },
  floatingButtonContainer: {
    position: "absolute",
    right: 20,
    zIndex: 50,
    // No overflow: 'hidden' - shadows need to render
  },
  buttonShadowWrapper: {
    // Enhanced shadow with green glow effect
    shadowColor: "#74C69D", // Mint green shadow for glow effect
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, // Higher opacity for visible glow
    shadowRadius: 25, // Larger radius for spread-out glow
    elevation: 14,
  },
  floatingSaveButton: {
    backgroundColor: "#74C69D", // Same mint green as overlapping headers
    borderRadius: 24, // More curved corners
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)", // Subtle border for depth
    overflow: "hidden", // For gradient overlay
    position: "relative",
  },
  floatingSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0B0E10", // Dark text on mint green
    fontFamily: "Geist_700Bold",
    zIndex: 1, // Above gradient
  },
});
