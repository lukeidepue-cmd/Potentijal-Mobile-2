// app/(tabs)/meals/progress-graphs.tsx
// Progress Graphs Screen

import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Dimensions, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from "react-native-reanimated";
import Svg, { G, Line as SvgLine, Path, Circle, Text as SvgText } from "react-native-svg";
import { theme } from "@/constants/theme";
import { useMode } from "@/providers/ModeContext";
import { useAvailableModes } from "@/hooks/useAvailableModes";
import { getAvailableViewsForMode } from "@/lib/api/progress-views";
import { mapModeKeyToSportMode, SportMode } from "@/lib/types";
import { TimeInterval, getTimeIntervalLabel } from "@/lib/utils/time-intervals";
import { useProgressGraphView, ProgressGraphDataPoint } from "@/hooks/useProgressGraphView";
import { getAvailableExercisesForView, searchExercisesForView } from "@/lib/api/exercise-filtering";
import { HelpOverlay } from "@/components/HelpOverlay";

// Screen dimensions for star positioning
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Generate random star positions for background
 */
function generateStars(count: number = 150) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    y: Math.random() * SCREEN_HEIGHT * 2, // Allow stars to extend beyond viewport for scrolling
    size: Math.random() * 2 + 0.5, // Size between 0.5 and 2.5
    opacity: Math.random() * 0.6 + 0.3, // Opacity between 0.3 and 0.9
  }));
}

