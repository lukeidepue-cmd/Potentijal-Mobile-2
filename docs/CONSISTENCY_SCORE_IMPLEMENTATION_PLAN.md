# Consistency Score Implementation Plan

**Status:** Detailed Step-by-Step Plan  
**Date:** Current Session  
**Purpose:** Comprehensive roadmap for implementing the Consistency Score feature

---

## Overview

The Consistency Score is a premium feature that calculates and displays a user's weekly training consistency based on:
1. **Scheduled vs Logged Workouts** (80% of score)
2. **Gap Penalties** (20% of score)

The score updates at the beginning of each week, displaying the most recent complete week's data. Historical weeks are shown below with week-over-week percentage changes.

---

## Key Concepts

### Score Calculation Formula

**Standard Case (Has Scheduled Workouts):**
- **80% Component:** `(Logged workouts / Scheduled workouts) × 100 × 0.8`
- **20% Component:** Gap penalty points based on longest gap
  - 0 gaps or 1 day gaps: 20 points
  - 2 day gap: 15 points
  - 3 day gap: 10 points
  - 4 day gap: 5 points
  - 5+ day gap: 0 points
- **Final Score:** `(Workout % × 0.8) + Gap Points`

**Edge Cases:**
- **0 scheduled, 0 logged:** Score = 0
- **0 scheduled, some logged:** Score = Gap Points × 5 (scaled to 100)
  - Example: 3 day gap (normally 10 points) → 10 × 5 = 50
- **0 scheduled, 7 consecutive days logged:** Score = 20 × 5 = 100

### Week Definition

- **Week starts:** Sunday (day 0)
- **Week ends:** Saturday (day 6)
- **Most recent complete week:** The most recent week that has fully passed
- **Current week:** The week containing today (may be incomplete)

### Gap Calculation

A "gap" is the number of consecutive days **without** a logged workout within the week.

**Example:**
- Week: Sun, Mon, Tue, Wed, Thu, Fri, Sat
- Logged workouts on: Sun, Mon, Thu, Fri
- Gaps: 1 day (Tue), 1 day (Wed), 1 day (Sat)
- **Longest gap:** 1 day → 20 points

**Another Example:**
- Week: Sun, Mon, Tue, Wed, Thu, Fri, Sat
- Logged workouts on: Sun, Fri
- Gaps: 3 days (Mon-Wed), 1 day (Thu), 1 day (Sat)
- **Longest gap:** 3 days → 10 points

### Data Sources

1. **Scheduled Workouts:** `weekly_schedules` table
   - Filter by `week_start_date` matching the week
   - Count rows where `label` is NOT null/empty AND NOT a rest day
   - **Important:** Count across ALL sport modes (not mode-specific)

2. **Logged Workouts:** `workouts` table
   - Filter by `performed_at` within the week date range
   - Count distinct dates (one workout per day counts as 1)
   - **Important:** Count across ALL sport modes (not mode-specific)

3. **Gap Calculation:**
   - Get all logged workout dates within the week
   - Calculate consecutive days without workouts
   - Find the longest gap

---

## Current State Analysis

### What Exists:
- ✅ **Screen Placeholder** (`app/(tabs)/meals/consistency-score.tsx`)
  - Basic header with back button
  - Placeholder content

- ✅ **Database Schema**
  - `weekly_schedules` table with `week_start_date`, `day_index`, `label`, `mode`
  - `workouts` table with `performed_at`, `mode`, `user_id`
  - Week starts on Sunday (day_index 0 = Sunday)

- ✅ **Week Utilities** (`lib/api/schedule.ts`)
  - `getCurrentWeekStart()` - Returns current week's Sunday date
  - `getNextWeekStart()` - Returns next week's Sunday date
  - Date formatting utilities

- ✅ **Notification System** (`lib/notifications/notifications.ts`)
  - `scheduleConsistencyScoreNotification()` - Schedules weekly notification
  - Already handles premium gating

### What Needs to Be Built:
- ❌ **Consistency Score API** - Functions to calculate scores
- ❌ **Consistency Score Hook** - React hook for data fetching
- ❌ **Score Calculation Logic** - Core calculation functions
- ❌ **UI Components** - Semicircle visualization, historical list, details
- ❌ **Week Utilities** - Helper functions for week calculations

---

## Implementation Plan

### Step 1: Create Consistency Score API Functions

**File:** `lib/api/consistency-score.ts`

**Purpose:** Core API functions for fetching and calculating consistency scores.

