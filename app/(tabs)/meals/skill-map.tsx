// app/(tabs)/meals/skill-map.tsx
// Skill Map Screen

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, Dimensions, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from "react-native-reanimated";
import Svg, { G, Line as SvgLine, Path, Circle, Text as SvgText, Polygon } from "react-native-svg";
import { theme } from "@/constants/theme";
import { SportMode } from "@/lib/types";
import { TimeInterval } from "@/lib/utils/time-intervals";
// getViewConfig / getCalculationTypeForView are referenced by getMetricLabelAndUnit
// (still used inside SkillMapVisualization). For user-defined views these return
// null and the helper falls back to "{ label: viewName, unit: null }" — which
// is the correct behavior since user views don't have a built-in unit.
import { getViewConfig, getCalculationTypeForView, ViewCalculationType } from "@/lib/api/progress-views";
import { SkillMapExerciseData } from "@/hooks/useSkillMapData";
import {
  listViews,
  listPresetExerciseNames,
  getViewExerciseComparison,
  type ExerciseView,
  type ViewExerciseValue,
  type ViewDays,
} from "@/lib/api/views";
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

  // -------- State --------
  const [views, setViews] = useState<ExerciseView[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>(90);
  const [showHelp, setShowHelp] = useState(false);

  // Exercise selection — the user picks up to 6 exercise names logged under the
  // selected preset; the radar compares them against each other.
  const MAX_EXERCISES = 6;
  const [availableExercises, setAvailableExercises] = useState<string[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  // Comparison data — one value per selected exercise (same formula/aggregation
  // as the chosen view, grouped by exercise instead of by time bucket).
  const [comparisonData, setComparisonData] = useState<ViewExerciseValue[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Stars background (kept from the original visual treatment)
  const [stars] = useState(() => generateStars(150));

  // -------- Time interval bar (animated marker) --------
  const timeIntervalOptions = [
    { value: 30, label: "1M" },
    { value: 90, label: "3M" },
    { value: 180, label: "6M" },
    { value: 360, label: "1Y" },
  ];
  const selectedIndex = timeIntervalOptions.findIndex(opt => opt.value === timeInterval);
  const markerPosition = useSharedValue(selectedIndex >= 0 ? selectedIndex : 0);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    const newIndex = timeIntervalOptions.findIndex(opt => opt.value === timeInterval);
    if (newIndex !== -1) {
      markerPosition.value = withSpring(newIndex, { damping: 40, stiffness: 200 });
    }
  }, [timeInterval]);

  const markerAnimatedStyle = useAnimatedStyle(() => {
    if (barWidth.value === 0) return { opacity: 0 };
    const availableWidth = barWidth.value - 8;
    const optionWidth = availableWidth / timeIntervalOptions.length;
    const leftPosition = markerPosition.value * optionWidth + 4;
    return {
      position: "absolute" as const,
      left: leftPosition,
      width: optionWidth,
      top: 4,
      bottom: 4,
      opacity: 1,
    };
  });

  // Bumped on every focus so dependent loaders (exercise names) re-run and pick
  // up data logged since the last visit, without wiping the user's selections.
  const [focusNonce, setFocusNonce] = useState(0);

  // -------- Load views (refresh on focus so newly-built views show up) --------
  // All views are shown together now — there's no preset picker. The selected
  // view's own preset drives the exercise list (same model as the Progress Graph).
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setFocusNonce(n => n + 1);
    listViews().then((v) => {
      if (!active) return;
      if (v.data) setViews(v.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, []));

  // Keep selectedViewId valid as the views list changes; default to the first
  // view so the screen shows something useful on first visit.
  useEffect(() => {
    if (views.length === 0) {
      setSelectedViewId(null);
    } else if (!views.find(v => v.id === selectedViewId)) {
      setSelectedViewId(views[0].id);
    }
  }, [views, selectedViewId]);

  const selectedView = useMemo(
    () => views.find(v => v.id === selectedViewId) ?? null,
    [views, selectedViewId],
  );

  // The preset is whatever the selected view belongs to — no separate picker.
  const selectedPresetId = selectedView?.presetId ?? null;

  // -------- Load the exercise names logged under the selected preset --------
  // Re-runs when the preset changes AND on every screen focus (focusNonce), so
  // exercises logged since the last visit show up. On a preset change we default
  // to the first few names; on a focus refresh we keep the user's selection
  // (pruned to names that still exist).
  const selectionPresetRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!selectedPresetId) {
      setAvailableExercises([]);
      setSelectedExercises([]);
      selectionPresetRef.current = null;
      return;
    }
    let active = true;
    setExercisesLoading(true);
    listPresetExerciseNames({ presetId: selectedPresetId }).then(({ data }) => {
      if (!active) return;
      const names = data || [];
      const isNewPreset = selectionPresetRef.current !== selectedPresetId;
      selectionPresetRef.current = selectedPresetId;
      setAvailableExercises(names);
      setSelectedExercises(prev => {
        // New preset → start blank; the user chooses which exercises to map.
        if (isNewPreset) return [];
        // Focus refresh → keep what the user picked, dropping anything that no
        // longer exists. Stay blank if nothing was selected.
        return prev.filter(n => names.includes(n));
      });
      setExercisesLoading(false);
    });
    return () => { active = false; };
  }, [selectedPresetId, focusNonce]);

  const toggleExercise = useCallback((name: string) => {
    setSelectedExercises(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name);
      if (prev.length >= MAX_EXERCISES) return prev; // cap at 6
      return [...prev, name];
    });
  }, []);

  // -------- Fetch per-exercise comparison data --------
  useEffect(() => {
    if (!selectedView || selectedExercises.length === 0) {
      setComparisonData([]);
      setComparisonError(null);
      return;
    }
    let active = true;
    setComparisonLoading(true);
    setComparisonError(null);
    getViewExerciseComparison({
      view: selectedView,
      days: timeInterval as ViewDays,
      exerciseNames: selectedExercises,
    }).then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setComparisonError(error.message || "Failed to load data");
        setComparisonData([]);
      } else {
        setComparisonData(data || []);
      }
      setComparisonLoading(false);
    });
    return () => { active = false; };
  }, [selectedView, selectedExercises, timeInterval]);

  // -------- Transform per-exercise values to SkillMapExerciseData --------
  // One axis per selected exercise; percentage is each exercise's value relative
  // to the highest among the selected set (the existing % mechanism).
  const { skillMapData, highestValue, hasAnyData } = useMemo(() => {
    if (comparisonData.length === 0) {
      return {
        skillMapData: [] as SkillMapExerciseData[],
        highestValue: null as number | null,
        hasAnyData: false,
      };
    }
    const values = comparisonData.map(p => p.value ?? 0);
    const max = Math.max(0, ...values);
    const hasAny = comparisonData.some(p => p.value !== null && p.value > 0);

    const data: SkillMapExerciseData[] = comparisonData.map(p => {
      const v = p.value ?? 0;
      const pct = max > 0 ? (v / max) * 100 : 0;
      return {
        exerciseName: p.exerciseName,
        rawValue: v,
        percentage: pct,
        isHighest: v === max && max > 0,
      };
    });

    return {
      skillMapData: data,
      highestValue: max > 0 ? max : null,
      hasAnyData: hasAny,
    };
  }, [comparisonData]);

  // -------- Spinning loading star --------
  const starRotation = useSharedValue(0);
  useEffect(() => {
    if (comparisonLoading) {
      starRotation.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      starRotation.value = 0;
    }
  }, [comparisonLoading]);
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // -------- Render --------
  // The "view name" passed to the visualization is used as the metric label
  // on the radar chart. With the new system, this becomes the view name.
  const viewNameForChart = selectedView?.name ?? "";

  return (
    <View style={styles.container}>
      {/* Full Screen Gradient - same atmospheric blue to black as the original */}
      <LinearGradient
        colors={[
          "rgba(13, 27, 43, 0.95)",
          "rgba(13, 27, 43, 0.9)",
          "rgba(13, 27, 43, 0.7)",
          "rgba(13, 27, 43, 0.5)",
          "rgba(13, 27, 43, 0.3)",
          "rgba(10, 15, 22, 0.6)",
          theme.colors.bg0,
          theme.colors.bg0,
          theme.colors.bg0,
        ]}
        locations={[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.8, 0.9, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Stars background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {stars.map((star) => (
          <View
            key={star.id}
            style={{
              position: "absolute",
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: "#FFFFFF",
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={() => setShowHelp(true)} style={styles.helpButton} hitSlop={10}>
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
      >
        {/* Skill Map Skeleton + Visualization */}
        <View style={styles.visualizationSection}>
          <View style={styles.skillMapWithSkeleton}>
            <SkillMapSkeleton />

            {selectedView && hasAnyData && skillMapData.length > 0 && !comparisonLoading && !comparisonError && (
              <View style={styles.dataOverlay}>
                <SkillMapVisualization
                  data={skillMapData}
                  highestValue={highestValue}
                  viewName={viewNameForChart}
                  mode={"workout" as SportMode}
                  exerciseCount={skillMapData.length}
                />
              </View>
            )}

            {comparisonLoading && (
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

            {comparisonError && (
              <View style={styles.errorOverlay}>
                <Text style={styles.errorText}>Error: {comparisonError}</Text>
              </View>
            )}
          </View>
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

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
        </View>

        {/* Views Section - replaces the old radio list with chips + Build New View.
            Shared with Progress Graph (same `views` table); a view created on
            either screen shows up on both. */}
        <View style={styles.controlsSection}>
          <Text style={styles.selectViewHeading}>Select View</Text>

          <View style={styles.viewChipRow}>
            {/* + Build New View - sits first, same affordance as the Progress Graph */}
            <Pressable
              onPress={() => router.push("/(tabs)/(home)/build-view?from=skill-map" as any)}
              style={({ pressed }) => [styles.addViewChip, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={16} color="#22C55E" />
              <Text style={styles.addViewChipText}>Build New View</Text>
            </Pressable>

            {views.map((v) => {
              const selected = v.id === selectedViewId;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setSelectedViewId(v.id)}
                  style={({ pressed }) => [
                    styles.viewChip,
                    selected && styles.viewChipSelected,
                    pressed && !selected && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[styles.viewChipText, selected && styles.viewChipTextSelected]}
                    numberOfLines={1}
                  >
                    {v.name}{" "}
                    <Text
                      style={[
                        styles.viewChipPresetText,
                        selected && styles.viewChipPresetTextSelected,
                      ]}
                    >
                      ({v.presetName})
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Helper line - match the "what to do next" tone of the Progress Graph empty states */}
          {!loading && views.length === 0 && (
            <Text style={styles.viewHelperText}>
              No views yet. Build a preset on the Home tab and log a workout with it, then tap +Build New View.
            </Text>
          )}

          {/* Exercise selection — pick up to 6 exercises logged under this preset
              to compare on the map. Only meaningful once a view exists. */}
          {selectedView && (
            <View style={styles.exerciseSelectBlock}>
              <View style={styles.exerciseSelectHeader}>
                <Text style={styles.selectExercisesHeading}>Select Exercises</Text>
                <Text style={styles.exerciseSelectCount}>
                  {selectedExercises.length}/{MAX_EXERCISES}
                </Text>
              </View>

              {exercisesLoading ? (
                <Text style={styles.viewHelperText}>Loading exercises…</Text>
              ) : availableExercises.length === 0 ? (
                <Text style={styles.viewHelperText}>
                  No exercises logged under this preset yet. Log a workout using it, then come back.
                </Text>
              ) : (
                <View style={styles.viewChipRow}>
                  {availableExercises.map((name) => {
                    const selected = selectedExercises.includes(name);
                    const atMax = selectedExercises.length >= MAX_EXERCISES;
                    const disabled = !selected && atMax;
                    return (
                      <Pressable
                        key={name}
                        onPress={() => toggleExercise(name)}
                        disabled={disabled}
                        style={({ pressed }) => [
                          styles.viewChip,
                          selected && styles.viewChipSelected,
                          disabled && { opacity: 0.4 },
                          pressed && !selected && !disabled && { opacity: 0.7 },
                        ]}
                      >
                        <Text
                          style={[styles.viewChipText, selected && styles.viewChipTextSelected]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selectedExercises.length >= MAX_EXERCISES && (
                <Text style={styles.viewHelperText}>
                  Maximum of {MAX_EXERCISES} exercises. Deselect one to swap.
                </Text>
              )}
            </View>
          )}

          {selectedView && selectedExercises.length === 0 && availableExercises.length > 0 && !exercisesLoading && (
            <Text style={styles.viewHelperText}>
              Select at least one exercise to build the map.
            </Text>
          )}
          {selectedView && selectedExercises.length > 0 && !comparisonLoading && !hasAnyData && (
            <Text style={styles.viewHelperText}>
              No data in this timeframe for the selected exercises. Try a longer timeframe or log a workout.
            </Text>
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
          <Text style={helpStyles.heading}>What Skill Map Does</Text>
          <Text style={helpStyles.text}>
            Skill Map puts up to six of your exercises side by side on a radar (spider) chart and shows how they stack up against each other. Where the Progress Graph tracks one exercise over time, Skill Map is about <Text style={helpStyles.bold}>comparison</Text> — which exercises are strong, which are lagging, and how balanced you are across them.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>First, The Building Blocks</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Preset:</Text> a template you built (e.g. "Exercise", "Shooting Drills"). It defines the stat names you fill in when logging.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>Exercise:</Text> a single thing you log under a preset, named by you (e.g. "Bench Press", "Sprint drill"). Everything you ever log in a box with that name is the same exercise — its data adds up over time. One preset can hold many exercises.</Text>
          <Text style={helpStyles.bullet}>• <Text style={helpStyles.bold}>View:</Text> a way to turn a preset's stats into one number. It has a formula (e.g. Reps × Weight) and an aggregation — Highest, Total, or Average. The same preset can have many views, each measuring something different.</Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How To Build A Map</Text>
          <Text style={helpStyles.bullet}>1. <Text style={helpStyles.bold}>Pick a preset</Text> from the dropdown at the top.</Text>
          <Text style={helpStyles.bullet}>2. <Text style={helpStyles.bold}>Pick a view</Text> from the chips (or tap "+Build New View" to make one). The view decides how every exercise on the map is scored.</Text>
          <Text style={helpStyles.bullet}>3. <Text style={helpStyles.bold}>Select up to six exercises</Text> from the Select Exercises list. Each one you tap becomes a spoke. Tap again to remove it; the counter shows how many of the six slots you've used.</Text>
          <Text style={helpStyles.text}>
            The map starts blank on purpose — nothing is drawn until you add at least one exercise.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>How Each Exercise Is Scored</Text>
          <Text style={helpStyles.text}>
            For every exercise you select, Skill Map looks at all of its sets inside the timeframe, runs the view's formula on each set, then collapses them into one number using the view's aggregation. Example: a "Peak Reps × Weight" view gives each exercise its single best Reps × Weight set in the window.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Reading The Chart</Text>
          <Text style={helpStyles.text}>
            Each spoke is one selected exercise. The percentages are <Text style={helpStyles.bold}>relative</Text>: your strongest exercise in the group sits at 100% (its dot turns gold), and every other exercise is shown as a percentage of that best one. So 60% means that exercise is at 60% of your top performer for this view.
          </Text>
          <Text style={helpStyles.text}>
            Under each spoke you also see the real value the percentage came from. A large, even shape means your selected exercises are well-balanced. A spiky, lopsided shape points straight at the ones that are behind.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Timeframes</Text>
          <Text style={helpStyles.text}>
            The 1M / 3M / 6M / 1Y bar sets how far back each exercise's value is calculated from — only workouts inside that window count. Widen it to compare lifetime-ish strength; narrow it to compare recent form. Switching it recalculates every spoke instantly.
          </Text>
        </View>

        <View style={helpStyles.section}>
          <Text style={helpStyles.heading}>Shared With Progress Graph</Text>
          <Text style={helpStyles.text}>
            Views are shared between both screens — build one here or on the Progress Graph and it shows up in both. The Progress Graph plots a single exercise as a line over time; Skill Map compares several exercises at one glance. Same views, same exercises, two lenses.
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

  // === NEW: preset + view picker pieces ===
  // Empty-state copy inside the preset dropdown when the user has no presets yet.
  pickerEmptyText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: "center",
  },
  // Row of view chips at the bottom (replaces the old radio list).
  viewChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  // "+ Build New View" chip — dashed pill, accent + sign.
  addViewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#22C55E",
  },
  addViewChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.92)",
    letterSpacing: -0.1,
  },
  // User-view chip — subtle by default, solid green when selected.
  viewChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    maxWidth: 220,
  },
  viewChipSelected: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  viewChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.92)",
    letterSpacing: -0.1,
  },
  viewChipTextSelected: {
    color: "#06090C",
    fontWeight: "700",
  },
  // Dimmed "(Preset Name)" suffix inside each view chip — shows which preset a
  // view belongs to now that all presets' views are listed together.
  viewChipPresetText: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.45)",
  },
  viewChipPresetTextSelected: { color: "rgba(6, 9, 12, 0.55)" },
  viewHelperText: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 4,
  },

  // === Exercise selection (Skill Map) ===
  exerciseSelectBlock: {
    marginTop: 24,
  },
  exerciseSelectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  selectExercisesHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  exerciseSelectCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    fontVariant: ["tabular-nums"],
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
  searchResultsContent: {
    flexGrow: 0,
  },
  actionIcon: {
    marginLeft: 8,
  },
  searchResultTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
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

