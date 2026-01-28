// app/(tabs)/meals/training-statistics.tsx
// Training Statistics Screen

import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Dimensions, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withRepeat, Easing } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { theme } from "@/constants/theme";
import { useAvailableModes } from "@/hooks/useAvailableModes";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";
import { useMostLoggedExercises, TimeInterval } from "@/hooks/useMostLoggedExercises";
import { useMode } from "@/providers/ModeContext";

/**
 * Format a date string (YYYY-MM-DD) to a readable format
 * Handles edge cases: invalid dates, empty strings, malformed dates
 */
function formatDate(dateString: string): string {
  if (!dateString || !dateString.trim()) {
    return 'Unknown date';
  }
  
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      return dateString; // Return as-is if format is unexpected
    }
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return dateString; // Return as-is if parsing fails
    }
    
    const date = new Date(year, month - 1, day);
    
    // Validate date object
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if date is invalid
    }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${year}`;
  } catch (error) {
    console.error('❌ [TrainingStatistics] Error formatting date:', error);
    return dateString; // Return as-is on error
  }
}

/**
 * Format a number with commas
 * Handles edge cases: null, undefined, NaN, Infinity
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (typeof num !== 'number') return 'N/A';
  if (isNaN(num) || !isFinite(num)) return 'N/A';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Get mode label
 */
function getModeLabel(modeKey: string, availableModes: any[]): string {
  const mode = availableModes.find(m => m.key === modeKey);
  return mode?.label || modeKey;
}

/**
 * Get mode icon (returns library and name)
 */
function getModeIcon(modeKey: string): { lib: 'ion' | 'mci'; name: string } {
  const iconMap: Record<string, { lib: 'ion' | 'mci'; name: string }> = {
    "lifting": { lib: 'mci', name: 'dumbbell' },
    "basketball": { lib: 'ion', name: 'basketball-outline' },
    "football": { lib: 'ion', name: 'american-football-outline' },
    "baseball": { lib: 'mci', name: 'baseball' },
    "soccer": { lib: 'ion', name: 'football-outline' },
    "hockey": { lib: 'mci', name: 'hockey-sticks' },
    "tennis": { lib: 'ion', name: 'tennisball-outline' },
  };
  return iconMap[modeKey] || { lib: 'mci', name: 'dumbbell' };
}

/**
 * Get record label for display
 */
function getRecordLabel(key: string): string {
  const labels: Record<string, string> = {
    repsXWeight: 'Highest Reps × Weight',
    reps: 'Highest Reps',
    weight: 'Highest Weight',
    shootingPercentage: 'Highest Shooting %',
    attempted: 'Highest Attempted',
    made: 'Highest Made',
    distance: 'Highest Distance',
    shotsReps: 'Highest Reps',
    drillReps: 'Highest Reps',
    time: 'Highest Time',
    completionPercentage: 'Highest Completion %',
    repsPerMinute: 'Highest Reps/Min',
    sprintDistance: 'Highest Distance',
    speed: 'Highest Speed',
    sprintReps: 'Highest Reps',
    hittingReps: 'Highest Reps',
    avgDistance: 'Highest Avg. Distance',
    fieldingRepsXDistance: 'Highest Reps × Distance',
    fieldingReps: 'Highest Reps',
    fieldingDistance: 'Highest Distance',
    points: 'Highest Points',
    rallyTime: 'Highest Time',
  };
  return labels[key] || key;
}

/**
 * Get record unit for display
 */
function getRecordUnit(key: string): string {
  const units: Record<string, string> = {
    repsXWeight: '',
    reps: ' reps',
    weight: ' lbs',
    shootingPercentage: '%',
    attempted: ' shots',
    made: ' shots',
    distance: ' ft',
    shotsReps: ' reps',
    drillReps: ' reps',
    time: ' min',
    completionPercentage: '%',
    repsPerMinute: ' reps/min',
    sprintDistance: ' ft',
    speed: ' ft/sec',
    sprintReps: ' reps',
    hittingReps: ' reps',
    avgDistance: ' ft',
    fieldingRepsXDistance: '',
    fieldingReps: ' reps',
    fieldingDistance: ' ft',
    points: ' pts',
    rallyTime: ' min',
  };
  return units[key] || '';
}

/**
 * Animated Record Row Component
 * Circles animate from left, text from right
 */
function AnimatedRecordRow({ 
  value, 
  recordKey, 
  dateAchieved, 
  index 
}: { 
  value: number; 
  recordKey: string; 
  dateAchieved?: string; 
  index: number;
}) {
  const screenWidth = Dimensions.get('window').width;
  const circleTranslateX = useSharedValue(-screenWidth);
  const textTranslateX = useSharedValue(screenWidth);

  useEffect(() => {
    // Reset positions
    circleTranslateX.value = -screenWidth;
    textTranslateX.value = screenWidth;
    
    // Stagger animation: each record starts slightly after the previous
    const delay = index * 100; // 100ms delay between each record
    
    circleTranslateX.value = withDelay(
      delay,
      withSpring(0, { damping: 35, stiffness: 100 })
    );
    textTranslateX.value = withDelay(
      delay,
      withSpring(0, { damping: 35, stiffness: 100 })
    );
  }, [value, recordKey, dateAchieved]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: circleTranslateX.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: textTranslateX.value }],
  }));

  return (
    <View style={styles.recordRow}>
      {/* Circle with number and date below */}
      <Animated.View style={[styles.recordCircleContainer, circleAnimatedStyle]}>
        <View style={styles.recordCircleGlow}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 1)']}
            locations={[0, 0.3, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.recordCircle}
          >
            <Text style={styles.recordCircleText}>
              {formatNumber(value)}{getRecordUnit(recordKey)}
            </Text>
          </LinearGradient>
        </View>
        {/* Date below circle */}
        {dateAchieved && (
          <Text style={styles.recordDate}>
            {formatDate(dateAchieved)}
          </Text>
        )}
      </Animated.View>
      {/* Label to the right */}
      <Animated.Text style={[styles.recordLabel, textAnimatedStyle]}>
        {getRecordLabel(recordKey)}
      </Animated.Text>
    </View>
  );
}

export default function TrainingStatisticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { availableModes } = useAvailableModes();
  const { mode: currentMode } = useMode();

  // Spinning star animation for search loading
  const searchStarRotation = useSharedValue(0);
  
  useEffect(() => {
    if (exercisesLoading) {
      searchStarRotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      searchStarRotation.value = 0;
    }
  }, [exercisesLoading]);

  const searchLoadingStarAnimated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${searchStarRotation.value}deg` }],
  }));

  // Spinning star animation for exercise frequency loading
  const exercisesStarRotation = useSharedValue(0);
  
  useEffect(() => {
    if (exercisesLoading) {
      exercisesStarRotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      exercisesStarRotation.value = 0;
    }
  }, [exercisesLoading]);

  const exercisesStarAnimated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${exercisesStarRotation.value}deg` }],
  }));

  // Spinning star animation for records loading
  const recordsStarRotation = useSharedValue(0);
  
  useEffect(() => {
    if (recordsLoading) {
      recordsStarRotation.value = withRepeat(
        withTiming(360, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      recordsStarRotation.value = 0;
    }
  }, [recordsLoading]);

  const recordsStarAnimated = useAnimatedStyle(() => ({
    transform: [{ rotate: `${recordsStarRotation.value}deg` }],
    width: 40,
    height: 40,
  }));

  // Mode selection (shared for both sections)
  // Initialize with current mode or first available mode
  const initialMode = currentMode || (availableModes.length > 0 ? availableModes[0].key : 'lifting');
  const [selectedMode, setSelectedMode] = useState<string>(initialMode);
  const [showModePicker, setShowModePicker] = useState(false);

  // Personal Records section
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [isTouchingSearchResults, setIsTouchingSearchResults] = useState(false);
  const {
    record,
    isLoading: recordsLoading,
    error: recordsError,
    searchExercise,
    clearSearch,
  } = usePersonalRecords();

  // Most Logged Exercises section
  const {
    exercises,
    isLoading: exercisesLoading,
    error: exercisesError,
    timeInterval,
    setTimeInterval,
    setMode: setExercisesMode,
    refetch,
  } = useMostLoggedExercises({
    initialTimeInterval: 30,
    initialMode: initialMode,
  });

  // Track height of exercises list for dashed line
  const [exercisesListHeight, setExercisesListHeight] = useState(0);

  // Time interval bar animation
  const timeIntervalOptions = [
    { value: 30, label: '1M' },
    { value: 90, label: '3M' },
    { value: 180, label: '6M' },
    { value: 360, label: '1Y' },
  ];
  const selectedIndex = timeIntervalOptions.findIndex(opt => opt.value === timeInterval);
  const markerPosition = useSharedValue(selectedIndex >= 0 ? selectedIndex : 0);
  const barWidth = useSharedValue(0);
  
  useEffect(() => {
    const newIndex = timeIntervalOptions.findIndex(opt => opt.value === timeInterval);
    if (newIndex !== -1) {
      markerPosition.value = withSpring(newIndex, {
        damping: 40,
        stiffness: 200,
      });
    }
  }, [timeInterval]);

  const markerAnimatedStyle = useAnimatedStyle(() => {
    if (barWidth.value === 0) {
      return { opacity: 0 };
    }
    const availableWidth = barWidth.value - 8;
    const optionWidth = availableWidth / timeIntervalOptions.length;
    const leftPosition = markerPosition.value * optionWidth + 4;
    return {
      position: 'absolute',
      left: leftPosition,
      width: optionWidth,
      top: 4,
      bottom: 4,
      opacity: 1,
    };
  });

  // Update exercises mode when selected mode changes
  useEffect(() => {
    setExercisesMode(selectedMode);
  }, [selectedMode, setExercisesMode]);

  // Handle exercise search
  const handleSearch = () => {
    const trimmedQuery = exerciseSearchQuery.trim();
    // Validate: must have at least 1 character
    if (trimmedQuery.length >= 1) {
      searchExercise(trimmedQuery, selectedMode);
      setShowExerciseSearch(false);
    } else {
      clearSearch();
      setShowExerciseSearch(false);
    }
  };

  // Get all unique exercise names from most logged exercises for search
  const allExercises = Array.from(new Set(exercises.map(e => e.exerciseName))).sort();
  
  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    if (!exerciseSearchQuery.trim()) return [];
    const queryLower = exerciseSearchQuery.toLowerCase().trim();
    return allExercises.filter(exercise => {
      const exerciseLower = exercise.toLowerCase();
      return exerciseLower.includes(queryLower);
    });
  }, [exerciseSearchQuery, allExercises]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Gradient - Minty Green (like consistency score) */}
      <LinearGradient
        colors={['rgba(152, 251, 152, 0.05)', 'rgba(13, 27, 43, 0.5)', '#070B10']}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEnabled={!isTouchingSearchResults}
      >
        {/* Personal Records Section */}
        <View style={styles.section}>
          {/* Sport Mode Dropdown - Centered heading like skill map/progress graph */}
          <View style={styles.topSection}>
            <Pressable
              style={styles.floatingModeButton}
              onPress={() => setShowModePicker(!showModePicker)}
            >
              <View style={styles.floatingModeTextContainer}>
                <Text style={styles.floatingModeText}>
                  {selectedMode ? getModeLabel(selectedMode, availableModes) : 'Select Mode'}
                </Text>
                <Ionicons 
                  name="chevron-down" 
                  size={20} 
                  color="rgba(255, 255, 255, 0.8)" 
                  style={styles.floatingModeArrow} 
                />
              </View>
            </Pressable>

            {/* Mode Picker Dropdown */}
            {showModePicker && (
              <View style={[styles.extremeGlassPickerContainer, { marginTop: 8 }]}>
                <BlurView
                  intensity={50}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
                  locations={[0, 0.3, 0.7, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.12)', 'transparent', 'transparent']}
                  locations={[0, 0.2, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.pickerContent}>
                  {availableModes.map((mode) => {
                    const iconConfig = getModeIcon(mode.key);
                    return (
                      <Pressable
                        key={mode.key}
                        onPress={() => {
                          setSelectedMode(mode.key);
                          setShowModePicker(false);
                          clearSearch(); // Clear personal records search when mode changes
                        }}
                        style={[
                          styles.extremeGlassPickerItem,
                          selectedMode === mode.key && styles.extremeGlassPickerItemSelected,
                        ]}
                      >
                        {iconConfig.lib === 'ion' ? (
                          <Ionicons 
                            name={iconConfig.name as any} 
                            size={22} 
                            color={selectedMode === mode.key ? "#FFFFFF" : "rgba(255, 255, 255, 0.9)"} 
                          />
                        ) : (
                          <MaterialCommunityIcons 
                            name={iconConfig.name as any} 
                            size={22} 
                            color={selectedMode === mode.key ? "#FFFFFF" : "rgba(255, 255, 255, 0.9)"} 
                          />
                        )}
                        <Text style={[
                          styles.extremeGlassPickerItemText,
                          selectedMode === mode.key && styles.extremeGlassPickerItemTextSelected,
                        ]}>
                          {mode.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Exercise Search Bar - Same as skill map/progress graph */}
            <View style={styles.searchBarContainer}>
              <BlurView
                intensity={20}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.searchBarPill}>
                <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.6)" style={{ marginRight: 8 }} />
                <TextInput
                  value={exerciseSearchQuery}
                  onChangeText={(text) => {
                    setExerciseSearchQuery(text);
                    if (text.length > 0) {
                      setShowExerciseSearch(true);
                    } else {
                      setShowExerciseSearch(false);
                    }
                  }}
                  placeholder="Search exercise..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.searchBarText}
                  autoCorrect={false}
                  autoCapitalize="none"
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  onFocus={() => {
                    if (exerciseSearchQuery.length > 0) {
                      setShowExerciseSearch(true);
                    }
                  }}
                />
                {exerciseSearchQuery.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setExerciseSearchQuery("");
                      clearSearch();
                      setShowExerciseSearch(false);
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.5)" />
                  </Pressable>
                )}
                {exerciseSearchQuery.length > 0 && (
                  <Pressable
                    onPress={handleSearch}
                    style={{ padding: 4, marginLeft: 4 }}
                    disabled={recordsLoading}
                  >
                    <Ionicons name="search" size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Exercise Search Results - Show when searching */}
            {showExerciseSearch && exerciseSearchQuery.trim().length > 0 && (
              <View 
                style={styles.searchResultsContainer}
                onTouchStart={() => setIsTouchingSearchResults(true)}
                onTouchEnd={() => setIsTouchingSearchResults(false)}
                onTouchCancel={() => setIsTouchingSearchResults(false)}
              >
                <BlurView
                  intensity={25}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)']}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                />
                {exercisesLoading ? (
                  <View style={styles.searchLoadingContainer}>
                    <Animated.View style={[searchLoadingStarAnimated, { width: 40, height: 40 }]}>
                      <Image
                        source={require("../../../assets/star.png")}
                        style={styles.searchLoadingStar}
                        resizeMode="contain"
                      />
                    </Animated.View>
                    <Text style={styles.searchLoadingText}>Loading exercises...</Text>
                  </View>
                ) : (
                  <ScrollView 
                    style={styles.searchResults}
                    contentContainerStyle={styles.searchResultsContent}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    scrollEventThrottle={16}
                    onScrollBeginDrag={() => setIsTouchingSearchResults(true)}
                    onScrollEndDrag={() => setIsTouchingSearchResults(false)}
                    onMomentumScrollEnd={() => setIsTouchingSearchResults(false)}
                  >
                    {filteredExercises.length === 0 ? (
                      <View style={styles.noResultsContainer}>
                        <Ionicons name="search-outline" size={32} color="rgba(255, 255, 255, 0.3)" />
                        <Text style={styles.noResultsText}>
                          {exerciseSearchQuery.trim() 
                            ? `No exercises found for "${exerciseSearchQuery}"`
                            : "No exercises available"}
                        </Text>
                      </View>
                    ) : (
                      filteredExercises.map((exercise) => {
                        const queryLower = exerciseSearchQuery.toLowerCase();
                        const exerciseLower = exercise.toLowerCase();
                        const matchIndex = exerciseLower.indexOf(queryLower);
                        
                        return (
                          <Pressable
                            key={exercise}
                            style={styles.searchResultItem}
                            onPress={() => {
                              setExerciseSearchQuery(exercise);
                              searchExercise(exercise, selectedMode);
                              setShowExerciseSearch(false);
                            }}
                          >
                            <Text style={styles.searchResultText}>
                              {matchIndex >= 0 && queryLower ? (
                                <>
                                  {exercise.substring(0, matchIndex)}
                                  <Text style={styles.searchResultHighlight}>
                                    {exercise.substring(matchIndex, matchIndex + queryLower.length)}
                                  </Text>
                                  {exercise.substring(matchIndex + queryLower.length)}
                                </>
                              ) : (
                                exercise
                              )}
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Loading State */}
          {recordsLoading && (
            <View style={styles.loadingContainer}>
              <Animated.View style={recordsStarAnimated}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={styles.loadingStar}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
          )}

          {/* Error State */}
          {recordsError && !recordsLoading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={24} color="#FF3B30" />
              <Text style={styles.errorText}>Error loading personal records</Text>
            </View>
          )}

          {/* Records Display */}
          {record && !recordsLoading && !recordsError && (
            <>
              {/* Record Rows - Circle with number on left, label on right, date below circle */}
              <View style={styles.recordsList}>
                {Object.entries(record.records)
                  .filter(([key, value]) => {
                    // Filter out null, undefined, NaN, and Infinity values
                    return value !== null && 
                           value !== undefined && 
                           typeof value === 'number' && 
                           isFinite(value);
                  })
                  .map(([key, value], index) => {
                    return (
                      <AnimatedRecordRow
                        key={key}
                        recordKey={key}
                        value={value}
                        dateAchieved={record.dateAchieved}
                        index={index}
                      />
                    );
                  })}
              </View>

              {Object.values(record.records).every(v => 
                v === null || 
                v === undefined || 
                (typeof v === 'number' && (!isFinite(v) || isNaN(v)))
              ) && (
                <Text style={styles.noRecordsText}>No records found for this exercise</Text>
              )}
            </>
          )}

          {/* Empty State */}
          {!record && !recordsLoading && !recordsError && exerciseSearchQuery.trim() === '' && (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.emptyText}>Search for an exercise to see your personal records</Text>
            </View>
          )}

          {/* No Results - Only show when not showing search results */}
          {!record && !recordsLoading && !recordsError && exerciseSearchQuery.trim() !== '' && !showExerciseSearch && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.emptyText}>No records found for "{exerciseSearchQuery}"</Text>
            </View>
          )}
        </View>

        {/* Most Logged Exercises Section */}
        <View style={styles.section}>
          {/* Divider */}
          <View style={styles.divider} />
          
          {/* Centered heading */}
          <Text style={styles.exerciseFrequencyHeading}>Exercise Frequency</Text>

          {/* Time Interval Bar - Same as skill map */}
          <View style={styles.timeIntervalBarContainer}>
            <View 
              style={styles.timeIntervalBar}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                barWidth.value = width;
              }}
            >
              {/* Animated selection marker */}
              <Animated.View style={[styles.timeIntervalMarker, markerAnimatedStyle]} />
              
              {/* Time interval options */}
              {timeIntervalOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.timeIntervalOption}
                  onPress={() => setTimeInterval(option.value as TimeInterval)}
                >
                  <Text
                    style={[
                      styles.timeIntervalOptionText,
                      timeInterval === option.value && styles.timeIntervalOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Loading State */}
          {exercisesLoading && (
            <View style={styles.loadingContainer}>
              <Animated.View style={[exercisesStarAnimated, { width: 40, height: 40 }]}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={styles.loadingStar}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.loadingText}>Loading exercises...</Text>
            </View>
          )}

          {/* Error State */}
          {exercisesError && !exercisesLoading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={24} color="#FF3B30" />
              <Text style={styles.errorText}>Error loading exercises</Text>
              <Pressable style={styles.retryButton} onPress={refetch}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Exercises List */}
          {exercises.length > 0 && !exercisesLoading && !exercisesError && (
            <View style={styles.exercisesListContainer}>
              <View 
                style={styles.exercisesList}
                onLayout={(e) => setExercisesListHeight(e.nativeEvent.layout.height)}
              >
                {exercises
                  .filter(exercise => exercise.exerciseName && exercise.exerciseName.trim().length > 0)
                  .map((exercise, index) => {
                    // Determine color based on rank (index 0 = #1, index 1 = #2, etc.)
                    let countColor = "#FF5A5A"; // Default: red for below top 20
                    if (index < 3) {
                      countColor = "#17D67F"; // Light green for top 3
                    } else if (index < 7) {
                      countColor = "#4A9EFF"; // Light blue for top 7
                    } else if (index < 20) {
                      countColor = "#A78BFA"; // Light purple for top 20
                    }
                    
                    return (
                      <View key={`${exercise.exerciseName}-${index}`} style={styles.exerciseItem}>
                        {/* Number on the left */}
                        <View style={styles.exerciseNumberContainer}>
                          <Text style={[styles.exerciseItemCount, { color: countColor }]}>
                            {exercise.count > 0 ? `${exercise.count}x` : '0x'}
                          </Text>
                        </View>
                      
                      {/* Exercise name in white bar - extends to right */}
                      <View style={styles.exerciseBarContainer}>
                        <View style={styles.exerciseBarGlow}>
                          <LinearGradient
                            colors={['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 1)']}
                            locations={[0, 0.3, 0.7, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.exerciseBar}
                          >
                            <Text style={styles.exerciseItemName}>{exercise.exerciseName}</Text>
                          </LinearGradient>
                        </View>
                      </View>
                    </View>
                  );
                  })}
              </View>
              
              {/* Continuous vertical dashed line - positioned absolutely */}
              {exercisesListHeight > 0 && (
                <View style={styles.dashedLineWrapper} pointerEvents="none">
                  <Svg height={exercisesListHeight} width={5}>
                    <Line
                      x1={2.5}
                      y1={0}
                      x2={2.5}
                      y2={exercisesListHeight}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth={4}
                      strokeDasharray="6,4"
                    />
                  </Svg>
                </View>
              )}
            </View>
          )}

          {/* Empty State */}
          {exercises.length === 0 && !exercisesLoading && !exercisesError && (
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.emptyText}>
                No exercises logged in the last {timeInterval} days
              </Text>
            </View>
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  floatingModeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  floatingModeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  floatingModeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  floatingModeArrow: {
    marginLeft: 10,
  },
  extremeGlassPickerContainer: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 15,
      },
    }),
  },
  pickerContent: {
    paddingVertical: 8,
  },
  extremeGlassPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  extremeGlassPickerItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  extremeGlassPickerItemText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
  },
  extremeGlassPickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchBarContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  searchBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 16,
  },
  searchBarText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  searchResultsContainer: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: 250,
    position: 'relative',
  },
  searchResults: {
    maxHeight: 250,
  },
  searchResultsContent: {
    paddingVertical: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchResultText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  searchResultHighlight: {
    color: '#4A9EFF',
    fontWeight: '700',
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  noResultsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  searchLoadingStar: {
    width: 40,
    height: 40,
  },
  searchLoadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingStar: {
    width: 40,
    height: 40,
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: theme.colors.primary || "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  recordsList: {
    gap: 20,
    paddingHorizontal: 20,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  recordCircleContainer: {
    alignItems: "center",
    minWidth: 100,
  },
  recordCircleGlow: {
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  recordCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  recordCircleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
  },
  recordDate: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 10,
    textAlign: "center",
  },
  recordLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  noRecordsText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
    marginTop: 8,
  },
  exerciseFrequencyHeading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  timeIntervalBarContainer: {
    marginBottom: 24,
  },
  timeIntervalBar: {
    flexDirection: 'row',
    backgroundColor: '#0F1419',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
    gap: 0,
  },
  timeIntervalMarker: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
  },
  timeIntervalOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timeIntervalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  timeIntervalOptionTextActive: {
    color: '#FFFFFF',
  },
  exercisesListContainer: {
    position: "relative",
  },
  exercisesList: {
    gap: 12,
  },
  dashedLineWrapper: {
    position: "absolute",
    left: 52, // 40px number container + 12px margin
    top: 0,
    bottom: 0,
    width: 1,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    minHeight: 40,
  },
  exerciseNumberContainer: {
    width: 40,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },
  exerciseItemCount: {
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseBarContainer: {
    flex: 1,
    marginLeft: 20,
  },
  exerciseBarGlow: {
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  exerciseBar: {
    borderTopLeftRadius: 0, // Flat on the left
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 0, // Flat on the left
    borderBottomRightRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: "center",
  },
  exerciseItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
});