#### 1.1 Helper Functions

**Function:** `getWeekStartDate(date: Date): string`
- Input: Any date
- Output: ISO date string (YYYY-MM-DD) of the Sunday that starts that week
- Logic: Find the Sunday before or on the given date
- Example: If date is Wednesday, return the previous Sunday

**Function:** `getWeekDateRange(weekStartDate: string): { start: string, end: string }`
- Input: Week start date (Sunday)
- Output: Object with start (Sunday) and end (Saturday) dates
- Logic: Start = weekStartDate, End = weekStartDate + 6 days

**Function:** `getMostRecentCompleteWeek(): string`
- Input: None
- Output: Week start date (Sunday) of the most recent complete week
- Logic:
  - Get current week start
  - If today is Sunday, return previous week's start
  - Otherwise, return previous week's start
- **Important:** A week is "complete" if it has fully passed (today is not in that week)

**Function:** `calculateGapPoints(loggedDates: string[], weekStartDate: string): number`
- Input:
  - `loggedDates`: Array of dates (YYYY-MM-DD) when workouts were logged
  - `weekStartDate`: Sunday date of the week
- Output: Points (0-20) based on longest gap
- Logic:
  1. Generate array of all 7 days in the week
  2. Mark which days have logged workouts
  3. Find consecutive days without workouts
  4. Find the longest consecutive gap
  5. Map to points:
     - 0 gaps or max gap = 1 day: 20 points
     - Max gap = 2 days: 15 points
     - Max gap = 3 days: 10 points
     - Max gap = 4 days: 5 points
     - Max gap = 5+ days: 0 points

#### 1.2 Main API Functions

**Function:** `getConsistencyScore(weekStartDate: string): Promise<{ data: ConsistencyScore | null, error: any }>`

**Type Definition:**
```typescript
type ConsistencyScore = {
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
```

**Logic:**
1. Get week date range (Sunday to Saturday)
2. Fetch scheduled workouts:
   - Query `weekly_schedules` table
   - Filter by `week_start_date = weekStartDate`
   - Filter out rest days (label is null, empty, or matches rest patterns)
   - Count distinct rows (each scheduled workout counts as 1)
   - **Important:** Count across ALL modes (not mode-specific)
3. Fetch logged workouts:
   - Query `workouts` table
   - Filter by `performed_at` within week date range
   - Get distinct `performed_at` dates
   - **Important:** Count across ALL modes (not mode-specific)
4. Calculate workout percentage:
   - If scheduledCount = 0: percentage = 0 (or handle edge case)
   - Otherwise: `(loggedCount / scheduledCount) × 100`
5. Calculate gap points:
   - Call `calculateGapPoints(loggedDates, weekStartDate)`
6. Calculate final score:
   - **If scheduledCount = 0:**
     - If loggedCount = 0: score = 0
     - Otherwise: score = gapPoints × 5
   - **Otherwise:**
     - score = (workoutPercentage × 0.8) + gapPoints
   - Clamp score between 0 and 100
7. Return result with all details

**Function:** `getHistoricalConsistencyScores(limit: number = 10): Promise<{ data: HistoricalScore[] | null, error: any }>`

**Type Definition:**
```typescript
type HistoricalScore = {
  weekStartDate: string;
  weekEndDate: string;
  score: number;
  scheduledCount: number;
  loggedCount: number;
};
```

**Logic:**
1. Get most recent complete week
2. Calculate all weeks going backwards (limit number of weeks)
3. For each week, call `getConsistencyScore(weekStartDate)`
4. Return array of historical scores (most recent first)
5. Calculate week-over-week changes:
   - For each week (except first), calculate: `((currentScore - previousScore) / previousScore) × 100`
   - Store as `percentageChange: number | null` (null for first week)

**Function:** `getAverageConsistencyScore(): Promise<{ data: number | null, error: any }>`

**Logic:**
1. Get all historical scores (or use a reasonable limit like 52 weeks = 1 year)
2. Sum all scores
3. Divide by number of weeks
4. Return average (0-100)

---

### Step 2: Create Consistency Score Hook

**File:** `hooks/useConsistencyScore.ts`

**Purpose:** React hook for fetching and managing consistency score data.

#### 2.1 Hook Structure

**Type Definitions:**
```typescript
type UseConsistencyScoreResult = {
  currentWeek: ConsistencyScore | null;
  historicalWeeks: (HistoricalScore & { percentageChange: number | null })[];
  averageScore: number | null;
  isLoading: boolean;
  error: any;
  refetch: () => Promise<void>;
};
```

