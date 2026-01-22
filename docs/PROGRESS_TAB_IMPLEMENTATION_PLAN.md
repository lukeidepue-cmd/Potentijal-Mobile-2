# Progress Tab Implementation Plan

**Status:** Surface-Level Planning  
**Date:** Current Session  
**Purpose:** High-level roadmap for implementing the complete Progress Tab system

---

## Overview

The Progress Tab is the most important feature in the app, consisting of 4 main screens:
1. **Progress Graphs** (Free) - Exercise progression visualization with mode-specific views
2. **Skill Map** (Premium) - Visual comparison of exercises using same view logic
3. **Consistency Score** (Premium) - Weekly consistency tracking based on scheduled vs logged workouts
4. **Training Statistics** (Premium) - Personal records and most logged exercises

---

## Current State Analysis

### What Exists:
- ✅ **Main Progress Tab Screen** (`app/(tabs)/meals/index.tsx`)
  - 4-card carousel with navigation
  - Premium gating for cards 2-4
  - Hero text and AI Trainer button
  - Gradient background with diagonal lines

- ✅ **Screen Placeholders**
  - `progress-graphs.tsx` - Basic header, placeholder content
  - `skill-map.tsx` - Basic header, placeholder content
  - `consistency-score.tsx` - Basic header, placeholder content
  - `training-statistics.tsx` - Basic header, placeholder content

- ✅ **Current Progress Graph Logic** (`hooks/useExerciseProgressGraphDirect.ts`)
  - Mode-dependent exercise search
  - Fuzzy matching for exercise names
  - Bucket-based time intervals (7, 30, 90, 180, 360 days)
  - Metric calculation (reps, weight, reps_x_weight, etc.)
  - **OLD SYSTEM**: Uses 7/4/6/6/6 buckets, different from new requirements

- ✅ **Exercise Type Detection** (`lib/api/exercise-types-direct.ts`)
  - Determines primary exercise type for a given exercise name
  - Returns: 'exercise', 'shooting', 'drill', 'sprints', 'hitting', 'fielding', 'rally'
  - Mode-aware (basketball shooting vs soccer/hockey shooting)

- ✅ **Metric Options Logic** (`lib/api/exercise-types.ts`)
  - Maps exercise types to available metrics
  - Mode-aware for shooting types (basketball vs soccer/hockey)

### What Needs to Change:
- ❌ **Progress Graphs**: Complete rewrite with new view system
- ❌ **Skill Map**: Build from scratch
- ❌ **Consistency Score**: Build from scratch
- ❌ **Training Statistics**: Build from scratch

---

## Implementation Plan

### Phase 1: Progress Graphs Screen

#### 1.1 Core Architecture Changes

**Time Intervals:**
- **OLD**: 7, 30, 90, 180, 360 days with varying bucket counts
- **NEW**: 30, 90, 180, 360 days with fixed 6 buckets each
  - 30 Days: 6 points (every 5 days)
  - 90 Days: 6 points (every 15 days)
  - 180 Days: 6 points (every 30 days)
  - 360 Days: 6 points (every 60 days)

**View System:**
- **OLD**: Exercise search → Determine exercise type → Show available metrics
- **NEW**: Mode selection → View selection → Exercise search (restricted by view)
- Views are mode-specific and exercise-type-restricted

**Graph Display:**
- **OLD**: Variable y-axis ticks based on average
- **NEW**: Fixed 6 y-axis points, dynamically scaled based on min/max data values
- Y-axis should accurately reflect data spacing (not preset equal spacing)

#### 1.2 View Logic Implementation

**Create View Configuration System:**
- New file: `lib/api/progress-views.ts`
- Define view configurations for each mode:
  - View name, exercise type restriction, calculation method
  - Mode-specific view availability

**View Calculations (per time interval bucket):**

**Lifting Mode:**
- Performance View: Highest single set (reps × weight) in bucket
- Tonnage View: Average (reps × weight × sets) per exercise square in bucket

**Basketball Mode:**
- Performance View: Highest single set (reps × weight) in bucket
- Tonnage View: Average (reps × weight × sets) per exercise square in bucket
- Shooting % View: Average percentage per set in bucket
- Jumpshot View: Average attempted shots per shooting square in bucket
- Drill View: Total reps logged in bucket

