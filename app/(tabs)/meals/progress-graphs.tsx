// app/(tabs)/meals/progress-graphs.tsx
// Progress Graphs Screen

import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { G, Line as SvgLine, Path, Circle, Text as SvgText } from "react-native-svg";
import { theme } from "@/constants/theme";
import { useMode } from "@/providers/ModeContext";
import { useAvailableModes } from "@/hooks/useAvailableModes";
import { getAvailableViewsForMode } from "@/lib/api/progress-views";
import { mapModeKeyToSportMode, SportMode } from "@/lib/types";
import { TimeInterval, getTimeIntervalLabel } from "@/lib/utils/time-intervals";
import { useProgressGraphView, ProgressGraphDataPoint } from "@/hooks/useProgressGraphView";
import { getAvailableExercisesForView, searchExercisesForView } from "@/lib/api/exercise-filtering";

// Helper function to format date for display
// Parse as local date to avoid timezone issues
function formatDateForDisplay(dateStr: string): string {
  // dateStr is in YYYY-MM-DD format
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}`;
  }
  // Fallback to Date parsing if format is unexpected
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

  // Graph dimensions and margins
  const M = { top: 20, right: 20, bottom: 40, left: 40 };
  const H = 240; // Height
  const W = width || 300;
  const chartWidth = W - M.left - M.right;
  const chartHeight = H - M.top - M.bottom;

  // Calculate actual min/max from data (for edge case handling)
  // This ensures we handle cases where hook might return null but data exists
  const actualValues = data
    .map(p => p.value)
    .filter((v): v is number => v !== null && v !== undefined);
  
  const actualMin = actualValues.length > 0 ? Math.min(...actualValues) : minValue;
  const actualMax = actualValues.length > 0 ? Math.max(...actualValues) : maxValue;
  
  // Edge case: All values are null
  if (actualMin === null || actualMax === null) {
    return null;
  }

  // Edge case: Min equals Max (all values are the same)
  const range = actualMax - actualMin;
  const isConstant = range === 0;

  // For constant values, add small padding for visual clarity
  // This creates a small range so the graph doesn't look flat
  let displayMin = actualMin;
  let displayMax = actualMax;
  let displayRange = range;
  
  if (isConstant) {
    // Add 10% padding or minimum 1 unit, whichever is larger
    const padding = Math.max(Math.abs(actualMin) * 0.1, 1);
    displayMin = actualMin - padding;
    displayMax = actualMax + padding;
    displayRange = displayMax - displayMin;
  }

  // Calculate 6 evenly spaced Y-axis ticks
  // Formula: tick[i] = min + (max - min) * (i / 5) for i = 0 to 5
  const yTicks: number[] = [];
  for (let i = 0; i < 6; i++) {
    const tick = displayMin + (displayRange * (i / 5));
    yTicks.push(tick);
  }

  // Y-axis positioning function
  // Formula: y = top + height - (height * (value - min) / (max - min))
  const yFor = (value: number): number => {
    if (isConstant) {
      // All values are the same - center the line at the middle of the chart
      return M.top + chartHeight / 2;
    }
    
    // Standard formula: y = top + height - (height * (value - min) / (max - min))
    // This maps value to y-coordinate where:
    // - min value appears at bottom (M.top + chartHeight)
    // - max value appears at top (M.top)
    const ratio = (value - displayMin) / displayRange;
    const y = M.top + chartHeight - (chartHeight * ratio);
    return y;
  };

  // Format tick labels appropriately based on value magnitude
  const formatTickLabel = (value: number): string => {
    // For large numbers, show fewer decimals
    if (Math.abs(value) >= 1000) {
      return value.toFixed(0);
    } else if (Math.abs(value) >= 10) {
      return value.toFixed(1);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(2);
    } else {
      // For very small numbers (< 1), show more decimals
      return value.toFixed(3);
    }
  };

  // X-axis positioning function (6 points evenly spaced)
  // Maps bucketIndex to x position: bucketIndex 5 (oldest) -> position 0 (left), bucketIndex 0 (newest) -> position 5 (right)
  const xFor = (bucketIndex: number): number => {
    // bucketIndex: 5 (oldest) -> x position 0 (leftmost)
    // bucketIndex: 0 (newest) -> x position 5 (rightmost)
    const position = 5 - bucketIndex; // Invert: 5->0, 4->1, 3->2, 2->3, 1->4, 0->5
    return M.left + (chartWidth * (position / 5));
  };

  // Sort data by bucketIndex (0 = newest, 5 = oldest)
  // We want to display oldest to newest (left to right), so sort by bucketIndex descending
  // This ensures bucketIndex 5 (oldest) comes first, bucketIndex 0 (newest) comes last
  const sortedData = [...data].sort((a, b) => b.bucketIndex - a.bucketIndex);

  // Build line path - connect points from oldest (left) to newest (right)
  // Sort by x position to ensure proper line connection order
  const pointsWithValues = sortedData
    .filter(p => p.value !== null)
    .map(p => ({
      bucketIndex: p.bucketIndex,
      value: p.value!,
      x: xFor(p.bucketIndex),
      y: yFor(p.value!),
    }))
    .sort((a, b) => a.x - b.x); // Sort by x position (left to right)
  
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
      <G>
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = yFor(tick);
          return (
            <React.Fragment key={`y-${i}`}>
              <SvgLine
                x1={M.left}
                x2={W - M.right}
                y1={y}
                y2={y}
                stroke="#2A2F38"
                strokeWidth={1}
              />
              <SvgText
                x={M.left - 6}
                y={y + 3}
                fill="#9E9E9E"
                fontSize={10}
                textAnchor="end"
              >
                {formatTickLabel(tick)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X-axis labels - show all 6 buckets (oldest to newest, left to right) */}
        {/* Create array of all 6 bucket indices (5 to 0, oldest to newest) */}
        {Array.from({ length: 6 }, (_, i) => 5 - i).map((bucketIndex) => {
          const x = xFor(bucketIndex);
          
          // Calculate the bucket date range for this bucketIndex
          // Bucket 0 = newest (today), Bucket 5 = oldest
          // BucketSizeDays: 30 days = 5, 90 days = 15, 180 days = 30, 360 days = 60
          const bucketSizeDays = timeInterval === 30 ? 5 : timeInterval === 90 ? 15 : timeInterval === 180 ? 30 : 60;
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          
          // Calculate end date of this bucket (most recent day in bucket)
          const bucketEndDate = new Date(today);
          bucketEndDate.setDate(bucketEndDate.getDate() - (bucketIndex * bucketSizeDays));
          bucketEndDate.setHours(23, 59, 59, 999);
          
          // Display the END date of each bucket (most recent day in the bucket)
          // This ensures Bucket 0 shows today's date on the rightmost point
          // Format end date for display (M/D format)
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

        {/* X-axis line */}
        <SvgLine
          x1={M.left}
          x2={W - M.right}
          y1={H - M.bottom}
          y2={H - M.bottom}
          stroke="#2A2F38"
          strokeWidth={1}
        />

        {/* Y-axis line */}
        <SvgLine
          x1={M.left}
          x2={M.left}
          y1={M.top}
          y2={H - M.bottom}
          stroke="#2A2F38"
          strokeWidth={1}
        />
      </G>

      {/* Data line */}
      {linePath && (
        <Path
          d={linePath}
          fill="none"
          stroke="#4A9EFF"
          strokeWidth={2}
        />
      )}

      {/* Data points */}
      {sortedData.map((point) => {
        if (point.value === null) return null;
        const x = xFor(point.bucketIndex);
        const y = yFor(point.value);
        return (
          <Circle
            key={`pt-${point.bucketIndex}`}
            cx={x}
            cy={y}
            r={4.5}
            stroke="#0F1419"
            strokeWidth={2}
            fill="#4A9EFF"
          />
        );
      })}
    </Svg>
  );
}

export default function ProgressGraphsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode: currentMode } = useMode();
  const { availableModes } = useAvailableModes();

  // State management
  const [selectedMode, setSelectedMode] = useState<string>(currentMode);
  const [selectedView, setSelectedView] = useState<string>("");
  const [exerciseQuery, setExerciseQuery] = useState<string>("");
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(90);
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  // Dropdown states
  const [openModeDropdown, setOpenModeDropdown] = useState(false);
  const [openViewDropdown, setOpenViewDropdown] = useState(false);
  const [openExerciseDropdown, setOpenExerciseDropdown] = useState(false);

  // Exercise filtering state
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [graphWidth, setGraphWidth] = useState(0);

  // Get available views for selected mode
  const sportMode = useMemo(() => mapModeKeyToSportMode(selectedMode), [selectedMode]);
  const availableViews = useMemo(() => {
    return getAvailableViewsForMode(sportMode);
  }, [sportMode]);

  // Set default view when mode changes
  useEffect(() => {
    if (availableViews.length > 0 && !availableViews.find(v => v.name === selectedView)) {
      setSelectedView(availableViews[0].name);
      setSelectedExercise(""); // Reset exercise when view changes
    }
  }, [availableViews, selectedView]);

  // Load available exercises when view changes
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
    if (!exerciseQuery.trim()) {
      return availableExercises;
    }
    return availableExercises.filter(ex => {
      const nameLower = ex.toLowerCase();
      const queryLower = exerciseQuery.toLowerCase();
      return nameLower.includes(queryLower) || queryLower.includes(nameLower);
    });
  }, [availableExercises, exerciseQuery]);

  // Determine which exercise to use: selected from dropdown, or typed query
  const exerciseFilter = selectedExercise || (exerciseQuery.trim() || undefined);

  // Connect to data hook
  const { data: graphData, minValue, maxValue, loading: loadingData, error: dataError } = useProgressGraphView({
    mode: sportMode,
    view: selectedView,
    exercise: exerciseFilter,
    timeInterval,
  });

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Progress Graphs</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          // Close dropdowns when scrolling
          setOpenModeDropdown(false);
          setOpenViewDropdown(false);
          setOpenExerciseDropdown(false);
        }}
      >
        {/* Control Section */}
        <View style={styles.controlSection}>
          {/* Mode Selector */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Mode</Text>
            <View style={styles.dropdownWrapper}>
              <Pressable
                onPress={() => {
                  setOpenModeDropdown(!openModeDropdown);
                  setOpenViewDropdown(false);
                }}
                style={[styles.dropdown, openModeDropdown && styles.dropdownActive]}
              >
                <View style={styles.dropdownContent}>
                  {(() => {
                    const iconConfig = getModeIcon(selectedMode);
                    return iconConfig.lib === 'ion' ? (
                      <Ionicons name={iconConfig.name as any} size={16} color="#FFFFFF" />
                    ) : (
                      <MaterialCommunityIcons name={iconConfig.name as any} size={16} color="#FFFFFF" />
                    );
                  })()}
                  <Text style={styles.dropdownText}>{getModeLabel(selectedMode)}</Text>
                </View>
                <Ionicons name="chevron-down" size={12} color={openModeDropdown ? "#4A9EFF" : "#9E9E9E"} />
              </Pressable>
              {openModeDropdown && (
                <View style={styles.dropdownMenu}>
                  {availableModes.map((m) => {
                    const iconConfig = getModeIcon(m.key);
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => {
                          setSelectedMode(m.key);
                          setOpenModeDropdown(false);
                        }}
                        style={styles.dropdownMenuItem}
                      >
                        {iconConfig.lib === 'ion' ? (
                          <Ionicons name={iconConfig.name as any} size={16} color="#FFFFFF" />
                        ) : (
                          <MaterialCommunityIcons name={iconConfig.name as any} size={16} color="#FFFFFF" />
                        )}
                        <Text style={styles.dropdownMenuText}>{m.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* View Selector */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>View</Text>
            <View style={styles.dropdownWrapper}>
              <Pressable
                onPress={() => {
                  setOpenViewDropdown(!openViewDropdown);
                  setOpenModeDropdown(false);
                }}
                style={[styles.dropdown, openViewDropdown && styles.dropdownActive]}
                disabled={availableViews.length === 0}
              >
                <Text style={styles.dropdownText}>
                  {selectedView || (availableViews.length > 0 ? "Select View" : "No Views")}
                </Text>
                <Ionicons name="chevron-down" size={12} color={openViewDropdown ? "#4A9EFF" : "#9E9E9E"} />
              </Pressable>
              {openViewDropdown && availableViews.length > 0 && (
                <View style={styles.dropdownMenu}>
                  {availableViews.map((view) => (
                    <Pressable
                      key={view.name}
                      onPress={() => {
                        setSelectedView(view.name);
                        setOpenViewDropdown(false);
                      }}
                      style={styles.dropdownMenuItem}
                    >
                      <Text style={styles.dropdownMenuText}>{view.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Exercise Search */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Exercise</Text>
            <View style={styles.dropdownWrapper}>
              <TextInput
                placeholder={loadingExercises ? "Loading exercises..." : "Search exercise..."}
                placeholderTextColor="#6B7280"
                value={exerciseQuery}
                onChangeText={(text) => {
                  setExerciseQuery(text);
                  setOpenExerciseDropdown(true);
                  // Clear selected exercise if query changes
                  if (text !== selectedExercise) {
                    setSelectedExercise("");
                  }
                }}
                onFocus={() => {
                  setOpenExerciseDropdown(true);
                  setOpenModeDropdown(false);
                  setOpenViewDropdown(false);
                }}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {openExerciseDropdown && filteredExercises.length > 0 && (
                <View style={styles.exerciseDropdownMenu}>
                  <ScrollView style={styles.exerciseDropdownScroll} nestedScrollEnabled>
                    {filteredExercises.slice(0, 10).map((exercise) => (
                      <Pressable
                        key={exercise}
                        onPress={() => {
                          setSelectedExercise(exercise);
                          setExerciseQuery(exercise);
                          setOpenExerciseDropdown(false);
                        }}
                        style={styles.dropdownMenuItem}
                      >
                        <Text style={styles.dropdownMenuText}>{exercise}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Time Interval Selector */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Time Interval</Text>
            <View style={styles.intervalButtons}>
              {([30, 90, 180, 360] as TimeInterval[]).map((interval) => (
                <Pressable
                  key={interval}
                  onPress={() => setTimeInterval(interval)}
                  style={[
                    styles.intervalButton,
                    timeInterval === interval && styles.intervalButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.intervalButtonText,
                      timeInterval === interval && styles.intervalButtonTextActive,
                    ]}
                  >
                    {getTimeIntervalLabel(interval)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Graph Display Area */}
        <View 
          style={styles.graphContainer}
          onLayout={(e) => setGraphWidth(e.nativeEvent.layout.width - 40)}
        >
          {loadingData ? (
            <View style={styles.graphLoadingContainer}>
              <ActivityIndicator size="large" color="#4A9EFF" />
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  controlSection: {
    marginTop: 20,
    gap: 16,
  },
  controlRow: {
    gap: 8,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9E9E9E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdownWrapper: {
    position: "relative",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#0F1419",
    borderWidth: 1,
    borderColor: "#2A2F38",
  },
  dropdownActive: {
    borderColor: "#4A9EFF",
    backgroundColor: "#1A2332",
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dropdownText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: "#1A1F28",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2F38",
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2F38",
  },
  dropdownMenuText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  searchInput: {
    backgroundColor: "#0F1419",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2F38",
    fontSize: 14,
  },
  intervalButtons: {
    flexDirection: "row",
    gap: 8,
  },
  intervalButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#0F1419",
    borderWidth: 1,
    borderColor: "#2A2F38",
    alignItems: "center",
  },
  intervalButtonActive: {
    backgroundColor: "#1A2332",
    borderColor: "#4A9EFF",
  },
  intervalButtonText: {
    color: "#9E9E9E",
    fontSize: 12,
    fontWeight: "600",
  },
  intervalButtonTextActive: {
    color: "#4A9EFF",
  },
  graphContainer: {
    marginTop: 32,
    minHeight: 300,
    backgroundColor: "#0F1419",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2F38",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  graphLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  graphLoadingText: {
    marginTop: 12,
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
  exerciseDropdownMenu: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: "#1A1F28",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2F38",
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    maxHeight: 200,
  },
  exerciseDropdownScroll: {
    maxHeight: 200,
  },
});