**Hook Function:**
```typescript
export function useConsistencyScore(): UseConsistencyScoreResult
```

**Logic:**
1. State management:
   - `currentWeek: ConsistencyScore | null`
   - `historicalWeeks: HistoricalScore[]`
   - `averageScore: number | null`
   - `isLoading: boolean`
   - `error: any`

2. Fetch current week:
   - Call `getMostRecentCompleteWeek()` to get week start date
   - Call `getConsistencyScore(weekStartDate)`
   - Store in `currentWeek` state

3. Fetch historical weeks:
   - Call `getHistoricalConsistencyScores(10)` (or configurable limit)
   - Calculate percentage changes for each week
   - Store in `historicalWeeks` state

4. Fetch average score:
   - Call `getAverageConsistencyScore()`
   - Store in `averageScore` state

5. `refetch()` function:
   - Re-run all data fetching
   - Useful for manual refresh

6. Error handling:
   - Catch and store errors
   - Return error state

7. Loading states:
   - Set `isLoading = true` at start
   - Set `isLoading = false` when complete

---

### Step 3: Create Semicircle Visualization Component

**File:** `components/ConsistencyScoreVisualization.tsx` (or inline in screen)

**Purpose:** Visual representation of the consistency score with 100 bars in a semicircle.

#### 3.1 Component Structure

**Props:**
```typescript
type ConsistencyScoreVisualizationProps = {
  score: number; // 0-100
  size?: number; // Optional size override
};
```

**Visual Design:**
- Semicircle shape (180 degrees)
- 100 bars evenly distributed around the semicircle
- Each bar represents 1 point
- Bars are colored up to the score value
- Score number displayed in the center

#### 3.2 Implementation Approach

**Option 1: SVG-based (Recommended)**
- Use `react-native-svg` (already in project for Skill Map)
- Draw semicircle path
- Draw 100 bars as rectangles or lines
- Position bars evenly around semicircle
- Color bars based on score

**Option 2: Canvas-based**
- Use `react-native-canvas` or similar
- More complex but more flexible

**Option 3: Simple Bar Component**
- Create 100 individual bar components
- Arrange in semicircle using flexbox/absolute positioning
- Simpler but may have performance issues

**Recommended: SVG-based (similar to Skill Map radar chart)**

#### 3.3 Bar Calculation

**For each bar (index 0-99):**
1. Calculate angle: `angle = (index / 100) × 180°` (0° to 180°)
2. Calculate position on semicircle:
   - `x = centerX + radius × cos(angle)`
   - `y = centerY + radius × sin(angle)`
3. Bar length: Fixed length (e.g., 20px)
4. Bar color:
   - If `index < score`: Colored (e.g., green/blue gradient)
   - If `index >= score`: Gray/uncolored
5. Bar rotation: Rotate bar to be perpendicular to radius

#### 3.4 Center Score Display

- Large number in center of semicircle
- Font size: Large (e.g., 48-64px)
- Color: White or theme color
- Format: Integer (0-100)

---

### Step 4: Build Main Screen UI

**File:** `app/(tabs)/meals/consistency-score.tsx`

**Purpose:** Main screen displaying consistency score and historical data.

#### 4.1 Screen Structure

**Layout:**
1. **Header** (existing)
   - Back button
   - Title: "Consistency Score"

2. **Main Score Display** (top section)
   - Semicircle visualization component
   - Score number in center
   - Optional: Small text below showing "Week of [date range]"

3. **Current Week Details** (middle section)
   - Breakdown card showing:
     - Scheduled workouts: X
     - Logged workouts: Y
     - Workout percentage: Z%
     - Longest gap: N days
     - Gap points: M/20
   - Optional: Visual breakdown (progress bars, etc.)

4. **Historical Weeks List** (bottom section)
   - Scrollable list
   - Each item shows:
     - Week date range (e.g., "Jan 1 - Jan 7")
     - Score (large number)
     - Percentage change (green if positive, red if negative)
     - Optional: Small breakdown (scheduled/logged counts)

5. **Average Consistency Score** (footer or header area)
   - Display: "Average: XX"

#### 4.2 Component Implementation

**Use the hook:**
```typescript
const {
  currentWeek,
  historicalWeeks,
  averageScore,
  isLoading,
  error,
  refetch,
} = useConsistencyScore();
```

**Loading State:**
- Show loading spinner or skeleton
- Disable interactions

