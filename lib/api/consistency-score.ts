// lib/api/consistency-score.ts
// API functions for consistency score calculations

import { supabase } from '../supabase';
import { getCurrentWeekStart } from './schedule';

// =====================================================
// Type Definitions
// =====================================================

export type ConsistencyScore = {
  weekStartDate: string;
  weekEndDate: string;
  scheduledCount: number;
  loggedCount: number;
  workoutPercentage: number; // (logged / scheduled) × 100
  longestGap: number; // Days
  gapPoints: number; // 0-20
  score: number; // Final score 0-100
  details: {
    scheduledDates: string[]; // Dates with scheduled workouts
    loggedDates: string[]; // Dates with logged workouts
    gapDays: number[]; // Array of gap lengths (e.g., [1, 1, 2] means three gaps of 1, 1, and 2 days)
  };
};

export type HistoricalScore = {
  weekStartDate: string;
  weekEndDate: string;
  score: number;
  scheduledCount: number;
  loggedCount: number;
  percentageChange: number | null; // % change from previous week (null for first week)
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get the week start date (Sunday) for any given date
 * Uses local date to avoid timezone issues
 */
export function getWeekStartDate(date: Date): string {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  
  // Format as local date (YYYY-MM-DD) to avoid timezone shifts
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

/**
 * Get the date range for a week (Sunday to Saturday)
 * Uses local date to avoid timezone issues
 */
export function getWeekDateRange(weekStartDate: string): { start: string; end: string } {
  const [year, month, day] = weekStartDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday (6 days after Sunday)
  
  // Format as local dates
  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dStr}`;
  };
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

/**
 * Get the most recent complete week (the week that has fully passed)
 * Uses local date to avoid timezone issues
 * 
 * WEEK CALCULATION RULES:
 * - Weeks run Sunday (day 0) to Saturday (day 6)
 * - A week is "complete" when it has fully passed (today is not in that week)
 * - Example: If today is Sunday 1/25/2026:
 *   - Current week: Sunday 1/25 to Saturday 1/31 (INCOMPLETE - just started)
 *   - Most recent complete week: Sunday 1/18 to Saturday 1/24 (COMPLETE - fully passed)
 *   - This complete week will be shown until next Sunday (2/1/2026)
 * - On next Sunday (2/1/2026), the week 1/25-1/31 becomes complete and will be shown
 */
export function getMostRecentCompleteWeek(): string {
  const today = new Date();
  const currentWeekStart = getCurrentWeekStart();
  
  // Parse current week start
  const [year, month, day] = currentWeekStart.split('-').map(Number);
  const weekStart = new Date(year, month - 1, day);
  
  // Always return the previous week (the most recent complete week)
  // The current week is always incomplete until it fully passes
  const prevWeek = new Date(weekStart);
  prevWeek.setDate(weekStart.getDate() - 7);
  return getWeekStartDate(prevWeek);
}

/**
 * Check if a label represents a rest day
 * Uses the same logic as getScheduleWithStatus()
 */
function isRestDay(label: string | null | undefined): boolean {
  if (!label) return true;
  
  const normalizedLabel = label.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
  
  return (
    normalizedLabel === '' ||
    normalizedLabel.startsWith('rest') ||
    normalizedLabel.endsWith('rest') ||
    normalizedLabel.includes(' rest ') ||
    normalizedLabel === 'rest day' ||
    normalizedLabel === 'restday' ||
    normalizedLabel.startsWith('day off') ||
    normalizedLabel.endsWith('off day')
  );
}

/**
 * Calculate gap points based on longest gap without workouts
 * Returns 0-20 points based on longest consecutive gap
 */
export function calculateGapPoints(loggedDates: string[], weekStartDate: string): number {
  // Generate array of all 7 days in the week
  const [year, month, day] = weekStartDate.split('-').map(Number);
  const weekStart = new Date(year, month - 1, day);
  
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    weekDays.push(`${y}-${m}-${d}`);
  }
  
  // Create a set of logged dates for quick lookup
  const loggedSet = new Set(loggedDates);
  
  // Find consecutive gaps
  const gaps: number[] = [];
  let currentGap = 0;
  
  for (const day of weekDays) {
    if (loggedSet.has(day)) {
      // Day has workout, end current gap if any
      if (currentGap > 0) {
        gaps.push(currentGap);
        currentGap = 0;
      }
    } else {
      // Day has no workout, increment gap
      currentGap++;
    }
  }
  
  // Add final gap if week ends with a gap
  if (currentGap > 0) {
    gaps.push(currentGap);
  }
  
  // Find longest gap
  const longestGap = gaps.length > 0 ? Math.max(...gaps) : 7; // If no workouts, gap is 7 days
  
  // Map to points
  if (longestGap === 0 || longestGap === 1) {
    return 20;
  } else if (longestGap === 2) {
    return 15;
  } else if (longestGap === 3) {
    return 10;
  } else if (longestGap === 4) {
    return 5;
  } else {
    // 5+ days
    return 0;
  }
}

// =====================================================
// Main API Functions
// =====================================================

/**
 * Get consistency score for a specific week
 */
export async function getConsistencyScore(
  weekStartDate: string
): Promise<{ data: ConsistencyScore | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    // Get week date range
    const { start, end } = getWeekDateRange(weekStartDate);

    // Step 1: Fetch scheduled workouts (across ALL modes)
    const { data: scheduledData, error: scheduledError } = await supabase
      .from('weekly_schedules')
      .select('day_index, label, week_start_date')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate);

    if (scheduledError) {
      console.error('❌ [ConsistencyScore] Error fetching scheduled workouts:', scheduledError);
      return { data: null, error: scheduledError };
    }

    // Filter out rest days and count scheduled workouts
    const scheduledWorkouts = (scheduledData || []).filter(
      (item) => item.label && !isRestDay(item.label)
    );
    const scheduledCount = scheduledWorkouts.length;

    // Get scheduled dates for details
    const scheduledDates: string[] = [];
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const weekStart = new Date(year, month - 1, day);
    scheduledWorkouts.forEach((item) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + item.day_index);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      scheduledDates.push(`${y}-${m}-${d}`);
    });

    // Step 2: Fetch logged workouts (across ALL modes)
    const { data: loggedWorkouts, error: loggedError } = await supabase
      .from('workouts')
      .select('performed_at')
      .eq('user_id', user.id)
      .gte('performed_at', start)
      .lte('performed_at', end);

    if (loggedError) {
      console.error('❌ [ConsistencyScore] Error fetching logged workouts:', loggedError);
      return { data: null, error: loggedError };
    }

    // Get distinct dates (one workout per day counts as 1)
    const loggedDatesSet = new Set((loggedWorkouts || []).map((w) => w.performed_at));
    const loggedDates = Array.from(loggedDatesSet);
    const loggedCount = loggedDates.length;

    // Step 3: Calculate workout percentage
    let workoutPercentage = 0;
    if (scheduledCount > 0) {
      workoutPercentage = (loggedCount / scheduledCount) * 100;
    }

    // Step 4: Calculate gap points
    const gapPoints = calculateGapPoints(loggedDates, weekStartDate);
    
    // Calculate longest gap for details
    const [y, m, d] = weekStartDate.split('-').map(Number);
    const ws = new Date(y, m - 1, d);
    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(ws);
      date.setDate(ws.getDate() + i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      weekDays.push(`${year}-${month}-${dayStr}`);
    }
    const loggedSet = new Set(loggedDates);
    const gaps: number[] = [];
    let currentGap = 0;
    for (const day of weekDays) {
      if (loggedSet.has(day)) {
        if (currentGap > 0) {
          gaps.push(currentGap);
          currentGap = 0;
        }
      } else {
        currentGap++;
      }
    }
    if (currentGap > 0) {
      gaps.push(currentGap);
    }
    const longestGap = gaps.length > 0 ? Math.max(...gaps) : 7;

    // Step 5: Calculate final score
    let score: number;
    if (scheduledCount === 0) {
      // Edge case: No scheduled workouts
      if (loggedCount === 0) {
        score = 0;
      } else {
        // Score = gapPoints × 5 (scaled to 100)
        score = gapPoints * 5;
      }
    } else {
      // Standard case: Score = (workoutPercentage × 0.8) + gapPoints
      score = workoutPercentage * 0.8 + gapPoints;
    }

    // Clamp score between 0 and 100
    // Handle NaN/Infinity cases
    if (!isFinite(score) || isNaN(score)) {
      score = 0;
    } else {
      score = Math.max(0, Math.min(100, Math.round(score)));
    }

    const result: ConsistencyScore = {
      weekStartDate,
      weekEndDate: end,
      scheduledCount,
      loggedCount,
      workoutPercentage,
      longestGap,
      gapPoints,
      score,
      details: {
        scheduledDates,
        loggedDates,
        gapDays: gaps,
      },
    };

    return { data: result, error: null };
  } catch (error: any) {
    console.error('❌ [ConsistencyScore] Exception:', error);
    return { data: null, error };
  }
}

/**
 * Get historical consistency scores
 * @param limit - Number of weeks to fetch going backwards from most recent complete week
 *                This is NOT "weeks since user joined" - it's just how many weeks to look back
 *                Default: 10 weeks. For average calculation, we use 52 weeks (1 year)
 *                The function will return scores for all weeks in this range, even if some have no data
 */
export async function getHistoricalConsistencyScores(
  limit: number = 10
): Promise<{ data: (HistoricalScore & { percentageChange: number | null })[] | null; error: any }> {
  try {
    const mostRecentWeek = getMostRecentCompleteWeek();
    
    // Calculate all weeks going backwards from most recent complete week
    // This goes back in time, not forward
    const weeks: string[] = [];
    let currentWeek = mostRecentWeek;
    
    for (let i = 0; i < limit; i++) {
      weeks.push(currentWeek);
      
      // Get previous week (go back 7 days)
      const [year, month, day] = currentWeek.split('-').map(Number);
      const weekDate = new Date(year, month - 1, day);
      weekDate.setDate(weekDate.getDate() - 7);
      currentWeek = getWeekStartDate(weekDate);
    }
    
    // Fetch scores for all weeks
    const scores: (HistoricalScore & { percentageChange: number | null })[] = [];
    
    for (let i = 0; i < weeks.length; i++) {
      const weekStart = weeks[i];
      const { data: scoreData, error } = await getConsistencyScore(weekStart);
      
      if (error) {
        console.error(`❌ [ConsistencyScore] Error fetching score for week ${weekStart}:`, error);
        continue; // Skip this week but continue with others
      }
      
      if (!scoreData) {
        continue; // Skip if no data
      }
      
      // Calculate percentage change from previous week
      let percentageChange: number | null = null;
      if (i > 0 && scores.length > 0) {
        const previousScore = scores[scores.length - 1].score;
        if (previousScore > 0) {
          percentageChange = ((scoreData.score - previousScore) / previousScore) * 100;
        } else if (scoreData.score > 0) {
          // Previous was 0, current is positive = 100% increase
          percentageChange = 100;
        }
        // If both are 0, percentageChange stays null
      }
      
      scores.push({
        weekStartDate: scoreData.weekStartDate,
        weekEndDate: scoreData.weekEndDate,
        score: scoreData.score,
        scheduledCount: scoreData.scheduledCount,
        loggedCount: scoreData.loggedCount,
        percentageChange,
      });
    }
    
    return { data: scores, error: null };
  } catch (error: any) {
    console.error('❌ [ConsistencyScore] Exception in getHistoricalConsistencyScores:', error);
    return { data: null, error };
  }
}

/**
 * Get average consistency score across recent weeks
 * @param weeksLimit - Number of weeks to look back for data (default: 52 = 1 year)
 *                     Note: Average is calculated only from weeks where user has data
 *                     (weeks with scheduled workouts OR logged workouts)
 *                     Feature works indefinitely; this only affects how far back we look
 */
export async function getAverageConsistencyScore(
  weeksLimit: number | null = 52
): Promise<{ data: number | null; error: any }> {
  try {
    // Get historical scores (limit to recent weeks for average, or all if no limit)
    // Using a reasonable default of 52 weeks (1 year) keeps the average relevant to recent performance
    // The feature itself works indefinitely - this is just for calculating the average
    const limit = weeksLimit ?? 1000; // Use large number if no limit specified
    const { data: historicalScores, error } = await getHistoricalConsistencyScores(limit);
    
    if (error) {
      return { data: null, error };
    }
    
    if (!historicalScores || historicalScores.length === 0) {
      return { data: null, error: null }; // No data yet
    }
    
    // Filter to only weeks where user has data (scheduled OR logged workouts)
    // This ensures we only average weeks where the user was actually using the app
    // A score of 0 is still valid if the user had scheduled workouts but didn't log them
    const weeksWithData = historicalScores.filter(
      (score) => score.scheduledCount > 0 || score.loggedCount > 0
    );
    
    if (weeksWithData.length === 0) {
      return { data: null, error: null }; // No weeks with data
    }
    
    // Calculate average only from weeks with data
    // This gives the true average of consistency for weeks the user was active
    const sum = weeksWithData.reduce((acc, score) => acc + score.score, 0);
    const average = sum / weeksWithData.length;
    
    return { data: Math.round(average * 100) / 100, error: null }; // Round to 2 decimal places
  } catch (error: any) {
    console.error('❌ [ConsistencyScore] Exception in getAverageConsistencyScore:', error);
    return { data: null, error };
  }
}
