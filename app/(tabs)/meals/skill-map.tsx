// app/(tabs)/meals/skill-map.tsx
// Skill Map Screen

import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Dimensions, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, runOnJS } from "react-native-reanimated";
import Svg, { G, Line as SvgLine, Path, Circle, Text as SvgText, Polygon } from "react-native-svg";
import { theme } from "@/constants/theme";
import { useMode } from "@/providers/ModeContext";
import { useAvailableModes } from "@/hooks/useAvailableModes";
import { getAvailableViewsForMode, getViewConfig, getCalculationTypeForView, ViewCalculationType } from "@/lib/api/progress-views";
import { mapModeKeyToSportMode, SportMode } from "@/lib/types";
import { TimeInterval, getTimeIntervalLabel, getAvailableTimeIntervals } from "@/lib/utils/time-intervals";
import { useSkillMapData, SkillMapExerciseData } from "@/hooks/useSkillMapData";
import { getAvailableExercisesForView, searchExercisesForView } from "@/lib/api/exercise-filtering";
import { HelpOverlay } from "@/components/HelpOverlay";

const MAX_EXERCISES = 6;

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

/**
 * Get metric label and unit for a view
 */
function getMetricLabelAndUnit(
  mode: SportMode,
  viewName: string
): { label: string; unit: string | null } {
  const viewConfig = getViewConfig(mode, viewName);
  const calculationType = getCalculationTypeForView(mode, viewName);

  if (!calculationType) {
    return { label: viewName, unit: null };
  }

  const metricMap: Record<ViewCalculationType, { label: string; unit: string | null }> = {
    performance: { label: 'Reps × Weight', unit: null }, // Unit depends on weight preference
    tonnage: { label: 'Tonnage', unit: null }, // Unit depends on weight preference
    shooting_percentage: { label: 'Shooting %', unit: '%' },
    jumpshot: { label: 'Attempted Shots', unit: null },
    drill: { label: 'Total Reps', unit: null },
    completion: { label: 'Completion %', unit: '%' },
    speed: { label: 'Speed', unit: 'ft/sec' },
    sprints: { label: 'Total Reps', unit: null },
    hits: { label: 'Total Reps', unit: null },
    distance: { label: 'Avg. Distance', unit: 'ft' },
    fielding: { label: 'Avg. Distance', unit: 'ft' },
    shots: { label: 'Total Reps', unit: null },
    shot_distance: { label: 'Avg. Distance', unit: 'ft' },
    rally: { label: 'Avg. Points', unit: null },
  };

  return metricMap[calculationType] || { label: viewName, unit: null };
}

/**
 * Get display name for view (frontend display only, backend keeps original names)
 */
function getViewDisplayName(mode: SportMode, viewName: string): string {
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
}

// Shared constants for skeleton and visualization to ensure perfect alignment
// Using original size that exercises already follow
const SKILL_MAP_CHART_SIZE = 500;
const SKILL_MAP_RADIUS_OFFSET = 90; // Space for labels (original value)
const SKILL_MAP_RADIUS = SKILL_MAP_CHART_SIZE / 2 - SKILL_MAP_RADIUS_OFFSET;

/**
 * Skill Map Skeleton Component
 * Always displays the hexagon grid outline - ALWAYS 6 axes, always visible
 */