**Error State:**
- Show error message
- Provide retry button

**Empty State:**
- If no data (new user), show message: "Start logging workouts to see your consistency score!"

**Data Display:**
- Format dates nicely (e.g., "Jan 1 - Jan 7, 2025")
- Format percentages (e.g., "75.5%" or "75%")
- Color code percentage changes (green for positive, red for negative)

---

### Step 5: Implement Week Calculation Utilities

**File:** `lib/utils/week-calculations.ts` (or add to existing utils)

**Purpose:** Helper functions for week-related calculations.

#### 5.1 Functions

**Function:** `getWeekStartDate(date: Date): string`
- Convert any date to its week's Sunday date
- Return as YYYY-MM-DD string

**Function:** `getWeekDateRange(weekStartDate: string): { start: string, end: string }`
- Calculate Sunday to Saturday range
- Return both dates as YYYY-MM-DD strings

**Function:** `getMostRecentCompleteWeek(): string`
- Find the most recent week that has fully passed
- Return Sunday date of that week

**Function:** `getPreviousWeekStart(currentWeekStart: string): string`
- Calculate previous week's Sunday date
- Return as YYYY-MM-DD string

**Function:** `formatWeekRange(weekStartDate: string): string`
- Format as "Jan 1 - Jan 7, 2025"
- Handle year boundaries correctly

**Function:** `isDateInWeek(date: string, weekStartDate: string): boolean`
- Check if a date falls within a given week
- Return boolean

---

### Step 6: Handle Edge Cases and Special Logic

#### 6.1 Rest Day Detection

**Logic:**
- When counting scheduled workouts, exclude rest days
- Use same logic as `getScheduleWithStatus()`:
  - Label is null or empty → not scheduled
  - Label matches rest patterns → rest day (exclude from count)
  - Rest patterns: "rest", "rest day", "day off", "off day", etc. (case-insensitive, fuzzy)

#### 6.2 Mode-Agnostic Counting

**Critical:** Consistency Score counts workouts across **ALL sport modes**, not per mode.

**Scheduled Workouts:**
- Query `weekly_schedules` without mode filter
- Count all scheduled workouts across all modes

**Logged Workouts:**
- Query `workouts` without mode filter
- Count distinct dates (one workout per day, regardless of mode)

**Rationale:** Consistency is about overall training frequency, not sport-specific consistency.

#### 6.3 Gap Calculation Edge Cases

**No logged workouts:**
- Longest gap = 7 days (entire week)
- Gap points = 0

**All days logged:**
- Longest gap = 0 days
- Gap points = 20

**Partial week (current week):**
- Only count gaps up to today
- Don't penalize future days

**Note:** For consistency, always calculate gaps for complete weeks only (most recent complete week).

#### 6.4 Score Clamping

- Ensure score is always between 0 and 100
- Round to nearest integer for display
- Handle NaN/Infinity cases

---

### Step 7: Testing and Validation

#### 7.1 Test Cases

**Test Case 1: Perfect Week**
- Scheduled: 7 workouts
- Logged: 7 workouts
- Gaps: 0 days
- Expected: Score = (100% × 0.8) + 20 = 100

**Test Case 2: Partial Completion**
- Scheduled: 10 workouts
- Logged: 5 workouts
- Gaps: 1 day (longest)
- Expected: Score = (50% × 0.8) + 20 = 40 + 20 = 60

**Test Case 3: No Scheduled, Some Logged**
- Scheduled: 0 workouts
- Logged: 2 workouts
- Gaps: 3 days (longest)
- Expected: Score = 10 × 5 = 50

**Test Case 4: No Scheduled, No Logged**
- Scheduled: 0 workouts
- Logged: 0 workouts
- Expected: Score = 0

**Test Case 5: No Scheduled, Perfect Logging**
- Scheduled: 0 workouts
- Logged: 7 workouts (consecutive)
- Gaps: 0 days
- Expected: Score = 20 × 5 = 100

**Test Case 6: Large Gap**
- Scheduled: 5 workouts
- Logged: 2 workouts
- Gaps: 5 days (longest)
- Expected: Score = (40% × 0.8) + 0 = 32

#### 7.2 Data Validation

- Verify scheduled count matches database
- Verify logged count matches database
- Verify gap calculation is correct
- Verify score formula is correct
- Verify week date ranges are correct

#### 7.3 UI Testing

- Test with various score values (0, 50, 100, etc.)
- Test with no historical data
- Test with many historical weeks
- Test loading states
- Test error states
- Test on different screen sizes

