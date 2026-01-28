# Training Statistics Implementation Plan

**Status:** Detailed Step-by-Step Plan  
**Date:** Current Session  
**Purpose:** Comprehensive roadmap for implementing the Training Statistics feature

---

## Overview

The Training Statistics screen is a premium feature that provides users with insights about their training data:
1. **Personal Records** - All-time best values for any searched exercise
2. **Most Logged Exercises** - Top exercises by count for a selected time interval

Think of this as a "mini Spotify Wrapped" for training data - showing users their achievements and most frequent exercises.

---

## Key Concepts

### Personal Records

**Purpose:** Show a user's all-time personal best values for any exercise they search.

**How it works:**
- User searches for an exercise name (e.g., "Bench Press", "3 Point Shot", "Route 67")
- System detects the exercise type (exercise, shooting, drill, etc.) and mode(s) where it was logged
- System fetches ALL workouts (all-time, no time limit) for that exercise
- System calculates highest single set values based on exercise type:
  - **Exercise type**: Highest reps × weight
  - **Shooting (basketball)**: Highest percentage, highest attempted, highest made
  - **Shooting (soccer/hockey)**: Highest distance, highest reps
  - **Drill (basketball/soccer/hockey/tennis)**: Highest reps, highest time
  - **Drill (football)**: Highest reps, highest completion %
  - **Sprints (football)**: Highest distance, highest speed (distance/avg_time), highest reps
  - **Hitting (baseball)**: Highest reps, highest avg_distance
  - **Fielding (baseball)**: Highest (reps × distance)
  - **Rally (tennis)**: Highest points, highest time

**Key Differences from Progress Graphs:**
- Progress Graphs: Show progression over time intervals (bucketed data)
- Personal Records: Show single best value across ALL time (all-time record)

### Most Logged Exercises

**Purpose:** Show the user's most frequently logged exercises over a selected time interval.

**How it works:**
- User selects a time interval (30 Days, 90 Days, 180 Days, 360 Days)
- System queries all workouts within that time interval
- System counts exercises by name (across all modes or per mode - TBD)
- System displays top exercises sorted by count (most logged first)

**Time Intervals:**
- 30 Days: Last 30 days
- 90 Days: Last 90 days
- 180 Days: Last 180 days
- 360 Days: Last 360 days

---

## Current State Analysis

### What Exists:
- ✅ **Screen Placeholder** (`app/(tabs)/meals/training-statistics.tsx`)
  - Basic header with back button
  - Placeholder content

- ✅ **Exercise Type Detection** (`lib/api/exercise-types-direct.ts`)
  - `getPrimaryExerciseTypeDirect()` - Detects exercise type for a given exercise name and mode
  - Returns: 'exercise', 'shooting', 'drill', 'sprints', 'hitting', 'fielding', 'rally'

- ✅ **Metric Options Logic** (`lib/api/exercise-types.ts`)
  - `getMetricOptionsForExerciseType()` - Returns available metrics for an exercise type
  - Used by Progress Graphs to determine what metrics to show

- ✅ **Progress View Calculations** (`lib/api/progress-view-calculations.ts`)
  - Contains logic for calculating various view values
  - Can be adapted for finding highest single set values

- ✅ **Database Schema**
  - `workouts` table with `performed_at`, `mode`, `user_id`
  - `workout_exercises` table with `name`, `exercise_type`, `workout_id`
  - `workout_sets` table with `reps`, `weight`, `distance`, `time`, `points`, `attempted`, `made`, `completed`, etc.

### What Needs to Be Built:
- ❌ **Personal Records API** - Functions to fetch and calculate personal records
- ❌ **Personal Records Hook** - React hook for data fetching
- ❌ **Most Logged Exercises API** - Functions to fetch most logged exercises by time interval
- ❌ **Most Logged Exercises Hook** - React hook for data fetching
- ❌ **UI Components** - Search input, record display cards, exercise list
- ❌ **Mode Detection** - Determine which mode(s) an exercise was logged in

---

## Implementation Plan

### Step 1: Create Personal Records API Functions

**File:** `lib/api/personal-records.ts`

**Purpose:** Core API functions for fetching and calculating personal records.

#### 1.1 Type Definitions