**Football Mode:**
- Performance View: Highest single set (reps × weight) in bucket
- Tonnage View: Average (reps × weight × sets) per exercise square in bucket
- Completion View: Average completion % per set (completed/reps) in bucket
- Speed View: Highest single set (distance / avg_time_sec) in bucket
- Sprints View: Total reps logged in bucket

**Baseball Mode:**
- Performance View: Highest single set (reps × weight) in bucket
- Tonnage View: Average (reps × weight × sets) per exercise square in bucket
- Hits View: Total reps logged in bucket
- Distance View: Average "avg_distance" per set in bucket
- Fielding View: Average (reps × distance) / sets in bucket

**Soccer Mode:**
- Performance View: Highest single set (reps × weight) in bucket
- Tonnage View: Average (reps × weight × sets) per exercise square in bucket
- Drill View: Total reps logged in bucket
- Shots View: Total reps logged in bucket
- Shot Distance View: Average distance per set in bucket

**Hockey Mode:**
- Performance View: Highest single set (reps × weight) in bucket
- Tonnage View: Average (reps × weight × sets) per exercise square in bucket
- Drill View: Total reps logged in bucket
- Shots View: Total reps logged in bucket
- Shot Distance View: Average distance per set in bucket

**Tennis Mode:**
- Performance View: Highest single set (reps × weight) in bucket
- Tonnage View: Average (reps × weight × sets) per exercise square in bucket
- Drill View: Total reps logged in bucket
- Rally View: Average points per set in bucket

#### 1.3 Data Fetching Hook

**New Hook:** `hooks/useProgressGraphView.ts`
- Replaces/extends `useExerciseProgressGraphDirect`
- Parameters:
  - `mode`: Sport mode
  - `view`: Selected view name
  - `exercise`: Exercise name (optional, for filtering)
  - `timeInterval`: 30 | 90 | 180 | 360
- Returns:
  - 6 data points (one per bucket)
  - Min/max values for accurate y-axis scaling
  - Loading/error states

**Calculation Logic:**
- Fetch workouts for mode within time range
- Filter exercises by view's exercise type restriction
- Filter by exercise name if provided
- Group into 6 buckets based on time interval
- Calculate view-specific metric for each bucket
- Return 6 data points with accurate values

#### 1.4 UI Components