---

## File Structure

### New Files to Create:
1. `lib/api/consistency-score.ts` - API functions
2. `hooks/useConsistencyScore.ts` - React hook
3. `components/ConsistencyScoreVisualization.tsx` - Semicircle component (optional, can be inline)
4. `lib/utils/week-calculations.ts` - Week utility functions (optional, can add to existing utils)

### Files to Modify:
1. `app/(tabs)/meals/consistency-score.tsx` - Complete implementation

---

## Key Technical Considerations

### 1. Week Start Day
- **Always Sunday** (day 0)
- Use `getCurrentWeekStart()` from `lib/api/schedule.ts` for consistency
- Ensure all week calculations use Sunday as start

### 2. Date Handling
- Use local dates (YYYY-MM-DD format) to avoid timezone issues
- Match the format used in `workouts.performed_at` and `weekly_schedules.week_start_date`
- Be consistent with existing date utilities

### 3. Mode-Agnostic Counting
- **Critical:** Count workouts across ALL modes, not per mode
- This is different from schedule status checks (which are mode-specific)
- Consistency Score measures overall training consistency

### 4. Rest Day Detection
- Reuse the same logic as `getScheduleWithStatus()`
- Be consistent with how rest days are identified
- Case-insensitive, fuzzy matching

### 5. Gap Calculation
- Only calculate for complete weeks (most recent complete week)
- Don't penalize future days in current week
- Count consecutive days without workouts
- Find the longest gap

### 6. Performance
- Consider caching historical scores (if needed)
- Batch queries where possible
- Limit historical weeks fetched (e.g., 10-20 weeks)

### 7. UI/UX
- Keep UI simple for now (backend focus)
- Semicircle visualization can be basic (will polish later)
- Ensure data is accurate and calculations are correct
- Show clear breakdown of score components

---

## Implementation Order

### Recommended Sequence:

1. **Step 1: API Functions** (Foundation)
   - Create `lib/api/consistency-score.ts`
   - Implement helper functions
   - Implement main API functions
   - Test with console logs

2. **Step 5: Week Utilities** (Supporting)
   - Create or update week calculation utilities
   - Ensure consistency with existing code

3. **Step 2: Hook** (Data Layer)
   - Create `hooks/useConsistencyScore.ts`
   - Integrate with API functions
   - Test data fetching

4. **Step 6: Edge Cases** (Robustness)
   - Handle all edge cases
   - Test special scenarios
   - Validate calculations

5. **Step 3: Visualization** (UI Component)
   - Create semicircle component
   - Test with various scores
   - Keep it simple for now

6. **Step 4: Main Screen** (Integration)
   - Build complete screen UI
   - Integrate hook and visualization
   - Add historical list
   - Add average score display

7. **Step 7: Testing** (Validation)
   - Test all scenarios
   - Verify calculations
   - Test UI states
   - Fix any bugs

---

## Success Criteria

### Functional Requirements:
- ✅ Score calculation is accurate for all scenarios
- ✅ Current week score displays correctly
- ✅ Historical weeks show with percentage changes
- ✅ Average score calculates correctly
- ✅ Edge cases handled properly
- ✅ Data fetches correctly from database

### Technical Requirements:
- ✅ Code is well-structured and maintainable
- ✅ Error handling is robust
- ✅ Loading states work correctly
- ✅ Performance is acceptable
- ✅ Follows existing code patterns

### UI Requirements (Basic):
- ✅ Semicircle visualization displays score
- ✅ Score number is visible
- ✅ Historical list is scrollable
- ✅ Percentage changes are color-coded
- ✅ Average score is displayed
- ✅ UI is functional (polish comes later)

---

## Notes

- **Focus on Backend First:** As requested, prioritize getting the calculation logic correct before polishing the UI
- **Reuse Existing Code:** Leverage existing date utilities, database queries, and patterns
- **Test Thoroughly:** The calculation logic is complex with many edge cases - test extensively
- **Document Edge Cases:** The score formula has special cases (0 scheduled, etc.) - ensure they're all handled
- **Mode-Agnostic:** Remember that consistency is measured across all modes, not per mode

---

## Future Enhancements (Post-MVP)

- Polish semicircle visualization (animations, gradients, etc.)
- Add tooltips/explanations for score components
- Add weekly goal integration
- Add streak tracking
- Add insights/recommendations
- Add export/share functionality
- Add detailed breakdown modal
- Add comparison to previous periods

---

**End of Plan**