```typescript
export type PersonalRecord = {
  exerciseName: string;
  mode: SportMode;
  exerciseType: ExerciseType;
  records: {
    // Exercise type records
    repsXWeight?: number | null; // Highest reps × weight
    reps?: number | null; // Highest reps
    weight?: number | null; // Highest weight
    
    // Shooting (basketball) records
    shootingPercentage?: number | null; // Highest percentage
    attempted?: number | null; // Highest attempted
    made?: number | null; // Highest made
    
    // Shooting (soccer/hockey) records
    distance?: number | null; // Highest distance
    shotsReps?: number | null; // Highest reps (for shots view)
    
    // Drill records
    drillReps?: number | null; // Highest reps
    time?: number | null; // Highest time (minutes)
    completionPercentage?: number | null; // Highest completion % (football drill)
    
    // Sprints (football) records
    sprintDistance?: number | null; // Highest distance
    speed?: number | null; // Highest speed (distance / avg_time)
    sprintReps?: number | null; // Highest reps
    
    // Hitting (baseball) records
    hittingReps?: number | null; // Highest reps
    avgDistance?: number | null; // Highest avg_distance
    
    // Fielding (baseball) records
    fieldingRepsXDistance?: number | null; // Highest (reps × distance)
    
    // Rally (tennis) records
    points?: number | null; // Highest points
    rallyTime?: number | null; // Highest time (minutes)
  };
  dateAchieved?: string; // Date when record was achieved (YYYY-MM-DD)
};
```

#### 1.2 Helper Functions

**Function:** `getExerciseModes(exerciseName: string): Promise<{ data: SportMode[], error: any }>`
- Input: Exercise name
- Output: Array of modes where this exercise was logged
- Logic:
  1. Query `workout_exercises` for exercises matching the name (fuzzy match)
  2. Join with `workouts` to get modes
  3. Return distinct modes

**Function:** `getPersonalRecordForMode(exerciseName: string, mode: SportMode): Promise<{ data: PersonalRecord | null, error: any }>`
- Input: Exercise name and mode
- Output: Personal record for that exercise in that mode
- Logic:
  1. Detect exercise type using `getPrimaryExerciseTypeDirect()`
  2. Fetch ALL workouts (all-time) for this exercise in this mode
  3. Fetch all sets for those exercises
  4. Calculate highest values based on exercise type:
     - **Exercise type**: Find highest `reps × weight`, highest `reps`, highest `weight`
     - **Shooting (basketball)**: Find highest `(made / attempted) × 100`, highest `attempted`, highest `made`
     - **Shooting (soccer/hockey)**: Find highest `distance`, highest `reps`
     - **Drill (basketball/soccer/hockey/tennis)**: Find highest `reps`, highest `time`
     - **Drill (football)**: Find highest `reps`, highest `(completed / reps) × 100`
     - **Sprints (football)**: Find highest `distance`, highest `distance / avg_time_sec`, highest `reps`
     - **Hitting (baseball)**: Find highest `reps`, highest `distance` (avg_distance)
     - **Fielding (baseball)**: Find highest `reps × distance`
     - **Rally (tennis)**: Find highest `points`, highest `time`
  5. Return record with date achieved (from workout `performed_at`)

#### 1.3 Main API Function

**Function:** `getPersonalRecords(exerciseName: string): Promise<{ data: PersonalRecord[], error: any }>`
- Input: Exercise name
- Output: Array of personal records (one per mode if exercise was logged in multiple modes)
- Logic:
  1. Get all modes where exercise was logged
  2. For each mode, call `getPersonalRecordForMode()`
  3. Return array of records

---

### Step 2: Create Most Logged Exercises API Functions

**File:** `lib/api/most-logged-exercises.ts`

**Purpose:** Core API functions for fetching most logged exercises by time interval.

#### 2.1 Type Definitions

```typescript
export type MostLoggedExercise = {
  exerciseName: string;
  count: number; // Number of times logged
  modes: SportMode[]; // Modes where exercise was logged
  lastLogged?: string; // Date last logged (YYYY-MM-DD)
};

export type TimeInterval = 30 | 90 | 180 | 360; // Days
```

#### 2.2 Main API Function

