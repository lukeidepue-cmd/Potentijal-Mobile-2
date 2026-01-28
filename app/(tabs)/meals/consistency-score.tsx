// app/(tabs)/meals/consistency-score.tsx
// Consistency Score Screen - Premium Redesign

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { theme } from "@/constants/theme";
import { useConsistencyScore } from "@/hooks/useConsistencyScore";
import { ConsistencyScoreVisualization } from "@/components/ConsistencyScoreVisualization";
import { HelpOverlay } from "@/components/HelpOverlay";

/**
 * Format a date string (YYYY-MM-DD) to a readable format
 */
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
}

/**
 * Format a week date range
 */
function formatWeekRange(startDate: string, endDate: string): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return `${start} - ${end}`;
}

export default function ConsistencyScoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentWeek,
    historicalWeeks,
    averageScore,
    isLoading,
    error,
    refetch,
  } = useConsistencyScore();
  const [showHelp, setShowHelp] = useState(false);

  // Animation for bouncing stars loading
  const star1Y = useSharedValue(0);
  const star2Y = useSharedValue(0);
  const star3Y = useSharedValue(0);
  
  useEffect(() => {
    if (isLoading) {
      // Cancel any existing animations
      cancelAnimation(star1Y);
      cancelAnimation(star2Y);
      cancelAnimation(star3Y);
      
      // Reset to starting position immediately
      star1Y.value = 0;
      star2Y.value = 0;
      star3Y.value = 0;
      
      // Start bouncing animations with staggered delays
      // Star 1 - no delay, start immediately
      star1Y.value = withRepeat(
        withSequence(
          withTiming(-30, {
            duration: 400,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(0, {
            duration: 400,
            easing: Easing.in(Easing.ease),
          })
        ),
        -1,
        false
      );
      
      // Star 2 - 150ms delay
      star2Y.value = withDelay(
        150,
        withRepeat(
          withSequence(
            withTiming(-30, {
              duration: 400,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(0, {
              duration: 400,
              easing: Easing.in(Easing.ease),
            })
          ),
          -1,
          false
        )
      );
      
      // Star 3 - 300ms delay
      star3Y.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(-30, {
              duration: 400,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(0, {
              duration: 400,
              easing: Easing.in(Easing.ease),
            })
          ),
          -1,
          false
        )
      );
    } else {
      // Cancel animations and reset to 0
      cancelAnimation(star1Y);
      cancelAnimation(star2Y);
      cancelAnimation(star3Y);
      star1Y.value = withTiming(0, { duration: 200 });
      star2Y.value = withTiming(0, { duration: 200 });
      star3Y.value = withTiming(0, { duration: 200 });
    }
  }, [isLoading]);

  const star1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: star1Y.value }],
  }));

  const star2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: star2Y.value }],
  }));

  const star3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: star3Y.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(74, 158, 255, 0.05)', 'rgba(13, 27, 43, 0.5)', '#070B10']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header - Back Button and Help Button */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={() => setShowHelp(true)}
          style={styles.helpButton}
          hitSlop={10}
        >
          <View style={styles.helpButtonCircle}>
            <Ionicons name="help-circle" size={20} color="#FFFFFF" />
          </View>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView 
        style={[styles.scrollContainer, { marginTop: -64 }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.bouncingStarsRow}>
              <Animated.View style={star1AnimatedStyle}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={styles.loadingStar}
                  resizeMode="contain"
                />
              </Animated.View>
              <Animated.View style={star2AnimatedStyle}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={styles.loadingStar}
                  resizeMode="contain"
                />
              </Animated.View>
              <Animated.View style={star3AnimatedStyle}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={styles.loadingStar}
                  resizeMode="contain"
                />
              </Animated.View>
            </View>
            <Text style={styles.loadingText}>Loading consistency score...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={styles.errorText}>Error loading consistency score</Text>
            <Pressable style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Main Content */}
        {!isLoading && !error && currentWeek && (
          <>
            {/* Gauge with Overlay Score - No Box */}
            <View style={styles.gaugeContainer}>
              <ConsistencyScoreVisualization score={currentWeek.score} size={370} />
              {/* Score Text Stack - Overlaid on gauge */}
              <View style={styles.scoreStack}>
                <Text style={styles.bigScore}>{Math.round(currentWeek.score)}</Text>
                <Text style={styles.smallCapsLabel}>CONSISTENCY SCORE</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.sectionDivider, { marginTop: -2 }]} />

            {/* Score Breakdown */}
            <View style={styles.breakdownContainer}>
              <Text style={styles.breakdownTitle}>Score Breakdown</Text>
              <View style={styles.metricsRow}>
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>Completion</Text>
                  <Text style={styles.metricValue}>{currentWeek.workoutPercentage.toFixed(1)}%</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>Logged</Text>
                  <Text style={styles.metricValue}>{currentWeek.loggedCount} / {currentWeek.scheduledCount}</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricColumn}>
                  <Text style={styles.metricLabel}>Longest Gap</Text>
                  <Text style={styles.metricValue}>{currentWeek.longestGap} days</Text>
                </View>
              </View>
            </View>

            {/* Average Score Card */}
            {averageScore !== null && (
              <>
                <View style={styles.averageCard}>
                  <LinearGradient
                    colors={[
                      'rgba(200, 220, 255, 0.35)',  // More noticeable light blue-grey at top
                      'rgba(180, 200, 240, 0.25)',  // Slightly darker
                      'rgba(160, 180, 220, 0.15)',  // Fading
                      'rgba(140, 160, 200, 0.08)',  // More visible
                      'rgba(255, 255, 255, 0.02)',  // Very subtle white
                      'rgba(255, 255, 255, 0)'       // Transparent
                    ]}
                    locations={[0, 0.15, 0.3, 0.5, 0.75, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 0.8 }}
                    style={styles.averageCardGradient}
                  />
                  <Text style={styles.averageLabel}>Average Consistency Score</Text>
                  <Text style={styles.averageValue}>{averageScore.toFixed(1)}</Text>
                </View>
                {/* Divider after Average Card */}
                <View style={[styles.sectionDivider, { marginTop: 32 }]} />
              </>
            )}

            {/* Historical Weeks */}
            {historicalWeeks.length > 0 && (
              <View style={styles.historicalContainer}>
                <Text style={styles.historicalTitle}>Historical Weeks</Text>
                {historicalWeeks.map((week, index) => (
                  <HistoricalWeekCard
                    key={week.weekStartDate}
                    week={week}
                    index={index}
                  />
                ))}
              </View>
            )}

            {/* Empty State */}
            {!currentWeek && (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.emptyText}>Start logging workouts to see your consistency score!</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Help Overlay */}
      <HelpOverlay
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title="Consistency Score Guide"
      >
        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How Consistency Score Works</Text>
          <Text style={helpStyles.text}>
            Consistency Score measures how well you stick to your weekly workout schedule. The score is calculated each week based on two main factors: how many workouts you completed compared to what you scheduled, and how evenly you spread your workouts throughout the week.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Score Calculation</Text>
          <Text style={helpStyles.text}>
            Your consistency score is calculated using two components:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Workout Completion (80%):</Text> This measures how many scheduled workouts you actually completed. Calculated as (Logged workouts ÷ Scheduled workouts) × 100 × 0.8.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Gap Penalty (20%):</Text> This measures how evenly you spread workouts throughout the week. Points are based on your longest gap between workouts:
          </Text>
          <Text style={helpStyles.bullet}>  - 0 gaps or 1 day gaps: 20 points</Text>
          <Text style={helpStyles.bullet}>  - 2 day gap: 15 points</Text>
          <Text style={helpStyles.bullet}>  - 3 day gap: 10 points</Text>
          <Text style={helpStyles.bullet}>  - 4 day gap: 5 points</Text>
          <Text style={helpStyles.bullet}>  - 5+ day gap: 0 points</Text>
          <Text style={helpStyles.text}>
            Final Score = (Workout Completion %) + Gap Points (out of 100)
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Understanding Gaps</Text>
          <Text style={helpStyles.text}>
            A "gap" is the number of consecutive days without a logged workout within the week. The score uses your longest gap to determine the gap penalty.
          </Text>
          <Text style={helpStyles.text}>
            <Text style={helpStyles.bold}>Example:</Text> If you logged workouts on Sunday, Monday, Thursday, and Friday, you have gaps of 1 day (Tuesday), 1 day (Wednesday), and 1 day (Saturday). Your longest gap is 1 day, so you get 20 gap points.
          </Text>
          <Text style={helpStyles.text}>
            <Text style={helpStyles.bold}>Another Example:</Text> If you logged workouts on Sunday and Friday only, you have a 3-day gap (Monday-Wednesday), a 1-day gap (Thursday), and a 1-day gap (Saturday). Your longest gap is 3 days, so you get 10 gap points.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Week Definition</Text>
          <Text style={helpStyles.text}>
            Consistency scores are calculated on a weekly basis:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Week starts:</Text> Sunday (day 0)</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Week ends:</Text> Saturday (day 6)</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Current week:</Text> Shows the most recent complete week that has fully passed</Text>
          <Text style={helpStyles.text}>
            The score updates at the beginning of each new week, showing your performance for the previous complete week.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Special Cases</Text>
          <Text style={helpStyles.text}>
            The score handles special situations:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>No scheduled workouts, no logged workouts:</Text> Score = 0</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>No scheduled workouts, but you logged some:</Text> Score = Gap Points × 5 (scaled to 100). This rewards consistency even without a schedule.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Perfect week (7 consecutive days logged, no schedule):</Text> Score = 100</Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Historical Weeks</Text>
          <Text style={helpStyles.text}>
            Below the current week score, you'll see your historical consistency scores:
          </Text>
          <Text style={helpStyles.bullet}>• Each week shows the date range (Sunday to Saturday)</Text>
          <Text style={helpStyles.bullet}>• Displays logged workouts vs scheduled workouts</Text>
          <Text style={helpStyles.bullet}>• Shows week-over-week percentage change (green arrow up for improvement, red arrow down for decline)</Text>
          <Text style={helpStyles.bullet}>• Your average consistency score is calculated from the last 52 weeks (1 year)</Text>
        </View>
      </HelpOverlay>
    </View>
  );
}

