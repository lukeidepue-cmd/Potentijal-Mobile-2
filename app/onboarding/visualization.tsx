import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { theme } from '../../constants/theme';
import { useOnboardingData } from '../../providers/OnboardingDataContext';

const TOTAL_STEPS = 7;
const CURRENT_STEP = 4;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 72;
const CHART_HEIGHT = 200;
const CHART_PADDING_LEFT = 48;
const CHART_PADDING_RIGHT = 20;
const CHART_PADDING_TOP = 20;
const CHART_PADDING_BOTTOM = 36;
const PLOT_WIDTH = CHART_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

const TIME_LABELS = ['Today', 'Wk 2', 'Mo 1', 'Mo 3'];

function computeChartData(exercise: { value1: number; value2: number; field1: string; field2: string }) {
  const { value1, value2, field1, field2 } = exercise;

  let startValue: number;
  let isPercentage = false;

  const isRatio = ['attempted', 'reps'].includes(field1) && ['made', 'completed'].includes(field2);
  if (isRatio && value1 > 0) {
    startValue = (value2 / value1) * 100;
    isPercentage = true;
  } else {
    startValue = value2;
  }

  const improvementFactors = [1, 1.08, 1.18, 1.30];
  const values = improvementFactors.map(f => {
    const v = startValue * f;
    return isPercentage ? Math.min(v, 100) : v;
  });

  return { values, isPercentage, startValue };
}

interface ChartProps {
  values: number[];
  isPercentage: boolean;
}

function ProgressChart({ values, isPercentage }: ChartProps) {
  const yMin = 0;
  const yMax = isPercentage ? 100 : Math.ceil(values[values.length - 1] * 1.25);
  const yRange = yMax - yMin || 1;

  const points = values.map((v, i) => {
    const x = CHART_PADDING_LEFT + (i / (values.length - 1)) * PLOT_WIDTH;
    const y = CHART_PADDING_TOP + PLOT_HEIGHT - ((v - yMin) / yRange) * PLOT_HEIGHT;
    return { x, y };
  });

  const projectedPath = points
    .slice(1)
    .map((p, i) => (i === 0 ? `M ${points[0].x} ${points[0].y} L ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange / yTicks) * i);

  return (
    <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
      {/* Grid lines */}
      {yTickValues.map((v, i) => {
        const y = CHART_PADDING_TOP + PLOT_HEIGHT - ((v - yMin) / yRange) * PLOT_HEIGHT;
        return (
          <React.Fragment key={`grid-${i}`}>
            <Line
              x1={CHART_PADDING_LEFT}
              y1={y}
              x2={CHART_PADDING_LEFT + PLOT_WIDTH}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <SvgText
              x={CHART_PADDING_LEFT - 8}
              y={y + 4}
              textAnchor="end"
              fill={theme.colors.textLo}
              fontSize={11}
              fontWeight="500"
            >
              {isPercentage ? `${Math.round(v)}%` : Math.round(v).toString()}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* X-axis labels */}
      {TIME_LABELS.map((label, i) => {
        const x = CHART_PADDING_LEFT + (i / (TIME_LABELS.length - 1)) * PLOT_WIDTH;
        return (
          <SvgText
            key={`x-${i}`}
            x={x}
            y={CHART_HEIGHT - 6}
            textAnchor="middle"
            fill={theme.colors.textLo}
            fontSize={11}
            fontWeight="500"
          >
            {label}
          </SvgText>
        );
      })}

      {/* Projected dashed line */}
      {projectedPath && (
        <Path
          d={projectedPath}
          stroke={theme.colors.primary600}
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeOpacity={0.5}
          fill="none"
        />
      )}

      {/* Projected dots */}
      {points.slice(1).map((p, i) => (
        <Circle
          key={`proj-${i}`}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={theme.colors.primary600}
          opacity={0.35}
        />
      ))}

      {/* Actual data point (solid, prominent) */}
      <Circle cx={points[0].x} cy={points[0].y} r={7} fill={theme.colors.primary600} />
      <Circle cx={points[0].x} cy={points[0].y} r={12} fill={theme.colors.primary600} opacity={0.2} />
    </Svg>
  );
}

export default function VisualizationScreen() {
  const insets = useSafeAreaInsets();
  const { data: onboardingData } = useOnboardingData();
  const exercise = onboardingData.firstExercise;

  const chartData = useMemo(() => {
    if (!exercise) return null;
    return computeChartData(exercise);
  }, [exercise]);

  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100;

  const metricDisplay = useMemo(() => {
    if (!exercise || !chartData) return '';
    if (chartData.isPercentage) {
      return `${Math.round(chartData.startValue)}%`;
    }
    return chartData.startValue.toString();
  }, [exercise, chartData]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Same background as sport-selection / first-win */}
      <View style={styles.background} />

      {/* Header - same as previous screens */}
      <View style={[styles.header, { zIndex: 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textHi} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{CURRENT_STEP}/{TOTAL_STEPS}</Text>
        </View>
      </View>

      {/* Content - same heading style as previous screens */}
      <View style={[styles.content, { zIndex: 10 }]}>
        <Text style={styles.title}>We'll use this as a benchmark</Text>
        <Text style={styles.subtitle}>Every session you log builds improvement</Text>

        {/* Exercise summary - glass card like "Name your exercise here" */}
        {exercise && (
          <View style={styles.exerciseSummary}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 36 : 28}
              tint="dark"
              style={styles.exerciseSummaryBlur}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <Text style={styles.exerciseName}>{exercise.name}</Text>
            <Text style={styles.exerciseValue}>
              {exercise.value2} / {exercise.value1} {exercise.label1.toLowerCase()}
              {chartData?.isPercentage ? ` — ${metricDisplay}` : ` — ${metricDisplay} ${exercise.label2.toLowerCase()}`}
            </Text>
          </View>
        )}

        {/* Chart */}
        {chartData && (
          <View style={styles.chartContainer}>
            <ProgressChart values={chartData.values} isPercentage={chartData.isPercentage} />
          </View>
        )}

        <Text style={styles.chartCaption}>
          Your projected progress for this exercise
        </Text>
      </View>

      {/* Continue button - same style as sport-selection / first-win Next */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, zIndex: 10 }]}>
        <TouchableOpacity
          style={[styles.nextButton, styles.nextButtonEnabled]}
          onPress={() => router.push('/onboarding/email-entry')}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 20,
  },
  progressBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.strokeSoft,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary600,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textLo,
    minWidth: 30,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textLo,
    lineHeight: 20,
    marginBottom: 28,
  },
  exerciseSummary: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 28,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  exerciseSummaryBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textHi,
    marginBottom: 4,
    zIndex: 1,
  },
  exerciseValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textLo,
    zIndex: 1,
  },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  chartCaption: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textLo,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  nextButtonEnabled: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  nextButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
  },
});