**Screen Structure:**
- Header with back button
- Mode selector (dropdown/picker)
- View selector (dropdown/picker, filtered by mode)
- Exercise search input (filtered by view's exercise type)
- Time interval selector (30/90/180/360 days)
- Graph display area
  - 6-point line graph
  - 6 y-axis ticks (dynamically scaled)
  - 6 x-axis labels (time intervals)
  - Accurate data representation

**Graph Rendering:**
- Use existing SVG/Reanimated approach or Victory Native
- Ensure y-axis accurately reflects data spacing
- Min value = lowest data point
- Max value = highest data point
- 6 evenly spaced y-axis ticks between min/max

---

### Phase 2: Skill Map Screen

#### 2.1 Core Architecture

**Similar to Progress Graphs but:**
- View selection comes FIRST (restricts exercise pool)
- Exercise selection comes SECOND (up to 6 exercises)
- Data is from entire time interval (not bucketed)
- Comparison is relative (highest = 100%, others = percentage of highest)

#### 2.2 Data Fetching

**New Hook:** `hooks/useSkillMapData.ts`
- Parameters:
  - `mode`: Sport mode
  - `view`: Selected view
  - `exercises`: Array of up to 6 exercise names
  - `timeInterval`: 30 | 90 | 180 | 360 days
- Returns:
  - For each exercise: calculated metric value for the time interval
  - Highest value (for 100% calculation)
  - Percentage values for each exercise

**Calculation:**
- Fetch all workouts in mode within time interval
- Filter exercises by view's exercise type restriction
- Filter by selected exercise names
- Calculate view-specific metric for entire time interval (not per bucket)
- Find highest value
- Calculate percentages: (exercise_value / highest_value) × 100

#### 2.3 UI Components

**Screen Structure:**
- Header with back button
- Mode selector
- View selector (filtered by mode)
- Time interval selector
- Exercise search/selector (filtered by view, max 6)
- Skill map visualization
  - Visual representation of exercises (bars, circles, etc.)
  - Each exercise shows percentage relative to highest
  - Highest exercise = 100%
  - Others = calculated percentage

---

### Phase 3: Consistency Score Screen

#### 3.1 Core Architecture

**Weekly Calculation:**
- Score updates at beginning of each week
- Displays most recent complete week
- Historical weeks shown below

**Score Formula:**
- 80%: (Logged workouts / Scheduled workouts) × 100
- 20%: Gap penalty based on longest gap without workout
  - 0 gaps or 1 day gaps: 20 points
  - 2 day gap: 15 points
  - 3 day gap: 10 points
  - 4 day gap: 5 points
  - 5+ day gap: 0 points
- Final Score: (Workout % × 0.8) + Gap Points

**Edge Cases:**
- 0 scheduled, 0 logged: Score = 0
- 0 scheduled, some logged: Score = Gap Points × 5 (scaled to 100)
- 0 scheduled, 7 consecutive days logged: Score = 100

#### 3.2 Data Fetching

**New Hook:** `hooks/useConsistencyScore.ts`
- Parameters:
  - `weekStartDate`: Date for the week to calculate
- Returns:
  - Current week score
  - Historical weeks with scores
  - Average consistency score
  - Week-over-week changes (% increase/decrease)

**Data Sources:**
- `weekly_schedules` table: Get scheduled workouts for the week
- `workouts` table: Get logged workouts for the week
- Calculate gaps between logged workouts
- Calculate longest gap

**New API Functions:**
- `lib/api/consistency-score.ts`
  - `getConsistencyScore(weekStartDate)`
  - `getHistoricalConsistencyScores(limit)`
  - `getAverageConsistencyScore()`

#### 3.3 UI Components

**Screen Structure:**
- Header with back button
- Main score display (top)
  - Semicircle with 100 bars
  - Score number in center
  - Bars colored based on score
- Current week details
  - Scheduled vs logged breakdown
  - Gap information
- Historical weeks list
  - Week date range
  - Score
  - % change from previous week (green/red)
- Average consistency score display

**Visualization:**
- Semicircle bar pattern (100 bars)
- Each bar represents 1 point
- Bars colored up to score value
- Score number displayed in center

---

### Phase 4: Training Statistics Screen

#### 4.1 Core Architecture

**Two Main Sections:**
1. **Personal Records**: Search any exercise → Show all-time best values
2. **Most Logged Exercises**: Show top exercises by count for time interval

#### 4.2 Personal Records

**Data Fetching:**
- Use similar logic to Progress Graphs for exercise type detection
- Fetch ALL workouts (all-time, not time-limited)
- Find highest single set values based on exercise type:
  - Exercise type: Highest reps × weight
  - Shooting (basketball): Highest percentage, highest attempted, highest made
  - Shooting (soccer/hockey): Highest distance, highest reps
  - Drill: Highest reps, highest time, highest completion %
  - Sprints: Highest distance, highest speed (distance/time), highest reps
  - Hitting: Highest reps, highest avg_distance
  - Fielding: Highest (reps × distance)
  - Rally: Highest points, highest time

**New Hook:** `hooks/usePersonalRecords.ts`
- Parameters:
  - `exercise`: Exercise name
  - `mode`: Sport mode (optional, for filtering)
- Returns:
  - All relevant personal records for that exercise
  - Record type (e.g., "Highest Reps × Weight", "Highest Shooting %")

#### 4.3 Most Logged Exercises

**Data Fetching:**
- Count exercise occurrences in workouts for time interval
- Group by exercise name
- Sort by count (descending)
- Return top N exercises (e.g., top 10)

**New Hook:** `hooks/useMostLoggedExercises.ts`
- Parameters:
  - `timeInterval`: 30 | 90 | 180 | 360 days
  - `mode`: Sport mode (optional)
  - `limit`: Number of exercises to return (default: 10)
- Returns:
  - Array of exercises with counts
  - Sorted by count (descending)

#### 4.4 UI Components

**Screen Structure:**
- Header with back button
- Personal Records Section
  - Exercise search input
  - Mode selector (optional)
  - Results display:
    - List of personal records
    - Each record shows: Type, Value, Date achieved
- Most Logged Exercises Section
  - Time interval selector
  - Mode selector (optional)
  - Results display:
    - List of exercises with counts
    - Visual indicator (bar chart, numbers, etc.)

---

## Code Organization

### New Files to Create:

**Hooks:**
- `hooks/useProgressGraphView.ts` - Progress graph data with view system
- `hooks/useSkillMapData.ts` - Skill map data and calculations
- `hooks/useConsistencyScore.ts` - Consistency score calculations
- `hooks/usePersonalRecords.ts` - Personal records lookup
- `hooks/useMostLoggedExercises.ts` - Most logged exercises

**API Functions:**
- `lib/api/progress-views.ts` - View configuration and logic
- `lib/api/consistency-score.ts` - Consistency score API functions
- `lib/api/training-statistics.ts` - Personal records and most logged exercises

**Screen Files (Update Existing):**
- `app/(tabs)/meals/progress-graphs.tsx` - Complete rewrite
- `app/(tabs)/meals/skill-map.tsx` - Complete implementation
- `app/(tabs)/meals/consistency-score.tsx` - Complete implementation
- `app/(tabs)/meals/training-statistics.tsx` - Complete implementation

### Files to Modify:

**Existing Hooks (May Need Updates):**
- `hooks/useExerciseProgressGraphDirect.ts` - May be replaced or refactored
- `lib/api/exercise-types-direct.ts` - May need enhancements for view filtering

**Shared Utilities:**
- Create shared calculation functions for view metrics
- Create shared time interval bucket logic
- Create shared graph rendering utilities

---

## Key Technical Considerations

### 1. View System Logic
- Views are mode-specific
- Views restrict which exercises can be selected
- Same view name = same calculation logic (even across modes)
- Some exercise types have same name but different inputs (e.g., "drill" in basketball vs football)

### 2. Time Interval Bucketing
- All intervals use 6 buckets
- Bucket sizes: 5, 15, 30, 60 days respectively
- Buckets are calculated from today backwards
- Each bucket represents a time period, not a single day

### 3. Graph Y-Axis Scaling
- Must accurately reflect data spacing
- Min = lowest data point value
- Max = highest data point value
- 6 evenly spaced ticks between min/max
- No preset spacing - must be dynamic based on actual data

### 4. Exercise Type Detection
- Already exists in `getPrimaryExerciseTypeDirect`
- Need to enhance for filtering exercises by type
- Need to handle mode-specific variations (basketball shooting vs soccer/hockey shooting)

### 5. Consistency Score Edge Cases
- 0 scheduled workouts: Score based entirely on gaps (scaled × 5)
- 0 logged workouts: Score = 0
- Perfect week: 100% scheduled logged + 0 gaps = 100 score

### 6. Data Aggregation
- Need efficient queries for large datasets
- Consider caching for frequently accessed data
- Batch queries where possible
- Use Supabase RPC functions for complex calculations (if needed)

---

## Implementation Order

### Recommended Sequence:

1. **Progress Graphs** (Foundation)
   - Build view system
   - Implement new time intervals
   - Create calculation logic
   - Build UI
   - Test thoroughly

2. **Skill Map** (Reuses Progress Graph Logic)
   - Reuse view system
   - Implement comparison logic
   - Build UI
   - Test

3. **Training Statistics** (Simpler, Independent)
   - Personal records
   - Most logged exercises
   - Build UI
   - Test

4. **Consistency Score** (Most Complex Logic)
   - Weekly calculation
   - Gap detection
   - Historical tracking
   - Build UI with visualization
   - Test

---

## Dependencies & Prerequisites

### Database:
- ✅ `workouts` table - Already exists
- ✅ `workout_exercises` table - Already exists
- ✅ `workout_sets` table - Already exists
- ✅ `weekly_schedules` table - Already exists (for consistency score)

### Existing Utilities:
- ✅ Exercise type detection
- ✅ Mode mapping functions
- ✅ Fuzzy exercise matching
- ✅ Graph rendering (SVG/Reanimated)

### New Requirements:
- ⚠️ View configuration system
- ⚠️ Enhanced exercise filtering by type
- ⚠️ Weekly schedule vs workout comparison logic
- ⚠️ Gap detection algorithm

---

## Testing Strategy

### Progress Graphs:
- Test each view for each mode
- Test time intervals (30/90/180/360)
- Test exercise filtering
- Test y-axis scaling accuracy
- Test edge cases (no data, single data point, etc.)

### Skill Map:
- Test view restrictions
- Test exercise selection (max 6)
- Test percentage calculations
- Test with different time intervals

### Consistency Score:
- Test score calculation formula
- Test edge cases (0 scheduled, 0 logged, etc.)
- Test gap detection
- Test historical week tracking
- Test average calculation

### Training Statistics:
- Test personal records for each exercise type
- Test most logged exercises for different time intervals
- Test exercise search functionality

---

## Notes & Considerations

1. **Performance**: Progress graphs may need to query large datasets. Consider:
   - Efficient database queries
   - Caching strategies
   - Pagination if needed

2. **Data Accuracy**: Ensure calculations match documentation exactly:
   - View calculations must match specified formulas
   - Time intervals must be exact (5, 15, 30, 60 days)
   - Y-axis scaling must be accurate

3. **Mode-Specific Logic**: Pay attention to:
   - Same exercise type names with different inputs (drill, shooting)
   - Mode-specific view availability
   - Mode-specific calculation variations

4. **UI/UX**: Keep simple initially for testing:
   - Focus on functionality first
   - Polish UI after confirming logic works
   - Use existing design patterns from app

5. **Code Reusability**: 
   - Share view logic between Progress Graphs and Skill Map
   - Share calculation functions where possible
   - Create utilities for common operations

---

## Next Steps

1. Review this plan with user
2. Start with Progress Graphs (Phase 1)
3. Build incrementally, test each component
4. Move to next phase after confirming previous phase works
5. Iterate on UI/UX after functionality is confirmed

---

## Progress Graph Screen - Step-by-Step Implementation Plan

**Focus:** Build barebones skeleton UI first, then implement functionality, then polish UI/UX later.

---

### Step 1: Create View Configuration System

**File:** `lib/api/progress-views.ts`

**Tasks:**
1. Define TypeScript types:
   - `ProgressView` interface (name, exerciseTypeRestriction, calculationType, mode)
   - `ViewCalculationType` enum (performance, tonnage, shooting_percentage, jumpshot, drill, completion, speed, sprints, hits, distance, fielding, shots, shot_distance, rally)

2. Create view configuration map:
   - Map each mode to its available views
   - Each view includes:
     - View name (string)
     - Exercise type restriction ('exercise', 'shooting', 'drill', 'sprints', 'hitting', 'fielding', 'rally')
     - Calculation type
     - Mode context (for mode-specific variations)

3. Export functions:
   - `getAvailableViewsForMode(mode: SportMode): ProgressView[]`
   - `getViewConfig(mode: SportMode, viewName: string): ProgressView | null`
   - `canViewDisplayExercise(mode: SportMode, viewName: string, exerciseType: ExerciseType): boolean`

**Views to Configure:**
- Lifting: Performance, Tonnage
- Basketball: Performance, Tonnage, Shooting %, Jumpshot, Drill
- Football: Performance, Tonnage, Completion, Speed, Sprints
- Baseball: Performance, Tonnage, Hits, Distance, Fielding
- Soccer: Performance, Tonnage, Drill, Shots, Shot Distance
- Hockey: Performance, Tonnage, Drill, Shots, Shot Distance
- Tennis: Performance, Tonnage, Drill, Rally

---

### Step 2: Create Time Interval Bucket Utility

**File:** `lib/utils/time-intervals.ts` (or add to existing utils)

**Tasks:**
1. Define time interval configuration:
   - 30 Days: 6 buckets, 5 days per bucket
   - 90 Days: 6 buckets, 15 days per bucket
   - 180 Days: 6 buckets, 30 days per bucket
   - 360 Days: 6 buckets, 60 days per bucket

2. Create bucket calculation function:
   - `calculateTimeBuckets(timeInterval: 30 | 90 | 180 | 360): Array<{bucketIndex: number, startDate: Date, endDate: Date}>`
   - Buckets calculated from today backwards
   - Each bucket represents a time period (not a single day)

3. Create date-to-bucket mapping:
   - `getBucketIndexForDate(date: Date, timeInterval: 30 | 90 | 180 | 360): number`
   - Returns which bucket (0-5) a date falls into

---

### Step 3: Create View Calculation Functions

**File:** `lib/api/progress-view-calculations.ts`

**Tasks:**
1. Create calculation functions for each view type:
   - `calculatePerformanceView(exercises, sets, bucket): number` - Highest single set (reps × weight)
   - `calculateTonnageView(exercises, sets, bucket): number` - Average (reps × weight × sets) per exercise square
   - `calculateShootingPercentageView(exercises, sets, bucket): number` - Average % per set
   - `calculateJumpshotView(exercises, sets, bucket): number` - Average attempted per shooting square
   - `calculateDrillView(exercises, sets, bucket): number` - Total reps
   - `calculateCompletionView(exercises, sets, bucket): number` - Average completion % per set
   - `calculateSpeedView(exercises, sets, bucket): number` - Highest (distance / avg_time_sec)
   - `calculateSprintsView(exercises, sets, bucket): number` - Total reps
   - `calculateHitsView(exercises, sets, bucket): number` - Total reps
   - `calculateDistanceView(exercises, sets, bucket): number` - Average avg_distance per set
   - `calculateFieldingView(exercises, sets, bucket): number` - Average (reps × distance) / sets
   - `calculateShotsView(exercises, sets, bucket): number` - Total reps
   - `calculateShotDistanceView(exercises, sets, bucket): number` - Average distance per set
   - `calculateRallyView(exercises, sets, bucket): number` - Average points per set

2. Handle mode-specific variations:
   - Basketball shooting vs Soccer/Hockey shooting (different inputs)
   - Football drill vs Basketball/Soccer/Hockey drill (different inputs)

3. Export main calculation function:
   - `calculateViewValue(mode: SportMode, viewName: string, exercises: any[], sets: any[], bucket: BucketInfo): number | null`

---

### Step 4: Create Progress Graph Data Hook

**File:** `hooks/useProgressGraphView.ts`

**Tasks:**
1. Create hook interface:
   - Parameters: `mode`, `view`, `exercise` (optional), `timeInterval`
   - Returns: `{ data: DataPoint[], minValue: number, maxValue: number, loading: boolean, error: any }`

2. Data fetching logic:
   - Fetch workouts for mode within time range
   - Get exercises filtered by view's exercise type restriction
   - Filter by exercise name if provided (fuzzy matching)
   - Get sets for matching exercises

3. Bucket calculation:
   - Group data into 6 buckets based on time interval
   - For each bucket, calculate view-specific metric
   - Return 6 data points (one per bucket)

4. Min/Max calculation:
   - Find lowest and highest values across all 6 data points
   - Return for y-axis scaling

5. Handle edge cases:
   - No data: Return empty array
   - Missing data in some buckets: Return null for those buckets
   - Single data point: Handle gracefully

---

### Step 5: Create Exercise Filtering Utility

**File:** `lib/api/exercise-filtering.ts` (or enhance existing)

**Tasks:**
1. Create function to get available exercises for a view:
   - `getAvailableExercisesForView(mode: SportMode, viewName: string): Promise<{data: string[], error: any}>`
   - Fetches all exercises logged in the view's exercise type restriction
   - Returns unique exercise names (fuzzy matching for variations)

2. Enhance exercise type detection:
   - May need to update `getPrimaryExerciseTypeDirect` or create new function
   - Handle mode-specific exercise type variations

---

### Step 6: Build Barebones UI Skeleton

**File:** `app/(tabs)/meals/progress-graphs.tsx`

**Tasks:**
1. **Screen Layout:**
   - Header with back button (already exists)
   - Container with ScrollView for content

2. **Control Section (Simple, Barebones):**
   - Mode selector: Simple dropdown/picker (use existing mode chooser pattern)
   - View selector: Simple dropdown/picker (filtered by selected mode)
   - Exercise search: Simple TextInput (filtered by selected view)
   - Time interval selector: Simple buttons or picker (30/90/180/360 days)

3. **Graph Display Area:**
   - Placeholder container for graph
   - Simple text showing "Graph will appear here"
   - Dimensions: ~300px width, ~200px height (placeholder)

4. **State Management:**
   - `selectedMode` state (default: current mode from context)
   - `selectedView` state (default: first available view for mode)
   - `exerciseQuery` state (default: empty string)
   - `timeInterval` state (default: 90 days)

5. **Basic Styling:**
   - Use existing theme colors
   - Simple, functional layout
   - No fancy animations yet

---

### Step 7: Connect View System to UI

**Tasks:**
1. Load available views when mode changes:
   - Use `getAvailableViewsForMode(selectedMode)`
   - Update view selector options
   - Reset to first view if current view not available in new mode

2. Filter exercise search by view:
   - When view changes, fetch available exercises for that view
   - Show filtered exercise list or autocomplete
   - Only allow searching exercises that match view's exercise type

3. Connect to data hook:
   - Call `useProgressGraphView` with current selections
   - Show loading state
   - Show error state if needed

---

### Step 8: Implement Graph Rendering (Barebones)

**Tasks:**
1. **Graph Container:**
   - Fixed dimensions container
   - Background color from theme
   - Border for visibility

2. **Y-Axis:**
   - Calculate 6 evenly spaced ticks between min and max values
   - Display tick labels on left side
   - Format numbers appropriately (round, add units if needed)

3. **X-Axis:**
   - 6 evenly spaced points
   - Display bucket labels (date ranges or "Bucket 1-6" for now)

4. **Data Points:**
   - Plot 6 points on graph
   - Connect with simple line
   - Use SVG or simple View-based rendering

5. **Basic Styling:**
   - Simple line color (white or theme color)
   - Simple point markers (circles)
   - Basic grid lines (optional, for clarity)

**Note:** Use existing graph rendering approach from home screens (SVG/Reanimated) as reference, but simplified for now.

---

### Step 9: Implement View Calculations

**Tasks:**
1. **For Each View Type:**
   - Implement calculation function
   - Test with sample data
   - Handle edge cases (null values, missing data)

2. **Bucket Processing:**
   - For each of 6 buckets:
     - Filter exercises/sets that fall within bucket date range
     - Apply view-specific calculation
     - Return value or null if no data

3. **Data Validation:**
   - Ensure calculations match documentation exactly
   - Handle division by zero
   - Handle missing fields gracefully

---

### Step 10: Implement Accurate Y-Axis Scaling

**Tasks:**
1. **Calculate Min/Max:**
   - Find lowest non-null value across all 6 data points
   - Find highest non-null value across all 6 data points
   - Handle case where all values are null

2. **Generate 6 Y-Axis Ticks:**
   - Evenly space 6 ticks between min and max
   - Formula: `tick[i] = min + (max - min) * (i / 5)` for i = 0 to 5
   - Ensure ticks accurately reflect data spacing

3. **Y-Axis Positioning:**
   - Map data values to y-coordinates based on min/max
   - Formula: `y = top + height - (height * (value - min) / (max - min))`
   - Ensure points appear at correct relative heights

4. **Edge Cases:**
   - All values same: Show single horizontal line
   - Only one data point: Show appropriately
   - Min = Max: Handle gracefully

---

### Step 11: Test Each View for Each Mode

**Tasks:**
1. **Test Lifting Mode:**
   - Performance View with sample exercise
   - Tonnage View with sample exercise
   - Verify calculations match documentation

2. **Test Basketball Mode:**
   - All 5 views
   - Test with exercises logged in different exercise types
   - Verify view restrictions work (can't view shooting view for exercise-type exercise)

3. **Test Other Modes:**
   - Football (5 views)
   - Baseball (5 views)
   - Soccer (5 views)
   - Hockey (5 views)
   - Tennis (4 views)

4. **Test Time Intervals:**
   - 30 Days (6 buckets, 5 days each)
   - 90 Days (6 buckets, 15 days each)
   - 180 Days (6 buckets, 30 days each)
   - 360 Days (6 buckets, 60 days each)

5. **Test Edge Cases:**
   - No data
   - Single data point
   - Missing data in some buckets
   - Very different values (one very high, others low)

---

### Step 12: Polish & Refine (After Functionality Confirmed)

**Tasks:**
1. Improve UI/UX:
   - Better selectors/dropdowns
   - Autocomplete for exercise search
   - Loading states
   - Error messages
   - Empty states

2. Enhance Graph Display:
   - Better styling
   - Animations
   - Tooltips on data points
   - Better date formatting

3. Performance Optimization:
   - Cache view configurations
   - Optimize queries
   - Debounce exercise search

---

## Implementation Notes

### Key Clarifications from Documentation:

1. **"Per Exercise Square" in Tonnage View:**
   - Means: For each workout where the exercise was logged, calculate (reps × weight × sets) for that exercise square
   - Then average those values across all exercise squares in the bucket
   - Example: If "bench press" logged twice in 5-day period:
     - Workout 1: 3 sets, 10 reps, 100lb = 3000
     - Workout 2: 4 sets, 8 reps, 120lb = 3840
     - Average = (3000 + 3840) / 2 = 3420

2. **"Average per Shooting Square" in Jumpshot View:**
   - Means: Total attempted shots across all sets, divided by number of shooting squares (not sets)
   - Each shooting square = one exercise entry in a workout
   - Example: If "3 point shot" logged in 2 workouts:
     - Workout 1: 3 sets with 10, 12, 15 attempted = 37 total attempted
     - Workout 2: 2 sets with 8, 10 attempted = 18 total attempted
     - Average = (37 + 18) / 2 shooting squares = 27.5

3. **"Total reps" vs "Average":**
   - Total reps: Sum all reps across all sets in bucket
   - Average: Calculate per-set or per-square, then average those values

4. **Mode-Specific Variations:**
   - Basketball shooting: attempted, made, percentage
   - Soccer/Hockey shooting: reps, distance
   - Basketball drill: reps, time
   - Football drill: reps, completed

---

## Honest Assessment

### Does the View Plan Make Sense?

**YES, absolutely.** The view system is well-designed:

1. **Logical Flow:** Mode → View → Exercise is intuitive and prevents confusion
2. **Clear Restrictions:** Exercise type restrictions make sense and prevent invalid combinations
3. **Consistent Calculations:** Same view name = same calculation logic (even across modes)
4. **Well-Documented:** Each view's calculation is clearly explained

### Can I Code This?

**YES, I can definitely code this.** Here's why:

1. **Clear Requirements:** Every view's calculation is explicitly defined
2. **Existing Infrastructure:** 
   - Database structure is in place
   - Exercise type detection exists
   - Graph rendering patterns exist in home screens
   - Mode management exists

3. **Straightforward Logic:**
   - Time bucketing is simple math
   - View calculations are clear formulas
   - Data filtering is standard database queries

4. **Manageable Complexity:**
   - Most views share similar patterns (Performance, Tonnage are common)
   - Mode-specific variations are clearly marked
   - Edge cases are well-defined

### Potential Challenges (But Solvable):

1. **Performance View Calculation:**
   - Need to find highest single set across all sets in bucket
   - Must handle null/missing values
   - **Solution:** Iterate through all sets, calculate reps × weight, find max

2. **Tonnage View Calculation:**
   - Need to group by exercise square (workout + exercise combination)
   - Calculate per-square, then average
   - **Solution:** Group sets by workout_exercise_id, calculate per group, then average

3. **Mode-Specific Exercise Type Handling:**
   - Same exercise type name, different inputs (drill, shooting)
   - **Solution:** Pass mode context to calculation functions, use mode-aware logic

4. **Y-Axis Scaling Accuracy:**
   - Must accurately reflect data spacing
   - **Solution:** Use min/max from actual data, linear interpolation for positioning

5. **Exercise Filtering:**
   - Need to filter exercises by view's exercise type restriction
   - **Solution:** Use existing exercise type detection, filter results

**All of these are solvable with careful implementation and testing.**

---

**End of Progress Graph Screen Plan**