// Helper function to format date for display
function formatDateForDisplay(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}`;
  }
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Graph Display Component
function GraphDisplay({
  data,
  minValue,
  maxValue,
  width,
  timeInterval,
}: {
  data: ProgressGraphDataPoint[];
  minValue: number | null;
  maxValue: number | null;
  width: number;
  timeInterval: TimeInterval;
}) {
  // Edge case: No valid data
  if (minValue === null || maxValue === null || width === 0) {
    return null;
  }

  // Graph dimensions and margins - right margin for Y-axis labels
  const M = { top: 20, right: 50, bottom: 40, left: 20 };
  const H = 300; // Height
  const W = width || 300;
  const chartWidth = W - M.left - M.right;
  const chartHeight = H - M.top - M.bottom;

  // Calculate actual min/max from data
  const actualValues = data
    .map(p => p.value)
    .filter((v): v is number => v !== null && v !== undefined);
  
  const actualMin = actualValues.length > 0 ? Math.min(...actualValues) : minValue;
  const actualMax = actualValues.length > 0 ? Math.max(...actualValues) : maxValue;
  
  if (actualMin === null || actualMax === null) {
    return null;
  }

  const range = actualMax - actualMin;
  const isConstant = range === 0;

  let displayMin = actualMin;
  let displayMax = actualMax;
  let displayRange = range;
  
  if (isConstant) {
    const valueMagnitude = Math.abs(actualMin);
    let padding: number;
    
    if (valueMagnitude >= 100) {
      padding = valueMagnitude * 0.2;
    } else if (valueMagnitude >= 10) {
      padding = valueMagnitude * 0.1;
    } else {
      padding = Math.max(valueMagnitude * 0.1, 1);
    }
    
    displayMin = actualMin - padding;
    displayMax = actualMax + padding;
    displayRange = displayMax - displayMin;
  }

  // Calculate 6 evenly spaced Y-axis ticks for labels
  const yTicks: number[] = [];
  for (let i = 0; i < 6; i++) {
    const tick = displayMin + (displayRange * (i / 5));
    yTicks.push(tick);
  }

  // Y-axis positioning function
  const yFor = (value: number, isDataPoint: boolean = false): number => {
    const ratio = (value - displayMin) / displayRange;
    const y = M.top + chartHeight - (chartHeight * ratio);
    
    if (isConstant && isDataPoint) {
      return M.top + chartHeight / 2;
    }
    
    return y;
  };

  // Format tick labels appropriately
  const formatTickLabel = (value: number): string => {
    if (Math.abs(value) >= 1000) {
      return value.toFixed(0);
    } else if (Math.abs(value) >= 10) {
      return value.toFixed(1);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(2);
    } else {
      return value.toFixed(3);
    }
  };

  // X-axis positioning function
  const xFor = (bucketIndex: number): number => {
    const position = 5 - bucketIndex;
    return M.left + (chartWidth * (position / 5));
  };

  // Sort data by bucketIndex
  const sortedData = [...data].sort((a, b) => b.bucketIndex - a.bucketIndex);

  // Build line path
  const pointsWithValues = sortedData
    .filter(p => p.value !== null)
    .map(p => ({
      bucketIndex: p.bucketIndex,
      value: p.value!,
      x: xFor(p.bucketIndex),
      y: yFor(p.value!, true),
    }))
    .sort((a, b) => a.x - b.x);
  
  let linePath = "";
  pointsWithValues.forEach((point, i) => {
    if (i === 0) {
      linePath = `M ${point.x} ${point.y}`;
    } else {
      linePath += ` L ${point.x} ${point.y}`;
    }
  });


  return (
    <Svg width={W} height={H}>
      {/* X-axis labels - no line */}
      <G>
        {Array.from({ length: 6 }, (_, i) => 5 - i).map((bucketIndex) => {
          const x = xFor(bucketIndex);
          
          const bucketSizeDays = timeInterval === 30 ? 5 : timeInterval === 90 ? 15 : timeInterval === 180 ? 30 : 60;
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          
          const bucketEndDate = new Date(today);
          bucketEndDate.setDate(bucketEndDate.getDate() - (bucketIndex * bucketSizeDays));
          bucketEndDate.setHours(23, 59, 59, 999);
          
          const year = bucketEndDate.getFullYear();
          const month = String(bucketEndDate.getMonth() + 1).padStart(2, '0');
          const day = String(bucketEndDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          const displayLabel = formatDateForDisplay(dateStr);
          
          return (
            <SvgText
              key={`x-${bucketIndex}`}
              x={x}
              y={H - 12}
              fill="#9E9E9E"
              fontSize={10}
              textAnchor="middle"
            >
              {displayLabel}
            </SvgText>
          );
        })}
      </G>

      {/* Y-axis labels - no line, positioned on the right */}
      <G>
        {yTicks.map((tick, i) => {
          const y = yFor(tick, false);
          return (
            <SvgText
              key={`y-${i}`}
              x={W - M.right + 10}
              y={y + 3}
              fill="#9E9E9E"
              fontSize={10}
              textAnchor="start"
            >
              {formatTickLabel(tick)}
            </SvgText>
          );
        })}
      </G>

      {/* Data line with glow effect */}
      {linePath && (
        <>
          {/* Glow layer - subtle bright green glow */}
          <Path
            d={linePath}
            fill="none"
            stroke="#17D67F"
            strokeWidth={5}
            opacity={0.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Main line - green */}
          <Path
            d={linePath}
            fill="none"
            stroke="#17D67F"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Data points */}
      {sortedData.map((point) => {
        if (point.value === null) return null;
        const x = xFor(point.bucketIndex);
        const y = yFor(point.value, true);
        return (
          <Circle
            key={`pt-${point.bucketIndex}`}
            cx={x}
            cy={y}
            r={4.5}
            stroke="#0F1419"
            strokeWidth={2}
            fill="#17D67F"
          />
        );
      })}

    </Svg>
  );
}

export default function ProgressGraphsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: currentMode, modeLoading } = useMode();
  const { availableModes } = useAvailableModes();

  // Generate stars for background
  const [stars] = useState(() => generateStars(150));

  // State management
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(90);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [showModePicker, setShowModePicker] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [isTouchingSearchResults, setIsTouchingSearchResults] = useState(false);
  const [graphWidth, setGraphWidth] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // Update selectedMode when currentMode loads
  useEffect(() => {
    if (!modeLoading && currentMode) {
      setSelectedMode(currentMode);
    }
  }, [currentMode, modeLoading]);

  // Get available views for selected mode
  const sportMode = useMemo(() => 
    selectedMode ? mapModeKeyToSportMode(selectedMode) : 'workout',
    [selectedMode]
  );
  const availableViews = useMemo(() => {
    return getAvailableViewsForMode(sportMode);
  }, [sportMode]);

  // Set default view when mode changes
  useEffect(() => {
    if (availableViews.length > 0 && !availableViews.find(v => v.name === selectedView)) {
      setSelectedView(availableViews[0].name);
      setSelectedExercise("");
    }
  }, [availableViews, selectedView]);

  // Load available exercises when view changes
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  useEffect(() => {
    if (!selectedView) {
      setAvailableExercises([]);
      return;
    }

    setLoadingExercises(true);
    getAvailableExercisesForView(sportMode, selectedView)
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ [ProgressGraphs] Error loading exercises:', error);
          setAvailableExercises([]);
        } else {
          setAvailableExercises(data || []);
        }
        setLoadingExercises(false);
      })
      .catch((err) => {
        console.error('❌ [ProgressGraphs] Exception loading exercises:', err);
        setAvailableExercises([]);
        setLoadingExercises(false);
      });
  }, [sportMode, selectedView]);

  // Filter exercises by search query
  const filteredExercises = useMemo(() => {
    if (!exerciseSearchQuery.trim()) {
      return availableExercises;
    }
    return availableExercises.filter(ex => {
      const nameLower = ex.toLowerCase();
      const queryLower = exerciseSearchQuery.toLowerCase();
      return nameLower.includes(queryLower) || queryLower.includes(nameLower);
    });
  }, [availableExercises, exerciseSearchQuery]);

  // Determine which exercise to use
  const exerciseFilter = selectedExercise || (exerciseSearchQuery.trim() || undefined);

  // Connect to data hook
  const { data: graphData, minValue, maxValue, loading: loadingData, error: dataError } = useProgressGraphView({
    mode: sportMode,
    view: selectedView || '',
    exercise: exerciseFilter,
    timeInterval,
  });

  // Spinning star animation for loading state
  const starRotation = useSharedValue(0);
  
  useEffect(() => {
    if (loadingData) {
      starRotation.value = withRepeat(
        withTiming(360, {
          duration: 800,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      starRotation.value = 0;
    }
  }, [loadingData]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // Get mode label
  const getModeLabel = (modeKey: string) => {
    const mode = availableModes.find(m => m.key === modeKey);
    return mode?.label || modeKey;
  };

  // Get mode icon
  const getModeIcon = (modeKey: string) => {
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
  };

  // Get display name for view (frontend display only, backend keeps original names)
  const getViewDisplayName = (mode: SportMode, viewName: string): string => {
    // All modes
    if (viewName === 'Performance') return 'Peak Set';
    if (viewName === 'Tonnage') return 'Volume';

    // Mode-specific mappings
    if (mode === 'basketball') {
      if (viewName === 'Shooting %') return 'Shooting %';
      if (viewName === 'Jumpshot') return 'Total Shots';
      if (viewName === 'Drill') return 'Total Drill Reps';
    }
    
    if (mode === 'football') {
      if (viewName === 'Completion') return 'Drill %';
      if (viewName === 'Drill') return 'Total Drill Reps';
      if (viewName === 'Speed') return 'Sprint Speed';
      if (viewName === 'Sprints') return 'Total Sprints';
    }
    
    if (mode === 'baseball') {
      if (viewName === 'Hits') return 'Total Hits';
      if (viewName === 'Distance') return 'Hitting Distance';
      if (viewName === 'Fielding') return 'Total Throws';
      if (viewName === 'Fielding Distance') return 'Fielding Distance';
    }
    
    if (mode === 'soccer') {
      if (viewName === 'Drill') return 'Total Drill Reps';
      if (viewName === 'Shots') return 'Total Shots';
      if (viewName === 'Shot Distance') return 'Shot Distance';
    }
    
    if (mode === 'hockey') {
      if (viewName === 'Drill') return 'Total Drill Reps';
      if (viewName === 'Shots') return 'Total Shots';
      if (viewName === 'Shot Distance') return 'Shot Distance';
    }
    
    if (mode === 'tennis') {
      if (viewName === 'Drill') return 'Total Drill Reps';
      if (viewName === 'Rally') return 'Rally Points';
    }

    // Default: return original name if no mapping found
    return viewName;
  };

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

  return (
    <View style={styles.container}>
      {/* Full Screen Gradient from starry GREEN background to normal background */}
      <LinearGradient
        colors={[
          'rgba(13, 50, 30, 0.95)', // Green starry background at top
          'rgba(13, 50, 30, 0.9)',
          'rgba(13, 50, 30, 0.7)',
          'rgba(13, 50, 30, 0.5)',
          'rgba(13, 50, 30, 0.3)', // Starting to fade
          'rgba(10, 15, 22, 0.6)', // Transitioning to black
          theme.colors.bg0, // Black background starts around divider
          theme.colors.bg0, // Black continues
          theme.colors.bg0, // Black all the way down
        ]}
        locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.8, 0.9, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      
      {/* Stars Layer - Fixed background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {stars.map((star) => (
          <View
            key={star.id}
            style={{
              position: 'absolute',
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#FFFFFF',
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {/* Header - Back Button and Help Button */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isTouchingSearchResults}
      >
        {/* Header Section - Heading centered, Search below */}
        <View style={styles.topSection}>
          {/* Sport Mode Dropdown - Centered */}
          <Pressable
            style={styles.floatingModeButton}
            onPress={() => setShowModePicker(!showModePicker)}
          >
            <View style={styles.floatingModeTextContainer}>
              <Text style={styles.floatingModeText}>
                {selectedMode ? getModeLabel(selectedMode) : 'Select Mode'}
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
            <View style={styles.extremeGlassPickerContainer}>
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

          {/* Exercise Search Bar - Below heading, exactly like skill map */}
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
                  if (text.length > 0 && selectedView) {
                    setShowExerciseSearch(true);
                  }
                }}
                placeholder="Search exercises..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.searchBarText}
                autoCorrect={false}
                autoCapitalize="none"
                onFocus={() => {
                  if (selectedView) {
                    setShowExerciseSearch(true);
                  }
                }}
              />
              {exerciseSearchQuery.length > 0 && (
                <Pressable
                  onPress={() => {
                    setExerciseSearchQuery("");
                    setShowExerciseSearch(false);
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.5)" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Exercise Search Results - Show when searching */}
          {showExerciseSearch && selectedView && (
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
              {loadingExercises ? (
                <View style={styles.searchLoadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
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
                      const isSelected = selectedExercise === exercise;
                      
                      return (
                        <Pressable
                          key={exercise}
                          style={styles.searchResultItem}
                          onPress={() => {
                            setSelectedExercise(exercise);
                            setExerciseSearchQuery(exercise);
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
                          {isSelected && (
                            <Ionicons 
                              name="checkmark-circle" 
                              size={20} 
                              color="#17D67F" 
                              style={styles.actionIcon}
                            />
                          )}
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </View>

        {/* Progress Graph - Main part, not in a box */}
        <View 
          style={styles.graphSection}
          onLayout={(e) => setGraphWidth(e.nativeEvent.layout.width - 40)}
        >
          {loadingData ? (
            <View style={styles.graphLoadingContainer}>
              <Animated.View style={starAnimatedStyle}>
                <Image
                  source={require("../../../assets/star.png")}
                  style={styles.loadingStar}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.graphLoadingText}>Loading data...</Text>
            </View>
          ) : dataError ? (
            <View style={styles.graphErrorContainer}>
              <Ionicons name="alert-circle" size={32} color="#FF5A5A" />
              <Text style={styles.graphErrorText}>Error loading data</Text>
              <Text style={styles.graphErrorSubtext}>{dataError.message || "Unknown error"}</Text>
            </View>
          ) : !selectedView ? (
            <View style={styles.graphEmptyContainer}>
              <Text style={styles.graphPlaceholderText}>Select a view to see progress</Text>
            </View>
          ) : graphData.length === 0 || (minValue === null && maxValue === null) ? (
            <View style={styles.graphEmptyContainer}>
              <Text style={styles.graphPlaceholderText}>No data available</Text>
              <Text style={styles.graphPlaceholderSubtext}>
                {exerciseFilter ? `No data found for "${exerciseFilter}"` : "Select or search for an exercise to see progress"}
              </Text>
            </View>
          ) : (
            <GraphDisplay
              data={graphData}
              minValue={minValue}
              maxValue={maxValue}
              width={graphWidth}
              timeInterval={timeInterval}
            />
          )}
        </View>

        {/* Divider - Under x-axis */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
        </View>

        {/* Time Interval Bar */}
        <View style={styles.timeIntervalBarContainer}>
          <View 
            style={styles.timeIntervalBar}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              barWidth.value = width;
            }}
          >
            <Animated.View style={[styles.timeIntervalMarker, markerAnimatedStyle]} />
            
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

        {/* View Selection Section */}
        <View style={styles.controlsSection}>
          <Text style={styles.selectViewHeading}>Select View</Text>
          
          {availableViews.length > 0 && (
            <View style={styles.viewListContainer}>
              {availableViews.map((view) => (
                <Pressable
                  key={view.name}
                  style={styles.viewListItem}
                  onPress={() => {
                    setSelectedView(view.name);
                    setSelectedExercise("");
                  }}
                >
                  <View style={styles.viewCircleContainer}>
                    {selectedView === view.name ? (
                      <View style={styles.viewCircleFilled} />
                    ) : (
                      <View style={styles.viewCircleEmpty} />
                    )}
                  </View>
                  
                  <Text style={[
                    styles.viewListItemText,
                    selectedView === view.name && styles.viewListItemTextSelected,
                  ]}>
                    {getViewDisplayName(sportMode, view.name)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Help Overlay */}
      <HelpOverlay
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title="Progress Graphs Guide"
      >
        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How Progress Graphs Work</Text>
          <Text style={helpStyles.text}>
            Progress Graphs visualize how your performance changes over time. First, select your sport mode (like Basketball or Lifting). Then choose a view type that matches what you want to track. Finally, search for and select a specific exercise to see your progress displayed as a line graph.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Understanding View Calculations</Text>
          <Text style={helpStyles.text}>
            Each view type calculates your data differently based on what you're tracking:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Peak Set:</Text> Shows your highest single set performance. Calculated as reps × weight for that one best set.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Volume:</Text> Shows your average total work. Calculated as the average of (reps × weight × sets) across all your exercise squares.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Shooting %:</Text> Shows your average shooting percentage. Calculated as the average percentage across all your shooting sets.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Total Shots/Reps:</Text> Shows the total number of attempts. Calculated as the sum of all shots or reps across all sets.</Text>
          <Text style={helpStyles.text}>
            The view you choose determines which calculation method is used to process your logged data.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How Time Intervals Work</Text>
          <Text style={helpStyles.text}>
            Time intervals divide your selected time period into 6 equal buckets. Each bucket represents a portion of time, and the graph shows one data point per bucket:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>30 Days:</Text> Divides the last 30 days into 6 buckets of 5 days each. Shows 6 data points.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>90 Days:</Text> Divides the last 90 days into 6 buckets of 15 days each. Shows 6 data points.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>180 Days:</Text> Divides the last 180 days into 6 buckets of 30 days each. Shows 6 data points.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>360 Days:</Text> Divides the last 360 days into 6 buckets of 60 days each. Shows 6 data points.</Text>
          <Text style={helpStyles.text}>
            Each point on the graph represents the calculated view value for that specific time bucket. The leftmost point is the oldest data, and the rightmost point is your most recent data.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Reading the Graph</Text>
          <Text style={helpStyles.text}>
            The graph displays your progress visually:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Line:</Text> Connects all 6 data points to show your performance trend over time.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Y-Axis:</Text> Shows the value range. Automatically scales from your minimum to maximum values so you can see the full range of your performance.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>X-Axis:</Text> Shows time progression. The left side is the oldest data, and the right side is your most recent data.</Text>
          <Text style={helpStyles.text}>
            An upward trend means you're improving, while a downward trend may indicate you need to adjust your training.
          </Text>
        </View>
      </HelpOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2F',
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
    marginTop: 12,
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
    maxHeight: 300,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultsContent: {
    flexGrow: 0,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  searchLoadingText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  searchResultText: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
  },
  searchResultHighlight: {
    backgroundColor: "rgba(74, 158, 255, 0.3)",
    fontWeight: "600",
  },
  actionIcon: {
    marginLeft: 8,
  },
  graphSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 340,
  },
  graphLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingStar: {
    width: 72,
    height: 72,
  },
  graphLoadingText: {
    marginTop: -2,
    fontSize: 14,
    color: "#9E9E9E",
  },
  graphErrorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  graphErrorText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#FF5A5A",
  },
  graphErrorSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#9E9E9E",
    textAlign: "center",
  },
  graphEmptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  graphPlaceholderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  graphPlaceholderSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  dividerContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeIntervalBarContainer: {
    paddingHorizontal: 20,
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
  controlsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  selectViewHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  viewListContainer: {
    gap: 12,
  },
  viewListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  viewCircleContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewCircleEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  viewCircleFilled: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  viewListItemText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  viewListItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  helpButton: {
    position: 'absolute',
    right: 20,
    top: 54,
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
