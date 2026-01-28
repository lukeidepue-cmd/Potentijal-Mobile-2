// app/(tabs)/meals/index.tsx
// Progress Tab - Main Screen

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  Pressable,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Modal } from "react-native";
import AITrainerChat from "../../../components/AITrainerChat";
import { getAITrainerSettings } from "@/lib/api/settings";
import { useFeatures } from "@/hooks/useFeatures";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/* ---- Fonts ---- */
import {
  useFonts as useGeist,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  useFonts as useSpaceGrotesk,
  SpaceGrotesk_800ExtraBold,
} from "@expo-google-fonts/space-grotesk";

const FONT = {
  uiRegular: "Geist_400Regular",
  uiMedium: "Geist_500Medium",
  uiSemi: "Geist_600SemiBold",
  uiBold: "Geist_700Bold",
};

// Animated Card Component
const AnimatedCard = ({
  index,
  colors,
  scrollX,
  cardIndex,
  cardWidth,
  cardGap,
  onPress,
  isPremium,
}: {
  index: number;
  colors: string[];
  scrollX: Animated.SharedValue<number>;
  cardIndex: number;
  cardWidth: number;
  cardGap: number;
  onPress: () => void;
  isPremium: boolean;
}) => {
  const cardTotalWidth = cardWidth + cardGap;
  
  // Calculate scale and opacity based on distance from center
  const animatedCardStyle = useAnimatedStyle(() => {
    const inputRange = [
      (cardIndex - 1) * cardTotalWidth,
      cardIndex * cardTotalWidth,
      (cardIndex + 1) * cardTotalWidth,
    ];
    
    // Scale: 1.08 when centered (more prominent), 0.88 when not centered (more hierarchy)
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.88, 1.08, 0.88],
      'clamp'
    );
    
    // Opacity: 1.0 when centered, 0.75 when not centered (more hierarchy)
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.75, 1.0, 0.75],
      'clamp'
    );
    
    return {
      transform: [{ scale: withTiming(scale, { duration: 50 }) }],
      opacity: withTiming(opacity, { duration: 50 }),
    };
  });

  // Premium cards: Skill Map (index 2), Consistency Score (index 3), Training Statistics (index 4)
  const isPremiumCard = index >= 2 && index <= 4;
  const isDisabled = isPremiumCard && !isPremium;

  // Gradient border colors for cards 2, 3, 4
  const gradientColors = 
    index === 2 ? ["#98FB98", "#87CEEB", "#DDA0DD"] : // minty green, light blue, light purple
    index === 3 ? ["#98FB98", "#87CEEB", "#DDA0DD"] :
    index === 4 ? ["#98FB98", "#87CEEB", "#DDA0DD"] :
    null;

  return (
    <Pressable onPress={onPress}>
      {index === 1 ? (
        // First card: white border
        <Animated.View style={[styles.card, styles.cardWhiteBorder, animatedCardStyle, isDisabled && styles.cardDisabled]}>
          <View style={[styles.cardGradient, isDisabled && styles.cardGradientDisabled]}>
        {/* Card Image */}
        {index === 1 && (
          <Image
            source={require("../../../assets/progress-graph.jpeg")}
            style={[styles.cardImage, isDisabled && styles.cardImageDisabled]}
            resizeMode="cover"
          />
        )}
        {/* Card Image */}
        {index === 1 && (
          <Image
            source={require("../../../assets/progress-graph.jpeg")}
            style={[styles.cardImage, isDisabled && styles.cardImageDisabled]}
            resizeMode="cover"
          />
        )}
        
        {/* Gradient Scrim Overlay */}
        <LinearGradient
          colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
          locations={[0, 0.65, 1]}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Text Overlay - Bottom Left */}
        <View style={styles.cardTextOverlay}>
          {index === 1 && (
            <Text style={[styles.cardHeading, isDisabled && styles.cardHeadingDisabled]}>Progress Graph</Text>
          )}
        </View>
        
        {/* Lock Icon Overlay for non-premium */}
        {isDisabled && (
          <View style={styles.cardLockOverlay}>
            <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
          </View>
        )}
        
      </View>
    </Animated.View>
      ) : (
        // Cards 2, 3, 4: gradient border
        <Animated.View style={[animatedCardStyle, isDisabled && styles.cardDisabled]}>
          <LinearGradient
            colors={gradientColors || ["#98FB98", "#87CEEB", "#DDA0DD"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradientBorder}
          >
            <View style={[styles.card, styles.cardInner]}>
              <View style={[styles.cardGradient, isDisabled && styles.cardGradientDisabled]}>
                {/* Card Image */}
                {index === 2 && (
                  <Image
                    source={require("../../../assets/skill-map.jpeg")}
                    style={[styles.cardImage, isDisabled && styles.cardImageDisabled]}
                    resizeMode="cover"
                  />
                )}
                {index === 3 && (
                  <Image
                    source={require("../../../assets/consistency-score.jpeg")}
                    style={[styles.cardImage, isDisabled && styles.cardImageDisabled]}
                    resizeMode="cover"
                  />
                )}
                {index === 4 && (
                  <Image
                    source={require("../../../assets/training-statistics.jpeg")}
                    style={[styles.cardImage, isDisabled && styles.cardImageDisabled]}
                    resizeMode="cover"
                  />
                )}
                
                {/* Gradient Scrim Overlay */}
                <LinearGradient
                  colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.85)"]}
                  locations={[0, 0.65, 1]}
                  style={StyleSheet.absoluteFill}
                />
                
                {/* Text Overlay - Bottom Left */}
                <View style={styles.cardTextOverlay}>
                  {index === 2 && (
                    <Text style={[styles.cardHeading, isDisabled && styles.cardHeadingDisabled]}>Skill Map</Text>
                  )}
                  {index === 3 && (
                    <Text style={[styles.cardHeading, isDisabled && styles.cardHeadingDisabled]}>Consistency Score</Text>
                  )}
                  {index === 4 && (
                    <Text style={[styles.cardHeading, isDisabled && styles.cardHeadingDisabled]}>Training Stats</Text>
                  )}
                </View>
                
                {/* Lock Icon Overlay for non-premium */}
                {isDisabled && (
                  <View style={styles.cardLockOverlay}>
                    <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </Pressable>
  );
};

// Diagonal lines pattern component - exactly 4 big lines like reference
const DiagonalLines = () => {
  const diagonalLength = Math.sqrt(SCREEN_WIDTH * SCREEN_WIDTH + SCREEN_HEIGHT * SCREEN_HEIGHT);
  const baseSpacing = SCREEN_HEIGHT / 5;
  const closeSpacing = SCREEN_HEIGHT / 12; // Closer spacing for lines 1-2 and 3-4
  
  // Line positions: line 1 and 2 close together, then gap, then line 3 and 4 with spacing
  // For 80px thick lines: centers need to be far enough apart to avoid overlap
  const line3Offset = baseSpacing - 4 + 24; // Line 3 center
  const line4Offset = line3Offset + 136; // Line 4 center (136px below line 3 center for proper gap)
  
  const linePositions = [
    { offset: -baseSpacing - closeSpacing / 2 - 24, thickness: 40 }, // Line 1 (moved up 24px)
    { offset: -baseSpacing + closeSpacing / 2 - 24, thickness: 40 }, // Line 2 (moved up 24px)
    { offset: line3Offset, thickness: 80 }, // Line 3 (moved down 24px, increased by 8px)
    { offset: line4Offset, thickness: 80 }, // Line 4 (increased by 8px, moved down 8px more)
  ];
  
  return (
    <View style={styles.diagonalLinesContainer} pointerEvents="none">
      {linePositions.map((line, i) => (
        <View
          key={i}
          style={[
            styles.diagonalLine,
            {
              height: line.thickness,
              transform: [{ rotate: "-47deg" }],
              width: diagonalLength,
              left: -diagonalLength / 2 + SCREEN_WIDTH / 2,
              top: SCREEN_HEIGHT / 2 + line.offset,
            },
          ]}
        />
      ))}
    </View>
  );
};

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const [sgLoaded] = useSpaceGrotesk({
    SpaceGrotesk_800ExtraBold,
  });
  const fontsReady = geistLoaded && sgLoaded;
  const [showAITrainer, setShowAITrainer] = useState(false);
  const [aiTrainerEnabled, setAiTrainerEnabled] = useState(true); // Default to enabled
  const { canUseAITrainer, isPremium } = useFeatures();

  // Load AI Trainer enabled setting
  const loadAITrainerSetting = useCallback(async () => {
    const { data } = await getAITrainerSettings();
    if (data) {
      setAiTrainerEnabled(data.enabled);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadAITrainerSetting();
  }, [loadAITrainerSetting]);

  // Reload when screen comes into focus (e.g., after changing settings)
  useFocusEffect(
    useCallback(() => {
      loadAITrainerSetting();
    }, [loadAITrainerSetting])
  );

  // Animation values for AI Trainer button
  const aiButtonScale = useSharedValue(1);
  const aiButtonTranslateY = useSharedValue(0);
  
  // Shimmer animation for sparkly effect
  const shimmerTranslateX = useSharedValue(-200);

  const aiButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: aiButtonScale.value },
      { translateY: aiButtonTranslateY.value },
    ],
  }));

  // Removed shadow style - no shadows on button

  const shimmerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  // Start shimmer animation
  useEffect(() => {
    if (!fontsReady) return; // Don't start animations until fonts are ready
    
    if (aiTrainerEnabled && canUseAITrainer) {
      // Shimmer animation
      shimmerTranslateX.value = withRepeat(
        withTiming(400, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      shimmerTranslateX.value = withTiming(-200, { duration: 0 });
    }
  }, [aiTrainerEnabled, canUseAITrainer, fontsReady]);

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  // Animation values for carousel
  const scrollX = useSharedValue(0);
  const cardWidth = SCREEN_WIDTH * 0.75;
  const cardGap = 20;
  const cardTotalWidth = cardWidth + cardGap;
  // Extra padding to show both sides when on middle cards (2nd and 3rd)
  // This ensures both adjacent cards are visible when middle cards are centered
  const sidePadding = (SCREEN_WIDTH - cardWidth) / 2;

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Navigation handlers for each card
  const handleCardPress = (cardIndex: number) => {
    // Card indices: 0 = Progress Graphs (free), 1 = Skill Map (premium), 2 = Consistency Score (premium), 3 = Training Statistics (premium)
    const premiumCards = [1, 2, 3]; // Skill Map, Consistency Score, Training Statistics
    
    if (premiumCards.includes(cardIndex) && !isPremium) {
      // Do nothing for premium features when not premium
      return;
    }
    
    const routes = [
      "/meals/progress-graphs",
      "/meals/skill-map",
      "/meals/consistency-score",
      "/meals/training-statistics",
    ];
    router.push(routes[cardIndex] as any);
  };

  // Don't block rendering on fonts - they'll load asynchronously

  const cards = [
    { index: 1, colors: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.06)"] }, // Blank
    { index: 2, colors: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.06)"] }, // Blank
    { index: 3, colors: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.06)"] }, // Blank
    { index: 4, colors: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.06)"] }, // Blank
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background diagonal lines */}
      <DiagonalLines />

      {/* Cards Carousel - Animated - Middle of screen */}
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.carouselContainer, { paddingHorizontal: sidePadding }]}
        style={styles.carousel}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToInterval={cardTotalWidth}
        decelerationRate="fast"
      >
        {cards.map(({ index, colors }, cardIndex) => (
          <AnimatedCard
            key={index}
            index={index}
            colors={colors}
            scrollX={scrollX}
            cardIndex={cardIndex}
            cardWidth={cardWidth}
            cardGap={cardGap}
            onPress={() => handleCardPress(cardIndex)}
            isPremium={isPremium}
          />
        ))}
      </Animated.ScrollView>

      {/* AI Trainer Button - Bottom of screen */}
      <View style={styles.aiTrainerButtonContainer}>
        <Animated.View
          style={[
            styles.buttonWrapper,
            aiButtonAnimatedStyle,
            (!aiTrainerEnabled || !canUseAITrainer) && styles.buttonShadowWrapperDisabled,
          ]}
        >
          <AnimatedPressable
            onPress={() => {
              if (!canUseAITrainer) {
                // Do nothing if not premium - button is disabled
                return;
              }
              if (!aiTrainerEnabled) {
                return; // Do nothing if setting is disabled
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAITrainer(true);
            }}
            onPressIn={() => {
              if (!canUseAITrainer) {
                // Allow press animation even when not premium (for navigation feedback)
                aiButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
                aiButtonTranslateY.value = withSpring(2, { damping: 15, stiffness: 300 });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return;
              }
              if (!aiTrainerEnabled) return; // Do nothing if setting is disabled
              aiButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
              aiButtonTranslateY.value = withSpring(2, { damping: 15, stiffness: 300 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              aiButtonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              aiButtonTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
            }}
            style={[
              styles.aiTrainerButton,
              (!aiTrainerEnabled || !canUseAITrainer) && styles.aiTrainerButtonDisabled,
            ]}
          >
            {/* Shiny gradient background - minty green, light blue, light purple (left to right) */}
            <LinearGradient
              colors={
                (aiTrainerEnabled && canUseAITrainer)
                  ? ["#98FB98", "#87CEEB", "#DDA0DD"] // Minty green → light blue → light purple
                  : ["rgba(200,200,200,0.5)", "rgba(180,180,180,0.5)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* Sparkly texture overlay - animated shimmer effect */}
            {(aiTrainerEnabled && canUseAITrainer) && (
              <>
                {/* Top highlight for glossy effect */}
                <LinearGradient
                  colors={["rgba(255,255,255,0.4)", "rgba(255,255,255,0.15)", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 0.4 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Sparkle texture - noise/grain effect with more texture */}
                <View style={styles.sparkleTexture} />
                <View style={styles.sparkleTexture2} />
                <View style={styles.sparkleTexture3} />
                {/* Animated shimmer overlay - more intense */}
                <Animated.View style={[styles.shimmerOverlay, shimmerAnimatedStyle]}>
                  <LinearGradient
                    colors={[
                      "transparent",
                      "rgba(255,255,255,0.5)",
                      "rgba(255,255,255,0.8)",
                      "rgba(255,255,255,0.5)",
                      "transparent",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </>
            )}
            <View style={styles.aiTrainerButtonContent}>
              {!canUseAITrainer && (
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color="#999999"
                  style={{ zIndex: 1 }}
                />
              )}
              <Text
                style={[
                  styles.aiTrainerButtonText,
                  (!aiTrainerEnabled || !canUseAITrainer) && styles.aiTrainerButtonTextDisabled,
                ]}
              >
                AI Trainer
              </Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      </View>

      {/* AI Trainer Chat Modal */}
      <Modal
        visible={showAITrainer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAITrainer(false)}
      >
        <AITrainerChat onClose={() => setShowAITrainer(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg0,
  },
  diagonalLinesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  diagonalLine: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.08)", // Reduced opacity for less contrast
  },
  heroTextContainer: {
    position: "absolute",
    top: "30%",
    marginTop: -100, // Moved up by 24px more (from -76 to -100)
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  heroTitleGlowWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: FONT.uiBold,
    letterSpacing: -0.6,
    lineHeight: 42,
    textAlign: "center",
    // Floating text effects - deep shadow for depth and floating appearance
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  heroSubtext: {
    fontSize: 17,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.72)",
    fontFamily: FONT.uiRegular,
    lineHeight: 26,
    textAlign: "center",
    maxWidth: 320,
    // Subtle shadow for readability
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  aiTrainerButtonContainer: {
    position: "absolute",
    bottom: 100,
    left: 0, // No left padding - button goes to edge
    right: 0, // No right padding - button goes to edge
    alignItems: "center",
    zIndex: 50,
    paddingHorizontal: 20, // 6px more padding (14 + 6 = 20) to make button 6px smaller again
  },
  buttonWrapper: {
    width: "100%",
  },
  buttonShadowWrapperDisabled: {
    // No shadow styles
  },
  aiTrainerButton: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: "100%",
    overflow: "hidden", // For gradient overlay
    position: "relative",
    // Shadows - reduced slightly
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.45,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  aiTrainerButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 1,
  },
  aiTrainerButtonText: {
    fontSize: 20, // Increased from 18
    fontWeight: "600",
    color: "#000000",
    fontFamily: FONT.uiSemi,
    zIndex: 1, // Above gradient
    includeFontPadding: false, // Prevent text cutoff on Android
    textAlignVertical: "center", // Center text vertically
    paddingRight: 4, // Extra padding on right to prevent cutoff
    letterSpacing: 0.2, // Slight letter spacing to help with cutoff
    // Text shadows - reduced slightly
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  aiTrainerButtonDisabled: {
    opacity: 0.5,
  },
  aiTrainerButtonTextDisabled: {
    color: "#666666",
  },
  sparkleTexture: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
    opacity: 0.5,
    // Create sparkle texture with noise pattern
  },
  sparkleTexture2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
    opacity: 0.4,
    // Additional texture layer
  },
  sparkleTexture3: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
    opacity: 0.3,
    // Third texture layer for more depth
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 200,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
    // Diagonal gradient for shimmer
    transform: [{ skewX: "-20deg" }],
  },
  carousel: {
    position: "absolute",
    top: "50%",
    marginTop: -257, // Center vertically (half of 450px card height) - moved up 32px
    left: 0,
    right: 0,
  },
  carouselContainer: {
    paddingVertical: 20,
    gap: 20,
    // paddingHorizontal will be set dynamically to show both sides on middle cards
  },
  card: {
    width: SCREEN_WIDTH * 0.75, // Pretty big cards - 75% of screen width
    height: 450, // Made a lot taller (from 280 to 450)
    borderRadius: 28, // Bigger radius for premium feel
    overflow: "hidden",
    // Enhanced floating effects
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  cardWhiteBorder: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)", // Subtle white border like reference
  },
  cardGradientBorder: {
    width: SCREEN_WIDTH * 0.75,
    height: 450,
    borderRadius: 28,
    padding: 1.5, // Border width
    // Shadow for gradient border cards
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  cardInner: {
    width: "100%",
    height: "100%",
    borderRadius: 26.5, // Slightly smaller to account for border
    overflow: "hidden",
  },
  cardGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    position: "relative",
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  cardTextOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 22,
    paddingBottom: 24,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  cardHeading: {
    fontSize: 28, // Smaller than Log Game (42px) but same style
    fontFamily: "SpaceGrotesk_800ExtraBold",
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    transform: [{ skewX: "-5deg" }], // Slight italic-like slant
  },
  cardHeadingDisabled: {
    opacity: 0.5,
  },
  
  // Disabled styles for non-premium cards
  cardDisabled: {
    opacity: 0.7,
  },
  cardGradientDisabled: {
    opacity: 0.8,
  },
  cardTitleDisabled: {
    opacity: 0.85,
  },
  cardSubtextDisabled: {
    opacity: 0.75,
  },
  cardLockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    zIndex: 10,
    borderRadius: 28,
  },
  cardImageDisabled: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    zIndex: 10,
    borderRadius: 20,
  },
});


