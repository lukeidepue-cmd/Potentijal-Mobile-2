/**
 * Consistency Score Visualization Component
 * Displays a semicircle with 100 bars representing the consistency score (0-100)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Line as SvgLine } from 'react-native-svg';
import { theme } from '@/constants/theme';

export interface ConsistencyScoreVisualizationProps {
  score: number; // 0-100
  size?: number; // Optional size override (default: 280)
}

/**
 * Consistency Score Visualization Component
 * 
 * Displays a semicircle with 100 bars evenly distributed around 180 degrees.
 * Each bar represents 1 point. Bars are colored up to the score value.
 * The semicircle curves downward (bottom semicircle) with bars filling from left to right.
 */
export function ConsistencyScoreVisualization({
  score,
  size = 280,
}: ConsistencyScoreVisualizationProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  
  // Calculate center and radius for a bottom semicircle
  // The center of the full circle is positioned at the bottom
  // This creates a bottom semicircle that curves downward
  const centerX = size / 2;
  const centerY = size * 0.85; // Center positioned near bottom to create bottom semicircle
  const radius = size * 0.35; // Radius of the semicircle
  const barLength = size * 0.08; // Length of each bar (8% of size)
  const barWidth = 2; // Width of each bar
  
  // Generate 100 bars
  const bars = Array.from({ length: 100 }, (_, index) => {
    // Calculate angle: 180° to 0° (going from left to right)
    // In standard math coordinates: 180° = left, 90° = up, 0° = right
    // For a bottom semicircle with center at bottom, we use angles 180° to 0°
    // and subtract from centerY to get the arc above the center
    const angle = (180 - (index / 100) * 180) * (Math.PI / 180);
    
    // Calculate position on semicircle
    // For bottom semicircle with center at bottom:
    // x = centerX + radius*cos(angle)
    // y = centerY - radius*sin(angle) (subtract to get arc above center)
    const x1 = centerX + radius * Math.cos(angle);
    const y1 = centerY - radius * Math.sin(angle);
    
    // Calculate end position (extending outward/upward from the arc)
    const x2 = centerX + (radius + barLength) * Math.cos(angle);
    const y2 = centerY - (radius + barLength) * Math.sin(angle);
    
    // Determine if bar should be colored (index < score)
    const isColored = index < clampedScore;
    
    // Glowing blue and white bars
    let barColor: string;
    if (isColored) {
      // Glowing blue-white for active bars
      // Use a bright blue-white that glows
      barColor = '#6BB6FF'; // Bright blue-white glow
    } else {
      // Inactive bars - subtle grey
      barColor = 'rgba(255, 255, 255, 0.15)';
    }
    
    return {
      index,
      x1,
      y1,
      x2,
      y2,
      angle,
      isColored,
      barColor,
    };
  });
  
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {/* Draw glow layers first (behind main bars) */}
          {bars.filter(bar => bar.isColored).map((bar) => (
            <SvgLine
              key={`bar-glow-${bar.index}`}
              x1={bar.x1}
              y1={bar.y1}
              x2={bar.x2}
              y2={bar.y2}
              stroke="rgba(107, 182, 255, 0.5)" // Lighter blue-white glow
              strokeWidth={barWidth + 2} // Reduced from +3 to +2 for smaller glow
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}
          {/* Draw main bars on top */}
          {bars.map((bar) => (
            <SvgLine
              key={`bar-${bar.index}`}
              x1={bar.x1}
              y1={bar.y1}
              x2={bar.x2}
              y2={bar.y2}
              stroke={bar.barColor}
              strokeWidth={barWidth}
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