function SkillMapSkeleton() {
  // Use shared constants to ensure alignment with visualization
  const chartSize = SKILL_MAP_CHART_SIZE;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = SKILL_MAP_RADIUS;
  const numAxes = 6; // ALWAYS 6 axes for skeleton
  
  // Calculate angle for each axis - EXACT same logic as visualization
  const getAngle = (index: number): number => {
    // Start at -90 degrees (top) and distribute evenly - SAME as visualization
    return (-90 + (index * 360 / numAxes)) * (Math.PI / 180);
  };
  
  // Calculate point position on circle - EXACT same logic as visualization
  const getPoint = (index: number, percentage: number): { x: number; y: number } => {
    const angle = getAngle(index);
    const distance = (percentage / 100) * radius;
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    };
  };
  
  // Grid lines (concentric polygons at 25%, 50%, 75%, 100%) - SAME as visualization
  const gridLevels = [25, 50, 75, 100];
  
  return (
    <View style={styles.radarChartContainer}>
      <Svg 
        width={chartSize} 
        height={chartSize}
        viewBox={`0 0 ${chartSize} ${chartSize}`}
      >
        <G>
          {/* Grid lines (concentric polygons) - SAME pattern as visualization */}
          {gridLevels.map((level) => {
            const gridPoints = Array.from({ length: numAxes }, (_, index) => {
              const point = getPoint(index, level);
              return `${point.x},${point.y}`;
            }).join(' ');
            return (
              <G key={`grid-${level}`}>
                {/* Glow layer for subtle green glow */}
                <Polygon
                  points={gridPoints}
                  fill="none"
                  stroke="rgba(152, 251, 152, 0.3)"
                  strokeWidth={3}
                  opacity={0.4}
                />
                {/* Main grid line */}
                <Polygon
                  points={gridPoints}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={1}
                />
              </G>
            );
          })}
          
          {/* Axes (lines from center to each point) - SAME pattern as visualization */}
          {Array.from({ length: numAxes }, (_, index) => {
            const endPoint = getPoint(index, 100);
            return (
              <G key={`axis-${index}`}>
                {/* Glow layer for subtle green glow */}
                <SvgLine
                  x1={centerX}
                  y1={centerY}
                  x2={endPoint.x}
                  y2={endPoint.y}
                  stroke="rgba(152, 251, 152, 0.3)"
                  strokeWidth={3}
                  opacity={0.4}
                />
                {/* Main axis line */}
                <SvgLine
                  x1={centerX}
                  y1={centerY}
                  x2={endPoint.x}
                  y2={endPoint.y}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

/**
 * Skill Map Visualization Component
 * Displays radar/spider chart comparing exercises
 * Renders data overlay that goes on top of skeleton
 */
function SkillMapVisualization({
  data,
  highestValue,
  viewName,
  mode,
  exerciseCount,
}: {
  data: SkillMapExerciseData[];
  highestValue: number | null;
  viewName: string;
  mode: SportMode;
  exerciseCount: number;
}) {
  if (!data || data.length === 0) {
    return null;
  }

  // Debug: Log data received
  console.log('🔍 [SkillMapVisualization] Rendering chart:', {
    dataLength: data.length,
    exerciseCount,
    exerciseNames: data.map(d => d.exerciseName),
  });

  const { label: metricLabel, unit } = getMetricLabelAndUnit(mode, viewName);

  // Edge case: Single exercise selected
  const isSingleExercise = exerciseCount === 1;
  
  // Edge case: All exercises have same value (all are highest)
  const allSameValue = data.every(item => item.isHighest);
  
  // Edge case: All values are zero
  const allZeroValues = highestValue === 0 || (highestValue !== null && highestValue === 0);

  // Format raw value for display with unit
  const formatRawValue = (value: number): string => {
    let formatted: string;
    if (value >= 1000) {
      formatted = value.toFixed(0);
    } else if (value >= 10) {
      formatted = value.toFixed(1);
    } else if (value >= 1) {
      formatted = value.toFixed(2);
    } else {
      formatted = value.toFixed(3);
    }
    
    // Add unit if available
    return unit ? `${formatted} ${unit}` : formatted;
  };

  // Radar chart dimensions
  // Use shared constants to ensure perfect alignment with skeleton
  const chartSize = SKILL_MAP_CHART_SIZE;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = SKILL_MAP_RADIUS;
  const numExercises = data.length;

  // Calculate angle for each exercise (distribute evenly around circle)
  // Start from top (12 o'clock) and go clockwise
  const getAngle = (index: number): number => {
    // Start at -90 degrees (top) and distribute evenly
    return (-90 + (index * 360 / numExercises)) * (Math.PI / 180);
  };

  // Calculate point position on circle based on percentage
  const getPoint = (index: number, percentage: number): { x: number; y: number } => {
    const angle = getAngle(index);
    const distance = (percentage / 100) * radius;
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
    };
  };

  // Calculate label position (outside the chart)
  // Position labels exactly where red circles are marked in user's images
  const getLabelPosition = (index: number): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } => {
    const angle = getAngle(index);
    const point = getPoint(index, 100); // Get the point at 100% (edge of chart)
    
    // Calculate if point is in upper or lower half
    const sinAngle = Math.sin(angle);
    const isUpperHalf = sinAngle < 0; // Negative sin means above center
    const isLowerHalf = sinAngle > 0; // Positive sin means below center
    
    // Calculate if point is on left or right side
    const cosAngle = Math.cos(angle);
    
    // Convert angle to degrees for precise positioning
    let angleDegrees = (angle * 180 / Math.PI);
    if (angleDegrees < 0) angleDegrees += 360;
    
    let x: number;
    let y: number;
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    
    // 1 Exercise Map: Shorter distance for single exercise
    if (numExercises === 1) {
      // Single exercise - position closer to the point
      x = point.x;
      y = point.y - 15; // Shorter distance for top exercise
      anchor = 'middle';
    }
    // 2 Exercise Map: Top/bottom vertical, shorter distance for top
    else if (numExercises === 2) {
      if (isUpperHalf) {
        x = point.x;
        y = point.y - 25; // Shorter distance for top exercise
        anchor = 'middle';
      } else {
        x = point.x;
        y = point.y + 40;
        anchor = 'middle';
      }
    }
    // 3 Exercise Map: Top vertical above, bottom two vertical below
    else if (numExercises === 3) {
      if (isUpperHalf) {
        // Top: vertical above
        x = point.x;
        y = point.y - 30;
        anchor = 'middle';
      } else {
        // Bottom two: vertical below
        x = point.x;
        y = point.y + 60;
        anchor = 'middle';
      }
    }
    // 4 Exercise Map: Top/bottom vertical, left/right at corner positions
    // Left exercise should be at top-left corner, Right exercise at bottom-right corner
    else if (numExercises === 4) {
      // Top: vertical above
      if (Math.abs(sinAngle + 1) < 0.15) {
        x = point.x;
        y = point.y - 30;
        anchor = 'middle';
      }
      // Bottom: vertical below
      else if (Math.abs(sinAngle - 1) < 0.15) {
        x = point.x;
        y = point.y + 30;
        anchor = 'middle';
      }
      // Left (180°): position at top-left corner area - use corner angle, not direct left
      else if (Math.abs(cosAngle + 1) < 0.15) {
        // Position at top-left corner (around 210° or 150° on hexagon)
        // Use the top-left corner angle from 6-axis hexagon: 210° = -150° = 5π/6
        const cornerAngle = (210 * Math.PI / 180); // Top-left corner of hexagon
        const cornerPoint = {
          x: centerX + radius * Math.cos(cornerAngle),
          y: centerY + radius * Math.sin(cornerAngle)
        };
        // Position vertically above this corner point
        x = cornerPoint.x;
        y = cornerPoint.y - 60; // Vertical above the corner
        anchor = 'middle';
      }
      // Right (0°): position at bottom-right corner area - use corner angle, not direct right
      else if (Math.abs(cosAngle - 1) < 0.15) {
        // Position at bottom-right corner (around 30° on hexagon)
        // Use the bottom-right corner angle from 6-axis hexagon: 30° = π/6
        const cornerAngle = (30 * Math.PI / 180); // Bottom-right corner of hexagon
        const cornerPoint = {
          x: centerX + radius * Math.cos(cornerAngle),
          y: centerY + radius * Math.sin(cornerAngle)
        };
        // Position vertically below this corner point
        x = cornerPoint.x;
        y = cornerPoint.y + 60; // Vertical below the corner
        anchor = 'middle';
      }
    }
    // 5 Exercise Map: Top center vertical, top corners positioned directly above bottom corners
    else if (numExercises === 5) {
      // Top center: vertical above (closest to -90°, most negative sinAngle)
      // Use tighter tolerance to ensure only the true top center is caught
      if (sinAngle < -0.9) {
        x = point.x;
        y = point.y - 30;
        anchor = 'middle';
      }
      // Top corners: same horizontal position as bottom corners, but vertically above the top corner point
      else if (isUpperHalf) {
        // Find the corresponding bottom corner point to get its x position
        // For 5 exercises, angles are: -90, -18, 54, 126, 198 degrees
        // Top-left (198°) corresponds to bottom-left (126°)
        // Top-right (-18° = 342°) corresponds to bottom-right (54°)
        let bottomCornerAngle: number;
        if (cosAngle < 0) {
          // Left side: top-left (198°) -> bottom-left (126°)
          bottomCornerAngle = (126 * Math.PI / 180);
        } else {
          // Right side: top-right (-18° = 342°) -> bottom-right (54°)
          bottomCornerAngle = (54 * Math.PI / 180);
        }
        
        // Get the bottom corner point to use its x position
        const bottomCornerPoint = {
          x: centerX + radius * Math.cos(bottomCornerAngle),
          y: centerY + radius * Math.sin(bottomCornerAngle)
        };
        
        // Position top corner label:
        // - Same x as bottom corner label (for horizontal alignment)
        // - Vertically above the TOP corner point (not above bottom label)
        x = bottomCornerPoint.x; // Same x as bottom corner label (horizontal alignment)
        y = point.y -102; // Vertically above the top corner point itself (70 + 16 = 86px higher)
        anchor = 'middle';
      }
      // ALL exercises in lower half are bottom corners: vertical below
      else if (isLowerHalf) {
        x = point.x; // Same x as point - ensures vertical alignment below the vertex
        y = point.y + 70; // Farther away like 6-exercise map
        anchor = 'middle';
      }
    }
    // 6 Exercise Map: Top center vertical above, top corners vertical above, bottom center vertical below, bottom corners vertical below
    else if (numExercises === 6) {
      // Top center: vertical above
      if (Math.abs(sinAngle + 1) < 0.15) {
        x = point.x;
        y = point.y - 30;
        anchor = 'middle';
      }
      // Bottom center: vertical below
      else if (Math.abs(sinAngle - 1) < 0.15) {
        x = point.x;
        y = point.y + 30;
        anchor = 'middle';
      }
      // Top corners: vertical above
      else if (isUpperHalf) {
        x = point.x;
        y = point.y - 60;
        anchor = 'middle';
      }
      // Bottom corners: vertical below
      else if (isLowerHalf) {
        x = point.x;
        y = point.y + 60;
        anchor = 'middle';
      }
    }
    // Fallback for other cases
    else {
      if (isUpperHalf) {
        x = point.x;
        y = point.y - 60;
        anchor = 'middle';
      } else {
        x = point.x;
        y = point.y + 60;
        anchor = 'middle';
      }
    }
    
    return { x, y, anchor };
  };

  // Helper function to wrap text into multiple lines if it's too long
  // Estimates text width and splits into words that fit within maxWidth
  const wrapText = (text: string, maxWidth: number, fontSize: number = 12): string[] => {
    // Rough estimate: each character is about 0.6 * fontSize wide
    const charWidth = fontSize * 0.6;
    const maxCharsPerLine = Math.floor(maxWidth / charWidth);
    
    // If text fits on one line, return as is
    if (text.length <= maxCharsPerLine) {
      return [text];
    }
    
    // Split by words and build lines
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testLength = testLine.length;
      
      if (testLength <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        // Current line is full, start new line
        if (currentLine) {
          lines.push(currentLine);
        }
        // If word itself is longer than maxCharsPerLine, split it
        if (word.length > maxCharsPerLine) {
          // Split long word into chunks
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            lines.push(word.substring(i, i + maxCharsPerLine));
          }
          currentLine = '';
        } else {
          currentLine = word;
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [text];
  };

  // Build polygon path for the filled area
  const polygonPoints = data.map((item, index) => {
    const point = getPoint(index, item.percentage);
    return `${point.x},${point.y}`;
  }).join(' ');

  return (
    <>
      {/* Edge case messages removed per user request */}
      
      {allZeroValues && (
        <View style={styles.edgeCaseMessage}>
          <Ionicons name="alert-circle-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.edgeCaseText}>
            No data found for selected exercises in this time period
          </Text>
        </View>
      )}

      {/* Radar Chart - Data overlay only (skeleton grid rendered separately behind) */}
      {/* This renders ONLY the data (polygon, points, labels) - skeleton provides the grid */}
      <Svg 
        width={chartSize} 
        height={chartSize}
        viewBox={`0 0 ${chartSize} ${chartSize}`}
      >
        <G>
          {/* Only render data - NO grid lines here (skeleton handles grid) */}

            {/* Filled polygon (skill map area) - Minty green */}
            <Polygon
              points={polygonPoints}
              fill="rgba(152, 251, 152, 0.3)"
              stroke="#98FB98"
              strokeWidth={2}
            />

            {/* Data points (circles at each vertex) */}
            {data.map((item, index) => {
              const point = getPoint(index, item.percentage);
              return (
                <Circle
                  key={`point-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  fill={item.isHighest ? "#FFD700" : "#98FB98"}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              );
            })}

            {/* Exercise labels with percentages and values */}
            {data.map((item, index) => {
              const labelPos = getLabelPosition(index);
              const point = getPoint(index, item.percentage);
              
              // Determine max width based on position to prevent off-screen text
              // For vertical labels (top/bottom), use screen width constraints
              // For diagonal labels (sides), use smaller width
              const isVertical = labelPos.anchor === 'middle';
              const maxTextWidth = isVertical 
                ? Math.min(SCREEN_WIDTH * 0.25, 80) // Vertical labels: 25% of screen or 80px max
                : Math.min(SCREEN_WIDTH * 0.15, 60); // Diagonal labels: 15% of screen or 60px max
              
              // Wrap exercise name if needed
              const exerciseNameLines = wrapText(item.exerciseName, maxTextWidth, 12);
              const lineHeight = 14; // Spacing between lines
              
              // Calculate starting Y position for exercise name (stacked above percentage)
              // If multiple lines, center them vertically
              const nameStartY = labelPos.y - 10 - (exerciseNameLines.length - 1) * (lineHeight / 2);
              
              return (
                <G key={`label-${index}`}>
                  {/* Line from point to label */}
                  <SvgLine
                    x1={point.x}
                    y1={point.y}
                    x2={labelPos.x}
                    y2={labelPos.y}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                  
                  {/* Exercise name - render multiple lines if wrapped */}
                  {exerciseNameLines.map((line, lineIndex) => (
                    <SvgText
                      key={`name-${lineIndex}`}
                      x={labelPos.x}
                      y={nameStartY + (lineIndex * lineHeight)}
                      fill="#FFFFFF"
                      fontSize={12}
                      fontWeight="600"
                      textAnchor={labelPos.anchor}
                    >
                      {line}
                    </SvgText>
                  ))}
                  
                  {/* Percentage - make it more prominent */}
                  {/* Adjust Y position based on number of name lines */}
                  {/* Calculate approximate width of number to position % sign closer */}
                  {(() => {
                    const percentageText = item.percentage.toFixed(1);
                    // Rough estimate: each character is about 6-7px wide at fontSize 11
                    const numberWidth = percentageText.length * 6.5;
                    const percentX = labelPos.anchor === 'middle' 
                      ? labelPos.x + numberWidth / 2 + 2 // 2px spacing after number
                      : labelPos.anchor === 'start'
                      ? labelPos.x + numberWidth + 2
                      : labelPos.x - numberWidth - 2;
                    
                    return (
                      <>
                        <SvgText
                          x={labelPos.x}
                          y={labelPos.y + 4 + (exerciseNameLines.length - 1) * (lineHeight / 2)}
                          fill="#98FB98"
                          fontSize={11}
                          fontWeight="700"
                          textAnchor={labelPos.anchor}
                        >
                          {percentageText}
                        </SvgText>
                        <SvgText
                          x={percentX}
                          y={labelPos.y + 4 + (exerciseNameLines.length - 1) * (lineHeight / 2)}
                          fill="#98FB98"
                          fontSize={11}
                          fontWeight="700"
                          textAnchor="start"
                        >
                          %
                        </SvgText>
                      </>
                    );
                  })()}
                  
                  {/* Raw value */}
                  {/* Adjust Y position based on number of name lines */}
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y + 18 + (exerciseNameLines.length - 1) * (lineHeight / 2)}
                    fill="rgba(255, 255, 255, 0.7)"
                    fontSize={10}
                    textAnchor={labelPos.anchor}
                  >
                    {formatRawValue(item.rawValue)}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      
    </>
  );
}

export default function SkillMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentMode, modeLoading } = useMode();
  const { availableModes } = useAvailableModes();

  // State management - Default to null to show "Select Mode"
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  
  // Update selectedMode when currentMode loads (user's primary sport)
  // Wait for modeLoading to complete to ensure we get the correct primary sport
  useEffect(() => {
    if (!modeLoading && currentMode) {
      console.log('✅ [SkillMap] Setting mode from currentMode:', currentMode);
      setSelectedMode(currentMode);
    }
  }, [currentMode, modeLoading]);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(90);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("");
  const [showModePicker, setShowModePicker] = useState(false);
  const [showTimeIntervalPicker, setShowTimeIntervalPicker] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [isTouchingSearchResults, setIsTouchingSearchResults] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Get available views for selected mode
  const sportMode = useMemo(() => 
    selectedMode ? mapModeKeyToSportMode(selectedMode) : 'workout',
    [selectedMode]
  );
  const availableViews = useMemo(() => 
    getAvailableViewsForMode(sportMode),
    [sportMode]
  );

  // Track previous mode and view to detect changes
  const prevModeRef = useRef<string | null>(selectedMode);
  const prevViewRef = useRef<string | null>(selectedView);

  // Load first view when mode changes (only if mode is selected)
  useEffect(() => {
    if (selectedMode && availableViews.length > 0 && (!selectedView || !availableViews.find(v => v.name === selectedView))) {
      setSelectedView(availableViews[0].name);
      // Clear selected exercises when mode changes (exercise pool changes)
      setSelectedExercises([]);
      setShowExerciseSearch(false);
    } else if (!selectedMode) {
      // Clear view if no mode selected
      setSelectedView(null);
      setSelectedExercises([]);
      setShowExerciseSearch(false);
    }
  }, [availableViews, selectedView, selectedMode]);

  // Clear exercises when mode or view changes (since exercise pool changes)
  useEffect(() => {
    const modeChanged = prevModeRef.current !== selectedMode;
    const viewChanged = prevViewRef.current !== selectedView && prevViewRef.current !== null;

    if (modeChanged || viewChanged) {
      setSelectedExercises([]);
      setShowExerciseSearch(false);
    }

    prevModeRef.current = selectedMode;
    prevViewRef.current = selectedView;
  }, [selectedMode, selectedView]);
  
  // Clear exercises when mode is deselected
  useEffect(() => {
    if (!selectedMode) {
      setSelectedExercises([]);
      setSelectedView(null);
      setShowExerciseSearch(false);
    }
  }, [selectedMode]);

  // Load available exercises when view changes
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  useEffect(() => {
    if (!selectedView || !selectedMode) {
      setAvailableExercises([]);
      return;
    }

    setLoadingExercises(true);
    getAvailableExercisesForView(sportMode, selectedView, timeInterval)
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ [SkillMap] Error loading exercises:', error);
          setAvailableExercises([]);
        } else {
          setAvailableExercises(data || []);
        }
        setLoadingExercises(false);
      })
      .catch((err) => {
        console.error('❌ [SkillMap] Exception loading exercises:', err);
        setAvailableExercises([]);
        setLoadingExercises(false);
      });
  }, [sportMode, selectedView, timeInterval]);

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

  // Connect to data hook
  const { data: skillMapData, highestValue, loading: loadingData, error: dataError } = useSkillMapData({
    mode: sportMode,
    view: selectedView || '',
    exercises: selectedExercises,
    timeInterval,
  });

  // Spinning star animation for loading state
  const starRotation = useSharedValue(0);
  
  useEffect(() => {
    if (loadingData && selectedExercises.length > 0) {
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
  }, [loadingData, selectedExercises.length]);

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // Add exercise handler
  const handleAddExercise = (exerciseName: string) => {
    if (selectedExercises.length >= MAX_EXERCISES) {
      // Already at max - this should be prevented by UI, but handle gracefully
      return;
    }
    if (selectedExercises.includes(exerciseName)) {
      // Already added - prevent duplicates
      return;
    }
    setSelectedExercises([...selectedExercises, exerciseName]);
    setExerciseSearchQuery("");
    setShowExerciseSearch(false);
  };

  // Remove exercise handler
  const handleRemoveExercise = (exerciseName: string) => {
    setSelectedExercises(selectedExercises.filter(ex => ex !== exerciseName));
  };

  // Get mode label
  const getModeLabel = (modeKey: string) => {
    const mode = availableModes.find(m => m.key === modeKey);
    return mode?.label || modeKey;
  };

  // Get mode icon (returns library and name)
  const getModeIcon = (modeKey: string): { lib: 'ion' | 'mci'; name: string } => {
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

  // Generate stars for background
  const [stars] = useState(() => generateStars(150));

  // Animation for time interval selection marker
  const timeIntervalOptions = [
    { value: 30, label: '1M' },
    { value: 90, label: '3M' },
    { value: 180, label: '6M' },
    { value: 360, label: '1Y' },
  ];
  const selectedIndex = timeIntervalOptions.findIndex(opt => opt.value === timeInterval);
  const markerPosition = useSharedValue(selectedIndex >= 0 ? selectedIndex : 0);
  const barWidth = useSharedValue(0);
  
  // Update marker position when time interval changes
  useEffect(() => {
    const newIndex = timeIntervalOptions.findIndex(opt => opt.value === timeInterval);
    if (newIndex !== -1) {
      markerPosition.value = withSpring(newIndex, {
        damping: 40, // Increased damping for less bounce
        stiffness: 200, // Increased stiffness for faster animation
      });
    }
  }, [timeInterval]);

  // Calculate marker width and position using pixel values
  const markerAnimatedStyle = useAnimatedStyle(() => {
    if (barWidth.value === 0) {
      return { opacity: 0 };
    }
    // Bar has padding: 4, so subtract 8 (4 on each side)
    const availableWidth = barWidth.value - 8;
    const optionWidth = availableWidth / timeIntervalOptions.length;
    const leftPosition = markerPosition.value * optionWidth + 4; // Add left padding offset
    return {
      position: 'absolute',
      left: leftPosition,
      width: optionWidth,
      top: 4, // Match bar top padding
      bottom: 4, // Match bar bottom padding
      opacity: 1,
    };
  });

  return (
    <View style={styles.container}>
      {/* Full Screen Gradient from starry background to normal background - Fixed to viewport */}
      <LinearGradient
        colors={[
          'rgba(13, 27, 43, 0.95)', // Starry background at top
          'rgba(13, 27, 43, 0.9)',
          'rgba(13, 27, 43, 0.7)',
          'rgba(13, 27, 43, 0.5)',
          'rgba(13, 27, 43, 0.3)', // Starting to fade
          'rgba(10, 15, 22, 0.6)', // Transitioning to black
          theme.colors.bg0, // Black background starts around divider
          theme.colors.bg0, // Black continues
          theme.colors.bg0, // Black all the way down
        ]}
        locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.8, 0.9, 1]} // Main fade around 0.6-0.8 (divider area), then solid black
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
        {/* Sport Mode Dropdown - Floating Text with Arrow */}
        <View style={styles.topSection}>
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

          {/* Mode Picker Dropdown - Extreme Glassmorphism */}
          {showModePicker && (
            <View style={styles.extremeGlassPickerContainer}>
              <BlurView
                intensity={50}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              {/* Multiple gradient layers for extreme glassmorphism */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
                locations={[0, 0.3, 0.7, 1]}
                style={StyleSheet.absoluteFill}
              />
              {/* Additional highlight layer */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.12)', 'transparent', 'transparent']}
                locations={[0, 0.2, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.pickerContent}>
                {availableModes.map((mode) => (
                  <Pressable
                    key={mode.key}
                    style={[
                      styles.extremeGlassPickerItem,
                      selectedMode === mode.key && styles.extremeGlassPickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedMode(mode.key);
                      setShowModePicker(false);
                    }}
                  >
                    {getModeIcon(mode.key).lib === 'ion' ? (
                      <Ionicons 
                        name={getModeIcon(mode.key).name as any} 
                        size={22} 
                        color={selectedMode === mode.key ? "#FFFFFF" : "rgba(255, 255, 255, 0.9)"} 
                      />
                    ) : (
                      <MaterialCommunityIcons 
                        name={getModeIcon(mode.key).name as any} 
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
                ))}
              </View>
            </View>
          )}

          {/* Exercise Search Bar - Styled like workout name text box */}
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
                    filteredExercises
                      .map((exercise) => {
                        const queryLower = exerciseSearchQuery.toLowerCase();
                        const exerciseLower = exercise.toLowerCase();
                        const matchIndex = exerciseLower.indexOf(queryLower);
                        const isSelected = selectedExercises.includes(exercise);
                        const canAdd = !isSelected && selectedExercises.length < MAX_EXERCISES;
                        
                        return (
                          <Pressable
                            key={exercise}
                            style={styles.searchResultItem}
                            onPress={() => {
                              if (isSelected) {
                                handleRemoveExercise(exercise);
                              } else if (canAdd) {
                                handleAddExercise(exercise);
                              }
                            }}
                            disabled={!isSelected && !canAdd}
                          >
                            <Text style={[
                              styles.searchResultText,
                              !canAdd && !isSelected && styles.searchResultTextDisabled
                            ]}>
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
                            {isSelected ? (
                              <Ionicons 
                                name="close-circle" 
                                size={20} 
                                color="#FF5A5A" 
                                style={styles.actionIcon}
                              />
                            ) : (
                              <Ionicons 
                                name="add-circle-outline" 
                                size={20} 
                                color={canAdd ? "#17D67F" : "rgba(255, 255, 255, 0.3)"} 
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


        {/* Skill Map Skeleton - FIRST thing after search bar, always visible */}
        <View style={styles.visualizationSection}>
          <View style={styles.skillMapWithSkeleton}>
            {/* Always show skeleton behind everything - ALWAYS 6 axes, never changes */}
            <SkillMapSkeleton />
            
            {/* Data overlays on top when available - skeleton stays visible behind */}
            {/* Positioned to match skeleton's container padding exactly */}
            {selectedExercises.length > 0 && skillMapData && skillMapData.length > 0 && !loadingData && !dataError && (
              <View style={styles.dataOverlay}>
                <SkillMapVisualization
                  data={skillMapData}
                  highestValue={highestValue}
                  viewName={selectedView || ""}
                  mode={sportMode}
                  exerciseCount={selectedExercises.length}
                />
              </View>
            )}
            
            {/* Loading state - skeleton still visible behind */}
            {loadingData && selectedExercises.length > 0 && (
              <View style={styles.loadingOverlay}>
                <Animated.View style={starAnimatedStyle}>
                  <Image
                    source={require("../../../assets/star.png")}
                    style={styles.loadingStar}
                    resizeMode="contain"
                  />
                </Animated.View>
                <Text style={styles.loadingText}>Calculating...</Text>
              </View>
            )}
            {/* Error state - skeleton still visible behind */}
            {dataError && selectedExercises.length > 0 && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorText}>Error: {dataError.message || 'Failed to load data'}</Text>
              </View>
            )}
          </View>
          
        </View>

        {/* Time Interval Bar - First thing under skill map, styled like reference image */}
        <View style={styles.timeIntervalBarContainer}>
          <View 
            style={styles.timeIntervalBar}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              // Update shared value directly (this is on JS thread, so it's safe)
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

        {/* Divider - gradient is handled by full screen gradient above */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
        </View>
        
        {/* View Selection Section - Below divider */}
        <View style={styles.controlsSection}>
          {/* Centered "Select View" Heading */}
          <Text style={styles.selectViewHeading}>Select View</Text>
          
          {/* View Options List */}
          {availableViews.length > 0 && (
            <View style={styles.viewListContainer}>
              {availableViews.map((view) => (
                <Pressable
                  key={view.name}
                  style={styles.viewListItem}
                  onPress={() => {
                    setSelectedView(view.name);
                    // Exercises will be cleared by useEffect when view changes
                  }}
                >
                  {/* Circle indicator */}
                  <View style={styles.viewCircleContainer}>
                    {selectedView === view.name ? (
                      <View style={styles.viewCircleFilled} />
                    ) : (
                      <View style={styles.viewCircleEmpty} />
                    )}
                  </View>
                  
                  {/* View name */}
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
        title="Skill Map Guide"
      >
        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How Skill Map Works</Text>
          <Text style={helpStyles.text}>
            Skill Map compares up to 6 exercises side-by-side using a radar chart. First, select your sport mode. Then choose a view type that determines how your data is calculated. Finally, search for and add exercises (up to 6) to see how they compare to each other visually on the radar chart.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Understanding Map Percentages</Text>
          <Text style={helpStyles.text}>
            Each exercise appears as a point on the radar chart. The percentage shown next to each exercise represents how that exercise compares to the exercise with the highest value:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>100%:</Text> This exercise has the highest calculated value among all selected exercises for the chosen view.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Lower percentages (e.g., 75%, 50%):</Text> Show how each exercise performs relative to the best one. For example, 75% means that exercise is performing at 75% of the best exercise's value.</Text>
          <Text style={helpStyles.text}>
            The filled colored area on the radar chart shows the overall shape of your performance across all selected exercises. A larger, more balanced shape indicates more consistent performance across exercises.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How View Calculations Work</Text>
          <Text style={helpStyles.text}>
            Views calculate your data the same way as Progress Graphs. The view you choose determines which calculation method is used:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Peak Set:</Text> Finds your highest single set performance. Calculated as reps × weight for that one best set across the entire time interval.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Volume:</Text> Calculates your average total work. Takes the average of (reps × weight × sets) across all your exercise squares within the time interval.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Shooting %:</Text> Calculates your average shooting percentage. Averages the percentage across all your shooting sets within the time interval.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Total Shots/Reps:</Text> Sums all attempts. Adds up the total number of shots or reps across all sets within the time interval.</Text>
          <Text style={helpStyles.text}>
            All calculations use all your logged data from the selected time interval, not just recent data. This gives you a comprehensive comparison of how each exercise performs.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How Time Intervals Work</Text>
          <Text style={helpStyles.text}>
            Time intervals determine how far back the app looks when calculating values for comparison:
          </Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>30 Days:</Text> Uses all data from the last 30 days (1 month).</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>90 Days:</Text> Uses all data from the last 90 days (3 months).</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>180 Days:</Text> Uses all data from the last 180 days (6 months).</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>360 Days:</Text> Uses all data from the last 360 days (1 year).</Text>
          <Text style={helpStyles.text}>
            All exercises are compared using data from the same time period. This ensures a fair comparison - if you select 30 days, all exercises use their last 30 days of data, not different time ranges.
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
  // Floating Sport Mode Text (no box)
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
    // Text shadow for depth (matching "Wonder" style)
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  floatingModeArrow: {
    marginLeft: 10,
  },
  // Extreme Glassmorphism Picker Container
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
  // Old glass picker (keeping for reference)
  glassPickerContainer: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  pickerContent: {
    paddingVertical: 8,
  },
  // Extreme Glassmorphism Picker Items
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
    // Additional glow for selected item
    ...Platform.select({
      ios: {
        shadowColor: "rgba(255, 255, 255, 0.3)",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
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
    letterSpacing: 0.5,
  },
  // Old glass picker items (keeping for reference)
  glassPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  glassPickerItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  glassPickerItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  glassPickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Search Bar - Styled like workout name text box
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
  // Old header styles (keeping for reference, may remove)
  oldHeader: {
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
    paddingBottom: 40,
  },
  controlsSection: {
    marginTop: 0, // No top margin since divider handles spacing
    marginBottom: 24,
    paddingHorizontal: 20,
    // No background color - let gradient show through
  },
  selectViewHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  viewListContainer: {
    gap: 12,
  },
  viewListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  viewCircleContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  viewCircleEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
  viewCircleFilled: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  viewListItemText: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)",
    flex: 1,
  },
  viewListItemTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  exerciseSection: {
    marginBottom: 24,
  },
  exerciseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  exerciseSectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  exerciseCountBadge: {
    backgroundColor: "rgba(74, 158, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  exerciseCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4A9EFF",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  maxReachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  maxReachedText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4A9EFF",
  },
  // Search Results Container (new glassmorphism style)
  searchResultsContainer: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    maxHeight: 300,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 10,
      },
    }),
  },
  searchLoadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  searchLoadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  searchResults: {
    maxHeight: 300,
    flexGrow: 0,
  },
  searchResultsContent: {
    flexGrow: 0,
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
  addIcon: {
    marginRight: 0,
  },
  actionIcon: {
    marginLeft: 8,
  },
  searchResultText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  searchResultTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
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
  // Old search container (keeping for reference)
  oldSearchContainer: {
    backgroundColor: theme.colors.bg1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bg0,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#FFFFFF",
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 4,
  },
  searchLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  searchResults: {
    maxHeight: 250,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  addIcon: {
    marginRight: 8,
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
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginTop: 12,
  },
  noResultsHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    marginTop: 4,
  },
  selectedExercisesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exerciseChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.bg1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    maxWidth: "100%",
  },
  exerciseChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  exerciseChipNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(74, 158, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseChipNumberText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4A9EFF",
  },
  exerciseChipText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  removeButton: {
    padding: 2,
  },
  addMoreChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderStyle: "dashed",
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  visualizationSection: {
    marginTop: -58, // Reduced from 2 to move map up another 22px (total 44px up from original 24)
    marginBottom: 10, // Move everything below up by 42px
  },
  timeIntervalBarContainer: {
    marginTop: -42, // Moved up 42px to reduce space between skill map and time interval bar
    marginBottom: 0,
    paddingHorizontal: 20,
  },
  timeIntervalBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 19, 27, 0.8)', // Dark gray like reference image
    borderRadius: 12,
    padding: 4,
    position: 'relative', // For absolute positioning of marker
    gap: 0, // No gap between options
  },
  timeIntervalMarker: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Light gray background for selected
    borderRadius: 8,
    top: 4, // Match bar top padding
    bottom: 4, // Match bar bottom padding
    left: 4, // Will be overridden by animated style, but sets initial position
    right: 'auto', // Ensure right is not set
  },
  timeIntervalOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 1, // Above marker
    marginHorizontal: 0, // No margin between options
  },
  timeIntervalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)', // Lighter gray for unselected
    textTransform: 'uppercase',
  },
  timeIntervalOptionTextActive: {
    color: '#FFFFFF', // Pure white for selected
  },
  dividerContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skillMapWithSkeleton: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 540, // Adjusted for chart size (500 + padding)
  },
  dataOverlay: {
    position: 'absolute',
    top: 20, // Match paddingVertical of radarChartContainer
    left: '50%',
    marginLeft: -250, // Half of chartSize (500 / 2) to center exactly on skeleton SVG
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: 500, // Must match skeleton chartSize
    height: 500, // Must match skeleton chartSize
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    backgroundColor: 'transparent',
  },
  loadingStar: {
    width: 72,
    height: 72,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    backgroundColor: 'transparent',
    padding: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: -2,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  errorContainer: {
    padding: 20,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#FF6B6B",
    textAlign: "center",
  },
  visualizationContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    overflow: "visible",
  },
  visualizationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 20,
    width: '100%',
  },
  visualizationTitleContainer: {
    flex: 1,
  },
  visualizationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
  },
  highestValueContainer: {
    alignItems: "flex-end",
  },
  highestValueLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 2,
  },
  highestValueText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  radarChartContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 540, // Adjusted for chart size (500 + padding)
    width: "100%",
    overflow: "visible",
    backgroundColor: 'transparent',
  },
  radarChartDataOnly: {
    alignItems: "center",
    justifyContent: "center",
    width: 500,
    height: 500,
    backgroundColor: 'transparent',
  },
  edgeCaseMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  edgeCaseText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  emptyStateContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginTop: 8,
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

