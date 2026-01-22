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

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.card, animatedCardStyle, isDisabled && styles.cardDisabled]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.cardGradient, isDisabled && styles.cardGradientDisabled]}
      >
        {/* Vignette overlay - dark edges using gradient */}
        <LinearGradient
          colors={["transparent", "transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.25)"]}
          locations={[0, 0.5, 0.8, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardVignette}
        />
        
        {/* Internal highlight - soft glow blob top-left */}
        <View style={styles.cardHighlight} />
        
        {/* Noise texture overlay */}
        <View style={styles.cardNoise} />
        
        {/* Hero art layer - upper half */}
        <View style={styles.cardArtLayer}>
          {index === 1 && (
            <Image
              source={require("../../../assets/progress-graph.png")}
              style={[styles.cardImage, styles.progressGraphImage, isDisabled && styles.cardImageDisabled]}
              resizeMode="contain"
            />
          )}
          {index === 2 && (
            <Image
              source={require("../../../assets/skill-map.png")}
              style={[styles.cardImage, styles.skillMapImage, isDisabled && styles.cardImageDisabled]}
              resizeMode="contain"
            />
          )}
          {index === 3 && (
            <Image
              source={require("../../../assets/consistency-chart.png")}
              style={[styles.cardImage, styles.consistencyChartImage, isDisabled && styles.cardImageDisabled]}
              resizeMode="contain"
            />
          )}
          {index === 4 && (
            <Image
              source={require("../../../assets/training-stats.png")}
              style={[styles.cardImage, styles.trainingStatsImage, isDisabled && styles.cardImageDisabled]}
              resizeMode="contain"
            />
          )}
        </View>
        
        {/* Lock Icon Overlay for non-premium */}
        {isDisabled && (
          <View style={styles.cardLockOverlay}>
            <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
          </View>
        )}
        
        {/* Text layer - bottom-left */}
        <View style={styles.cardTextLayer}>
          {index === 1 && (
            <>
              <Text style={[styles.cardTitle, isDisabled && styles.cardTitleDisabled]}>Progress Graphs</Text>
              <Text style={[styles.cardSubtext, isDisabled && styles.cardSubtextDisabled]}>View progression in any exercise</Text>
            </>
          )}
          {index === 2 && (
            <>
              <Text style={[styles.cardTitle, isDisabled && styles.cardTitleDisabled]}>Skill Map</Text>
              <Text style={[styles.cardSubtext, isDisabled && styles.cardSubtextDisabled]}>Visually compare exercises</Text>
            </>
          )}
          {index === 3 && (
            <>
              <Text style={[styles.cardTitle, isDisabled && styles.cardTitleDisabled]}>Consistency Score</Text>
              <Text style={[styles.cardSubtext, isDisabled && styles.cardSubtextDisabled]}>Consistency is key</Text>
            </>
          )}
          {index === 4 && (
            <>
              <Text style={[styles.cardTitle, isDisabled && styles.cardTitleDisabled]}>Training Statistics</Text>
              <Text style={[styles.cardSubtext, isDisabled && styles.cardSubtextDisabled]}>Data down to every single rep</Text>
            </>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
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
  const fontsReady = geistLoaded;
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
  const aiButtonShadowOpacity = useSharedValue(0.6);
  const aiButtonShadowOffset = useSharedValue(10);

  const aiButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: aiButtonScale.value },
      { translateY: aiButtonTranslateY.value },
    ],
  }));

  const aiButtonShadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: aiButtonShadowOpacity.value,
    shadowOffset: { width: 0, height: aiButtonShadowOffset.value },
  }));

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  // Animation values for carousel
  const scrollX = useSharedValue(0);
  const cardWidth = SCREEN_WIDTH * 0.75;
  const cardGap = 20;
  const cardTotalWidth = cardWidth + cardGap;

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

  if (!fontsReady) {
    return null;
  }

  const cards = [
    { index: 1, colors: ["#5AA6FF", "#3B82F6", "#2563EB"] }, // Blue
    { index: 2, colors: ["#33D1B2", "#14B8A6", "#0D9488"] }, // Teal
    { index: 3, colors: ["#B48CFF", "#A855F7", "#9333EA"] }, // Purple
    { index: 4, colors: ["#64C878", "#4CAF50", "#2E7D32"] }, // Green
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background diagonal lines */}
      <DiagonalLines />
      
      {/* Hero Text - centered and floating */}
      <View style={styles.heroTextContainer}>
        {/* Hero title with floating depth effects */}
        <View style={styles.heroTitleGlowWrapper}>
          <Text style={styles.heroTitle}>Athletic Progress</Text>
        </View>
        <Text style={styles.heroSubtext}>
          Every session, set, and rep - transformed into meaningful progress you can see
        </Text>
      </View>

      {/* AI Trainer Button */}
      <View style={styles.aiTrainerButtonContainer}>
        <Animated.View
          style={[
            styles.buttonShadowWrapper,
            aiButtonShadowStyle,
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
                aiButtonShadowOpacity.value = withTiming(0.3, { duration: 100 });
                aiButtonShadowOffset.value = withTiming(6, { duration: 100 });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return;
              }
              if (!aiTrainerEnabled) return; // Do nothing if setting is disabled
              aiButtonScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
              aiButtonTranslateY.value = withSpring(2, { damping: 15, stiffness: 300 });
              aiButtonShadowOpacity.value = withTiming(0.3, { duration: 100 });
              aiButtonShadowOffset.value = withTiming(6, { duration: 100 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              aiButtonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
              aiButtonTranslateY.value = withSpring(0, { damping: 15, stiffness: 300 });
              aiButtonShadowOpacity.value = withTiming(0.6, { duration: 100 });
              aiButtonShadowOffset.value = withTiming(10, { duration: 100 });
            }}
            style={[
              styles.aiTrainerButton,
              (!aiTrainerEnabled || !canUseAITrainer) && styles.aiTrainerButtonDisabled,
            ]}
          >
            <LinearGradient
              colors={
                (aiTrainerEnabled && canUseAITrainer)
                  ? ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.98)"]
                  : ["rgba(200,200,200,0.5)", "rgba(180,180,180,0.5)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons
              name={canUseAITrainer ? "sparkles" : "lock-closed"}
              size={24}
              color={(aiTrainerEnabled && canUseAITrainer) ? "#74C69D" : "#999999"}
              style={{ zIndex: 1 }}
            />
            <Text
              style={[
                styles.aiTrainerButtonText,
                (!aiTrainerEnabled || !canUseAITrainer) && styles.aiTrainerButtonTextDisabled,
              ]}
            >
              AI Trainer
            </Text>
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

      {/* Cards Carousel - Animated */}
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
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
    top: "30%",
    marginTop: 92, // Moved down by 12px (from 80 to 92)
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 50,
  },
  buttonShadowWrapper: {
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#74C69D", // Mint green glow for visibility on dark background
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 14,
      },
    }),
  },
  buttonShadowWrapperDisabled: {
    ...Platform.select({
      ios: {
        shadowColor: "#666666",
        shadowRadius: 10,
        shadowOpacity: 0.3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  aiTrainerButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(116, 198, 157, 0.15)", // Subtle mint green border
    overflow: "hidden", // For gradient overlay
    position: "relative",
  },
  aiTrainerButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    fontFamily: FONT.uiSemi,
    zIndex: 1, // Above gradient
  },
  aiTrainerButtonDisabled: {
    opacity: 0.5,
  },
  aiTrainerButtonTextDisabled: {
    color: "#666666",
  },
  carousel: {
    position: "absolute",
    bottom: 88, // Moved down by 12px (from 100 to 88)
    left: 0,
    right: 0,
  },
  carouselContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 20,
  },
  card: {
    width: SCREEN_WIDTH * 0.75, // Pretty big cards - 75% of screen width
    height: 280,
    borderRadius: 28, // Bigger radius for premium feel
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)", // Subtle border stroke
    // Enhanced floating effects
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  cardGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    position: "relative",
  },
  cardVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    // Vignette using gradient overlay - dark edges
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  cardHighlight: {
    position: "absolute",
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    opacity: 0.8,
  },
  cardNoise: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    opacity: 0.08,
  },
  cardArtLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%", // Upper 60% for art
    alignItems: "center",
    justifyContent: "center",
  },
  objectShadow: {
    position: "absolute",
    bottom: 20,
    width: 200,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    transform: [{ scaleX: 1.2 }, { scaleY: 0.6 }],
    opacity: 0.6,
  },
  cardImage: {
    width: 350,
    height: 350,
    position: "relative",
    zIndex: 2,
  },
  progressGraphImage: {
    width: 300, // Smaller size
    height: 300,
    marginTop: 48, // Moved down 48px total (36px + 12px more)
  },
  consistencyChartImage: {
    width: 260, // 8px smaller (from 268)
    height: 260,
    marginTop: 48, // Moved down 48px
  },
  trainingStatsImage: {
    width: 224, // 8px smaller (from 232)
    height: 224,
    marginTop: 44, // Moved down 44px (40px + 4px more)
  },
  skillMapImage: {
    width: 308, // 10px smaller (from 318)
    height: 308,
    marginTop: 48, // Moved down 48px
  },
  cardTextLayer: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    // Bottom 40-45% for text (quiet zone)
  },
  cardTitle: {
    fontSize: 22, // Reduced by 2px (from 24)
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: FONT.uiBold,
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardSubtext: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    fontFamily: FONT.uiRegular,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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