/**
 * Historical Week Card Component
 * Redesigned with right-aligned score and delta badge
 */
function HistoricalWeekCard({ week, index }: { week: any; index: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.985);
    opacity.value = withTiming(0.7);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    opacity.value = withTiming(1);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.historicalCard}
      >
        <View style={styles.historicalCardContent}>
          {/* Left Column */}
          <View style={styles.historicalLeft}>
            <Text style={styles.historicalWeekRange}>
              {formatWeekRange(week.weekStartDate, week.weekEndDate)}
            </Text>
            <Text style={styles.historicalWorkouts}>
              {week.loggedCount} / {week.scheduledCount} workouts
            </Text>
          </View>

          {/* Right Column */}
          <View style={styles.historicalRight}>
            <Text style={styles.historicalScore}>{Math.round(week.score)}</Text>
            {week.percentageChange !== null && (
              <View style={styles.deltaContainer}>
                <Ionicons
                  name={week.percentageChange >= 0 ? "arrow-up" : "arrow-down"}
                  size={12}
                  color={week.percentageChange >= 0 ? "#34C759" : "#FF3B30"}
                />
                <Text style={[
                  styles.deltaText,
                  { color: week.percentageChange >= 0 ? "#34C759" : "#FF3B30" }
                ]}>
                  {week.percentageChange >= 0 ? "+" : ""}{week.percentageChange.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B10',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    position: 'relative',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButton: {
    position: 'absolute',
    right: 20,
    top: 56,
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  bouncingStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 16,
  },
  loadingStar: {
    width: 64,
    height: 64,
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    marginTop: 0,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary || "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -84, // Moved up by additional 64px (from -62 to -126)
    marginBottom: 24,
    position: 'relative',
    height: 370, // Increased by 42px more (from 288 to 330)
  },
  scoreStack: {
    position: 'absolute',
    top: 230, // Moved down 32px (from 208 to 240)
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigScore: {
    fontSize: 50, // Keep big size
    fontWeight: '600', // Match "Consistency Score" text font weight
    color: '#FFFFFF', // Keep bright white for main score
    letterSpacing: 2.5, // Match "Consistency Score" text letter spacing
    textTransform: 'uppercase', // Match "Consistency Score" text transform
    textAlign: 'center',
  },
  smallCapsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  // Divider
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 20,
    marginTop: 20, // First divider spacing
    marginBottom: 24,
  },
  // Score Breakdown
  breakdownContainer: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 17, // Reduced by 4px (from 21 to 17)
    fontWeight: '700',
    color: 'rgba(74, 158, 255, 0.9)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Average Card
  averageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 18,
    marginTop: 4, // Increased padding above by 4px
    marginBottom: 0, // Divider now handles spacing
    overflow: 'hidden',
    position: 'relative',
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Android shadow
  },
  averageCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '70%', // Covers top portion of card with radial-like fade
    borderRadius: 20,
  },
  averageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    position: 'relative',
    zIndex: 1,
  },
  averageValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    position: 'relative',
    zIndex: 1,
  },
  // Historical Weeks
  historicalContainer: {
    marginTop: 8,
  },
  historicalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  historicalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 12,
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Android shadow
  },
  historicalCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 88,
  },
  historicalLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  historicalWeekRange: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  historicalWorkouts: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  historicalRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  historicalScore: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 16,
  },
});

const helpStyles = StyleSheet.create({
  section: {
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
    marginTop: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