**Function:** `getMostLoggedExercises(timeInterval: TimeInterval, limit: number = 10): Promise<{ data: MostLoggedExercise[], error: any }>`
- Input: Time interval (days) and limit (default: 10)
- Output: Array of most logged exercises sorted by count (descending)
- Logic:
  1. Calculate start date: `today - timeInterval days`
  2. Query `workouts` table:
     - Filter by `user_id`
     - Filter by `performed_at >= startDate`
     - Filter by `performed_at <= today`
  3. Join with `workout_exercises` to get exercise names
  4. Count exercises by name (fuzzy match similar names)
  5. Group by exercise name and count occurrences
  6. For each exercise, get:
     - Count of times logged
     - Modes where it was logged (distinct)
     - Last logged date (max `performed_at`)
  7. Sort by count (descending)
  8. Return top `limit` exercises

**Note:** Should we count across all modes or per mode? Based on documentation, it seems like it should be across all modes (user's most logged exercises overall, not per mode).

---

### Step 3: Create Personal Records Hook

**File:** `hooks/usePersonalRecords.ts`

**Purpose:** React hook for fetching and managing personal records data.

#### 3.1 Hook Structure

**Type Definitions:**
```typescript
export interface UsePersonalRecordsResult {
  records: PersonalRecord[];
  isLoading: boolean;
  error: any;
  searchExercise: (exerciseName: string) => Promise<void>;
  clearSearch: () => void;
}
```

**Hook Function:**
```typescript
export function usePersonalRecords(): UsePersonalRecordsResult
```

**Logic:**
1. State management:
   - `records: PersonalRecord[]`
   - `isLoading: boolean`
   - `error: any`
   - `currentSearch: string | null`

2. `searchExercise(exerciseName: string)` function:
   - Set `isLoading = true`
   - Clear previous error
   - Call `getPersonalRecords(exerciseName)`
   - Store results in `records` state
   - Handle errors

3. `clearSearch()` function:
   - Clear `records` array
   - Clear `currentSearch`

4. Error handling:
   - Catch and store errors
   - Return error state

---

### Step 4: Create Most Logged Exercises Hook

**File:** `hooks/useMostLoggedExercises.ts`

**Purpose:** React hook for fetching and managing most logged exercises data.

#### 4.1 Hook Structure

**Type Definitions:**
```typescript
export interface UseMostLoggedExercisesResult {
  exercises: MostLoggedExercise[];
  isLoading: boolean;
  error: any;
  timeInterval: TimeInterval;
  setTimeInterval: (interval: TimeInterval) => void;
  refetch: () => Promise<void>;
}
```

**Hook Function:**
```typescript
export function useMostLoggedExercises(
  initialTimeInterval: TimeInterval = 30
): UseMostLoggedExercisesResult
```

**Logic:**
1. State management:
   - `exercises: MostLoggedExercise[]`
   - `isLoading: boolean`
   - `error: any`
   - `timeInterval: TimeInterval`

2. Fetch data on mount and when `timeInterval` changes:
   - Call `getMostLoggedExercises(timeInterval)`
   - Store results in `exercises` state
   - Handle errors

3. `setTimeInterval(interval: TimeInterval)` function:
   - Update `timeInterval` state
   - Trigger refetch

4. `refetch()` function:
   - Re-run data fetching

5. Error handling:
   - Catch and store errors
   - Return error state

---

### Step 5: Build Main Screen UI

**File:** `app/(tabs)/meals/training-statistics.tsx`

**Purpose:** Main screen displaying personal records and most logged exercises.

#### 5.1 Screen Structure

**Layout:**
1. **Header** (existing)
   - Back button
   - Title: "Training Statistics"

2. **Personal Records Section** (top section)
   - Search input for exercise name
   - Results display:
     - Exercise name
     - Mode(s) where logged
     - Record cards showing:
       - Record type (e.g., "Highest Reps × Weight")
       - Record value
       - Date achieved
     - Empty state: "Search for an exercise to see your personal records"

3. **Most Logged Exercises Section** (bottom section)
   - Time interval selector (30, 90, 180, 360 days)
   - List of exercises:
     - Exercise name
     - Count (e.g., "Logged 45 times")
     - Mode(s) where logged
     - Last logged date
   - Empty state: "No exercises logged in this time period"

#### 5.2 Component Implementation

**Use the hooks:**
```typescript
const {
  records,
  isLoading: recordsLoading,
  error: recordsError,
  searchExercise,
  clearSearch,
} = usePersonalRecords();

const {
  exercises,
  isLoading: exercisesLoading,
  error: exercisesError,
  timeInterval,
  setTimeInterval,
  refetch,
} = useMostLoggedExercises();
```

**Loading States:**
- Show loading spinner for each section independently
- Disable interactions while loading

**Error States:**
- Show error message for each section
- Provide retry button

**Data Display:**
- Format numbers nicely (e.g., "1,250" for 1250)
- Format dates nicely (e.g., "Jan 15, 2025")
- Show appropriate units (lbs, ft, %, etc.)
- Handle null/undefined values gracefully

---

### Step 6: Handle Edge Cases and Special Logic

#### 6.1 Exercise Name Matching

**Fuzzy Matching:**
- Use same fuzzy matching logic as Progress Graphs and Skill Map
- Handle case-insensitive matching
- Handle single character typos (but not for numbers)
- Normalize whitespace differences

**Multiple Modes:**
- If exercise was logged in multiple modes, show separate records for each mode
- Display mode badge/indicator for each record

#### 6.2 Record Calculation Edge Cases

**No Data:**
- If exercise has no logged data, show "No records found"
- Don't show null/undefined values

**Multiple Sets with Same Value:**
- If multiple sets have the same highest value, use the most recent date

**Null/Zero Values:**
- Don't count null values as records
- Handle 0 values appropriately (e.g., 0 weight might be valid for bodyweight exercises)

**Mode-Specific Logic:**
- Ensure correct calculation based on mode (e.g., basketball shooting vs soccer/hockey shooting)
- Use correct field names for each mode

#### 6.3 Most Logged Exercises Edge Cases

**No Exercises:**
- If no exercises logged in time interval, show empty state

**Tie Breaking:**
- If multiple exercises have same count, sort by last logged date (most recent first)
- Or sort alphabetically by exercise name

**Fuzzy Matching:**
- Group similar exercise names together (e.g., "Bench Press" and "bench press" should count as same)
- Use same fuzzy matching logic as other features

---

### Step 7: Testing and Validation

#### 7.1 Test Cases

**Personal Records Test Cases:**

**Test Case 1: Exercise Type (Lifting)**
- Exercise: "Bench Press"
- Expected: Show highest reps × weight, highest reps, highest weight
- Verify: Values are correct from database

**Test Case 2: Shooting Type (Basketball)**
- Exercise: "3 Point Shot"
- Expected: Show highest percentage, highest attempted, highest made
- Verify: Percentage calculation is correct (made/attempted × 100)

**Test Case 3: Drill Type (Football)**
- Exercise: "Route 67"
- Expected: Show highest reps, highest completion %
- Verify: Completion % calculation is correct (completed/reps × 100)

**Test Case 4: Multiple Modes**
- Exercise: "Push Ups" (logged in both lifting and basketball)
- Expected: Show separate records for each mode
- Verify: Records are mode-specific

**Test Case 5: No Data**
- Exercise: "Non-existent Exercise"
- Expected: Show "No records found"
- Verify: No errors, graceful handling

**Most Logged Exercises Test Cases:**

**Test Case 1: 30 Days**
- Time Interval: 30 Days
- Expected: Show top exercises logged in last 30 days
- Verify: Count is correct, dates are within range

**Test Case 2: 360 Days**
- Time Interval: 360 Days
- Expected: Show top exercises logged in last 360 days
- Verify: Count includes all exercises from past year

**Test Case 3: Empty Period**
- Time Interval: 30 Days (but no workouts in last 30 days)
- Expected: Show empty state
- Verify: No errors, graceful handling

**Test Case 4: Exercise Name Variations**
- Exercises: "Bench Press", "bench press", "BenchPress"
- Expected: All counted as same exercise
- Verify: Fuzzy matching works correctly

#### 7.2 Data Validation

- Verify personal record values match database queries
- Verify most logged exercise counts match database queries
- Verify date calculations are correct
- Verify mode detection is accurate
- Verify exercise type detection is accurate

#### 7.3 UI Testing

- Test with various exercise names
- Test with exercises logged in multiple modes
- Test with no data scenarios
- Test with different time intervals
- Test loading states
- Test error states
- Test on different screen sizes

---

## File Structure

### New Files to Create:
1. `lib/api/personal-records.ts` - Personal records API functions
2. `lib/api/most-logged-exercises.ts` - Most logged exercises API functions
3. `hooks/usePersonalRecords.ts` - Personal records React hook
4. `hooks/useMostLoggedExercises.ts` - Most logged exercises React hook

### Files to Modify:
1. `app/(tabs)/meals/training-statistics.tsx` - Complete implementation

---

## Key Technical Considerations

### 1. Exercise Type Detection
- Reuse `getPrimaryExerciseTypeDirect()` from existing code
- Handle mode-specific differences (basketball shooting vs soccer/hockey shooting)
- Handle football drill (completion %) vs other drill types

### 2. Fuzzy Matching
- Use same fuzzy matching logic as Progress Graphs and Skill Map
- Ensure consistent exercise name grouping across features
- Handle case-insensitive matching
- Handle single character typos (but not for numbers)

### 3. Mode Detection
- Determine which mode(s) an exercise was logged in
- Show separate records for each mode if exercise was logged in multiple modes
- Display mode badges/indicators

### 4. Date Handling
- Use local dates (YYYY-MM-DD format) to avoid timezone issues
- Match the format used in `workouts.performed_at`
- Be consistent with existing date utilities

### 5. Performance
- Consider caching personal records (if needed)
- Limit queries appropriately (e.g., limit most logged exercises to top 10-20)
- Use efficient database queries with proper indexes

### 6. UI/UX
- Keep UI simple for now (backend focus)
- Ensure data is accurate and calculations are correct
- Show clear labels and units for each record type
- Handle empty states gracefully

---

## Implementation Order

### Recommended Sequence:

1. **Step 1: Personal Records API** (Foundation)
   - Create `lib/api/personal-records.ts`
   - Implement helper functions
   - Implement main API functions
   - Test with console logs

2. **Step 2: Most Logged Exercises API** (Foundation)
   - Create `lib/api/most-logged-exercises.ts`
   - Implement main API function
   - Test with console logs

3. **Step 3: Personal Records Hook** (Data Layer)
   - Create `hooks/usePersonalRecords.ts`
   - Integrate with API functions
   - Test data fetching

4. **Step 4: Most Logged Exercises Hook** (Data Layer)
   - Create `hooks/useMostLoggedExercises.ts`
   - Integrate with API functions
   - Test data fetching

5. **Step 6: Edge Cases** (Robustness)
   - Handle all edge cases
   - Test special scenarios
   - Validate calculations

6. **Step 5: Main Screen** (Integration)
   - Build complete screen UI
   - Integrate both hooks
   - Add search functionality
   - Add time interval selector
   - Add record display cards
   - Add exercise list

7. **Step 7: Testing** (Validation)
   - Test all scenarios
   - Verify calculations
   - Test UI states
   - Fix any bugs

---

## Success Criteria

### Functional Requirements:
- ✅ Personal records display correctly for all exercise types
- ✅ Most logged exercises display correctly for all time intervals
- ✅ Exercise search works with fuzzy matching
- ✅ Mode detection works correctly
- ✅ Exercise type detection works correctly
- ✅ Edge cases handled properly
- ✅ Data fetches correctly from database

### Technical Requirements:
- ✅ Code is well-structured and maintainable
- ✅ Error handling is robust
- ✅ Loading states work correctly
- ✅ Performance is acceptable
- ✅ Follows existing code patterns

### UI Requirements (Basic):
- ✅ Search input is functional
- ✅ Record cards display correctly
- ✅ Exercise list is scrollable
- ✅ Time interval selector works
- ✅ Empty states are displayed
- ✅ UI is functional (polish comes later)

---

## Notes

- **Focus on Backend First:** As requested, prioritize getting the calculation logic correct before polishing the UI
- **Reuse Existing Code:** Leverage existing exercise type detection, fuzzy matching, and database query patterns
- **Test Thoroughly:** The calculation logic has many edge cases - test extensively
- **Mode-Aware:** Remember that exercise types can vary by mode (e.g., basketball shooting vs soccer/hockey shooting)
- **All-Time Records:** Personal records are all-time, not time-limited (unlike Progress Graphs)

---

## Future Enhancements (Post-MVP)

- Add record history (show when records were broken)
- Add comparison to previous records
- Add "recently broken records" section
- Add exercise statistics (total logged, average values, etc.)
- Add export/share functionality
- Add filters (by mode, by exercise type, etc.)
- Add visualizations (charts, graphs)
- Add achievements/badges for milestones

---

**End of Plan**
