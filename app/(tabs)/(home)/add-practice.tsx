// app/(tabs)/(home)/add-practice.tsx
// Practice logging — receives a shared-element animation from Home's image
// button (athlete photo flies up to the top, form slides up from below).
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { theme } from "../../../constants/theme";
import { createPractice } from "../../../lib/api/practices";
import { SuccessToast } from "../../../components/SuccessToast";
import { ErrorToast } from "../../../components/ErrorToast";
import { getImageByKey } from "../../../constants/sport-images";

import {
  useFonts as useGeist,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_800ExtraBold,
} from "@expo-google-fonts/space-grotesk";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = 280;
// Matched duration for image + form so they slide in lock-step and the
// form's top edge "connects" with the image's bottom edge at the same moment.
const HERO_DURATION = 700;
const HERO_EASING = Easing.bezier(0.22, 1, 0.36, 1);

export default function AddPracticeScreen() {
  const [geistLoaded] = useGeist({ Geist_700Bold, Geist_800ExtraBold });
  useSpaceGrotesk({ SpaceGrotesk_800ExtraBold });
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [drills, setDrills] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const notesInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const buttonScale = useSharedValue(1);
  const buttonTranslateY = useSharedValue(0);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: buttonScale.value },
      { translateY: buttonTranslateY.value },
    ],
  }));

  // Shared-element image animation (mirrors add-game).
  const imageSource = getImageByKey(params.imageSource as string | undefined);
  const hasAnimationData =
    !!params.initialX && !!params.initialY && !!params.initialWidth && !!params.initialHeight;
  const initialX = hasAnimationData ? parseFloat(params.initialX as string) : 0;
  const initialY = hasAnimationData ? parseFloat(params.initialY as string) : 0;
  const initialWidth = hasAnimationData ? parseFloat(params.initialWidth as string) : SCREEN_WIDTH;
  const initialHeight = hasAnimationData ? parseFloat(params.initialHeight as string) : IMAGE_HEIGHT;
  const imageX = useSharedValue(initialX);
  const imageY = useSharedValue(initialY);
  const imageWidth = useSharedValue(initialWidth);
  const imageHeight = useSharedValue(initialHeight);
  // formY is the form's absolute top position on screen. Starts off-screen
  // at SCREEN_HEIGHT, lands at IMAGE_HEIGHT so the form sits just below the
  // image (not behind it).
  const formY = useSharedValue(hasAnimationData ? SCREEN_HEIGHT : IMAGE_HEIGHT);

  useEffect(() => {
    if (!hasAnimationData) return;
    // withTiming with matched duration + easing so image + form travel
    // together and softly meet at the image's bottom edge.
    const opts = { duration: HERO_DURATION, easing: HERO_EASING };
    imageX.value = withTiming(0, opts);
    imageY.value = withTiming(0, opts);
    imageWidth.value = withTiming(SCREEN_WIDTH, opts);
    imageHeight.value = withTiming(IMAGE_HEIGHT, opts);
    formY.value = withTiming(IMAGE_HEIGHT, opts);
  }, []);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: imageX.value,
    top: imageY.value,
    width: imageWidth.value,
    height: imageHeight.value,
    zIndex: 1,
  }));
  const formAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: formY.value }],
  }));

  const save = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const practicedAt = `${year}-${month}-${day}`;

    setSaving(true);
    Haptics.selectionAsync();

    const { error } = await createPractice({
      practicedAt,
      title: title.trim() || undefined,
      drill: drills.trim(),
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Failed to save practice. Please try again.");
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setShowSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => router.back(), 1500);
  };

  if (!geistLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SuccessToast message="Practice saved!" visible={showSuccess} onHide={() => setShowSuccess(false)} />
      <ErrorToast message={errorMessage} visible={showError} onHide={() => setShowError(false)} />

      {/* Animated athlete hero (when launched from Home with measure data).
          Static style first so the image is at the source frame on first
          paint — fixes the brief "image disappears" flicker before
          Reanimated's worklet kicks in. */}
      {imageSource && (
        <Animated.View
          style={[
            {
              position: "absolute",
              left: initialX,
              top: initialY,
              width: initialWidth,
              height: initialHeight,
              zIndex: 1,
            },
            imageAnimatedStyle,
          ]}
        >
          <Image source={imageSource} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 4 }]}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.heroBackBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.heroTitleOverlay}>
            <Text style={styles.heroTitle}>Log Practice</Text>
          </View>
        </Animated.View>
      )}

      {/* Fallback header for deep-link / no-animation entry */}
      {!imageSource && (
        <LinearGradient
          colors={["#2D6A4F", "#1A4A3A", theme.colors.bg0]}
          locations={[0, 0.6, 1]}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.textHi} />
            </Pressable>
            <Text style={styles.headerTitle}>Log a Practice</Text>
            <View style={{ width: 22 }} />
          </View>
        </LinearGradient>
      )}

      <Animated.View style={[styles.formWrap, imageSource ? formAnimatedStyle : undefined]}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingSection}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Practice Title..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              style={styles.headingInput}
            />
          </View>

          <View style={styles.contentSection}>
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
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
                }}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <View style={[styles.floatingButtonContainer, { bottom: 34 + insets.bottom }]}>
        <Animated.View style={[styles.buttonShadowWrapper, buttonAnimatedStyle]}>
          <Pressable
            onPress={save}
            disabled={saving}
            onPressIn={() => {
              buttonScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
              buttonTranslateY.value = withSpring(1, { damping: 15, stiffness: 300 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              buttonTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
            }}
            style={[styles.floatingSaveButton, saving && { opacity: 0.6 }]}
          >
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
  container: { flex: 1, backgroundColor: theme.colors.bg0 },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {},
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textHi,
    fontFamily: "Geist_700Bold",
  },

  // Shared-element hero image (animated from Home button frame).
  heroImage: { width: "100%", height: "100%" },
  heroTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },
  heroTitleOverlay: {
    position: "absolute",
    bottom: 18,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 38,
    fontFamily: "SpaceGrotesk_800ExtraBold",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    transform: [{ skewX: "-5deg" }],
  },
  formWrap: { flex: 1 },

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
  contentSection: { paddingHorizontal: 20, paddingTop: 8, gap: 20 },
  inputSection: { position: "relative", marginTop: 12 },
  labelOverlay: {
    position: "absolute",
    top: -8,
    left: 16,
    zIndex: 10,
    backgroundColor: "#74C69D",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0B0E10",
    fontFamily: "Geist_700Bold",
    letterSpacing: 0.3,
  },
  textBox: {
    fontSize: 16,
    color: theme.colors.textHi,
    backgroundColor: "#1A1F28",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 24,
    minHeight: 120,
    textAlignVertical: "top",
  },
  floatingButtonContainer: { position: "absolute", right: 20, zIndex: 50 },
  buttonShadowWrapper: {
    shadowColor: "#74C69D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 14,
  },
  floatingSaveButton: {
    backgroundColor: "#74C69D",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
    overflow: "hidden",
    position: "relative",
  },
  floatingSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0B0E10",
    fontFamily: "Geist_700Bold",
    zIndex: 1,
  },
});
