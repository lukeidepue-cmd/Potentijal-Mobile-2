# Skill Map Implementation Plan

**Status:** Detailed Step-by-Step Plan  
**Date:** Current Session  
**Purpose:** Comprehensive roadmap for implementing the Skill Map feature

---

## Overview

The Skill Map is a premium feature that allows users to visually compare up to 6 exercises using the same view logic as Progress Graphs. Key differences:

- **View selection comes FIRST** (restricts exercise pool)
- **Exercise selection comes SECOND** (up to 6 exercises)
- **Data is from entire time interval** (not bucketed like progress graphs)
- **Comparison is relative** (highest = 100%, others = percentage of highest)

---

## Key Concepts

### Flow Comparison

**Progress Graphs:**
1. User selects mode
2. User searches for exercise
3. System determines exercise type → shows available views
4. User selects view
5. Graph shows 6 time-bucketed data points

**Skill Map:**
1. User selects mode
2. User selects view (restricts exercise pool)
3. User selects up to 6 exercises (from filtered pool)
4. System calculates metric for entire time interval per exercise
5. Map shows relative comparison (highest = 100%, others = percentage)

### Calculation Logic

**For each exercise:**
1. Fetch all workouts in mode within time interval
2. Filter by exercise name (fuzzy matching)
3. Filter by view's exercise type restriction
4. Calculate view-specific metric for **entire time interval** (not per bucket)
5. Find highest value across all selected exercises
6. Calculate percentages: `(exercise_value / highest_value) × 100`

### Example Calculations

**Tonnage View Example:**
- Exercise A: 10000 → 100% (highest)
- Exercise B: 7000 → 70% (7000/10000)
- Exercise C: 8000 → 80% (8000/10000)
- Exercise D: 2000 → 20% (2000/10000)
- Exercise E: 1500 → 15% (1500/10000)
- Exercise F: 4500 → 45% (4500/10000)

**Shot Distance View Example:**
- Exercise A: 21ft → 100% (highest)
- Exercise B: 10ft → 47.6% (10/21)
- Exercise C: 13ft → 61.9% (13/21)
- Exercise D: 17.5ft → 83.3% (17.5/21)
- Exercise E: 20ft → 95.2% (20/21)
- Exercise F: 18ft → 85.7% (18/21)

---

## Current State Analysis

### What Exists:
- ✅ **View System** (`lib/api/progress-views.ts`)
  - View configurations for all modes
  - Exercise type restrictions
  - Calculation type definitions

- ✅ **Exercise Filtering** (`lib/api/exercise-filtering.ts`)
  - `getAvailableExercisesForView()` function
  - Filters exercises by view's exercise type restriction

- ✅ **View Calculations** (`lib/api/progress-view-calculations.ts`)
  - All view calculation functions exist
  - Can be reused for skill map (but need to adapt for entire interval vs buckets)

- ✅ **Screen Placeholder** (`app/(tabs)/meals/skill-map.tsx`)
  - Basic header with back button
  - Placeholder content

### What Needs to Be Built:
- ❌ **Skill Map Data Hook** - New hook for fetching and calculating skill map data
- ❌ **Exercise Selection UI** - Multi-select interface for up to 6 exercises
- ❌ **Skill Map Visualization** - Visual representation of exercise comparisons
- ❌ **Percentage Calculation Logic** - Relative comparison calculations

---

## Implementation Plan

### Step 1: Create Skill Map Data Hook

**File:** `hooks/useSkillMapData.ts`

**Purpose:** Fetch and calculate skill map data for selected exercises

**Interface:**
```typescript
interface UseSkillMapDataParams {
  mode: SportMode | string;
  view: string;
  exercises: string[]; // Up to 6 exercise names
  timeInterval: 30 | 90 | 180 | 360;
}

interface SkillMapExerciseData {
  exerciseName: string;
  rawValue: number; // The calculated metric value
  percentage: number; // Percentage relative to highest (0-100)
  isHighest: boolean; // True if this is the highest value
}

interface UseSkillMapDataResult {
  data: SkillMapExerciseData[] | null;
  highestValue: number | null;
  loading: boolean;
  error: any;
}
```

**Tasks:**
1. Create hook structure with state management
2. Fetch workouts for mode within time interval
3. For each exercise:
   - Filter exercises by name (fuzzy matching)
   - Filter by view's exercise type restriction
   - Calculate view-specific metric for entire time interval
4. Find highest value across all exercises
5. Calculate percentages for each exercise
6. Return formatted data with loading/error states

**Key Implementation Details:**
- Reuse view calculation functions from `progress-view-calculations.ts`
- Adapt calculations to work on entire time interval (not bucketed)
- Handle edge cases: no data, single exercise, all same values
- Use existing exercise type detection and filtering logic

---

### Step 2: Adapt View Calculations for Entire Time Interval

**File:** `lib/api/progress-view-calculations.ts` (modify existing)

**Purpose:** Create versions of calculation functions that work on entire time interval instead of buckets

**Tasks:**
1. Create new calculation functions for entire interval:
   - `calculatePerformanceViewForInterval()` - Highest single set across entire interval
   - `calculateTonnageViewForInterval()` - Average (reps × weight × sets) per exercise square across entire interval
   - `calculateShootingPercentageViewForInterval()` - Average % per set across entire interval
   - `calculateJumpshotViewForInterval()` - Average attempted per shooting square across entire interval
   - `calculateDrillViewForInterval()` - Total reps across entire interval
   - `calculateCompletionViewForInterval()` - Average completion % per set across entire interval
   - `calculateSpeedViewForInterval()` - Highest (distance / avg_time_sec) across entire interval
   - `calculateSprintsViewForInterval()` - Total reps across entire interval
   - `calculateHitsViewForInterval()` - Total reps across entire interval
   - `calculateDistanceViewForInterval()` - Average avg_distance per set across entire interval
   - `calculateFieldingViewForInterval()` - Average (reps × distance) / sets across entire interval
   - `calculateShotsViewForInterval()` - Total reps across entire interval
   - `calculateShotDistanceViewForInterval()` - Average distance per set across entire interval
   - `calculateRallyViewForInterval()` - Average points per set across entire interval

2. Export main function:
   - `calculateViewValueForInterval(mode, viewName, exercises, sets, startDate, endDate): number | null`

**Key Differences from Bucketed Calculations:**
- No bucket grouping - process all data in time range together
- Same calculation logic, just applied to entire dataset
- Return single value instead of array of bucket values

---

### Step 3: Build Barebones UI Skeleton

**File:** `app/(tabs)/meals/skill-map.tsx` (modify existing)

**Purpose:** Create basic UI structure for skill map screen

**Tasks:**
1. **Screen Layout:**
   - Header with back button (already exists)
   - Container with ScrollView for content

2. **Control Section (Simple, Barebones):**
   - Mode selector: Simple dropdown/picker (reuse from progress graphs)
   - View selector: Simple dropdown/picker (filtered by selected mode)
   - Time interval selector: Simple buttons or picker (30/90/180/360 days)
   - Exercise search/selector: Simple TextInput with add button (max 6 exercises)

3. **Selected Exercises List:**
   - Display selected exercises (up to 6)
   - Show remove button for each
   - Simple list or chips

4. **Skill Map Display Area:**
   - Placeholder container for visualization
   - Simple text showing "Skill map will appear here"
   - Dimensions: ~300px width, ~400px height (placeholder)

5. **State Management:**
   - `selectedMode` state (default: current mode from context)
   - `selectedView` state (default: first available view for mode)
   - `selectedExercises` state (default: empty array, max 6)
   - `timeInterval` state (default: 90 days)
   - `exerciseSearchQuery` state (for searching available exercises)

6. **Basic Styling:**
   - Use existing theme colors
   - Simple, functional layout
   - No fancy animations yet

---

### Step 4: Implement Exercise Selection Logic

**Tasks:**
1. **Load Available Exercises:**
   - When view changes, fetch available exercises using `getAvailableExercisesForView()`
   - Store in state: `availableExercises`

2. **Exercise Search:**
   - Filter `availableExercises` by search query
   - Show filtered list or autocomplete
   - Only show exercises that match view's exercise type restriction

3. **Add Exercise:**
   - When user selects exercise from list, add to `selectedExercises`
   - Enforce max 6 exercises
   - Prevent duplicates
   - Clear search query after adding

4. **Remove Exercise:**
   - Allow removing exercises from `selectedExercises`
   - Update UI immediately

5. **Validation:**
   - Show message if trying to add more than 6
   - Show message if trying to add duplicate
   - Disable add button if at max capacity

---

### Step 5: Connect Data Hook to UI

**Tasks:**
1. **Call Hook:**
   - Use `useSkillMapData` hook with current selections
   - Pass: `mode`, `view`, `exercises` (array), `timeInterval`

2. **Handle Loading State:**
   - Show loading indicator while fetching
   - Disable controls during loading

3. **Handle Error State:**
   - Show error message if data fetch fails
   - Allow retry

4. **Handle Empty State:**
   - Show message if no exercises selected
   - Show message if no data found for selected exercises

---

### Step 6: Implement Percentage Calculation Logic

**File:** `hooks/useSkillMapData.ts` (within hook)

**Tasks:**
1. **Calculate Raw Values:**
   - For each exercise, calculate view-specific metric
   - Store in array: `[{exerciseName, rawValue}, ...]`

2. **Find Highest Value:**
   - Iterate through raw values
   - Find maximum value
   - Store as `highestValue`

3. **Calculate Percentages:**
   - For each exercise: `percentage = (rawValue / highestValue) × 100`
   - Round to 1-2 decimal places
   - Mark exercise with highest value as `isHighest: true`

4. **Handle Edge Cases:**
   - If `highestValue === 0`: All percentages = 0 (or handle as special case)
   - If all values same: All percentages = 100%
   - If single exercise: Percentage = 100%

5. **Return Formatted Data:**
   - Array of `SkillMapExerciseData` objects
   - Sorted by percentage (descending) or by selection order

---

### Step 7: Build Basic Skill Map Visualization

**Purpose:** Create visual representation of exercise comparisons

**Tasks:**
1. **Visualization Options (Choose One Initially):**
   - **Option A: Horizontal Bar Chart**
     - Each exercise = horizontal bar
     - Bar length = percentage (0-100%)
     - Highest exercise = full width (100%)
     - Others = proportional width
     - Show percentage label on each bar
     - Show exercise name on left

   - **Option B: Vertical Bar Chart**
     - Each exercise = vertical bar
     - Bar height = percentage (0-100%)
     - Highest exercise = full height (100%)
     - Others = proportional height
     - Show percentage label above each bar
     - Show exercise name below each bar

   - **Option C: Circular/Radial Chart**
     - Each exercise = segment or point on circle
     - Distance from center = percentage
     - Highest exercise = outer edge (100%)
     - Others = proportional distance
     - More complex but visually interesting

2. **Initial Recommendation: Horizontal Bar Chart**
   - Simplest to implement
   - Easy to read and compare
   - Clear percentage visualization
   - Can enhance later with animations/colors

3. **Bar Chart Implementation:**
   - Container with fixed width
   - For each exercise:
     - Container row with exercise name and bar
     - Bar with width = `(percentage / 100) × containerWidth`
     - Percentage label on bar or next to it
     - Different color for highest exercise (e.g., gold/yellow)
     - Other exercises use theme colors

4. **Styling:**
   - Use theme colors
   - Add subtle borders/shadows
   - Ensure text is readable
   - Responsive to container size

---

### Step 8: Enhance Exercise Selection UI

**Tasks:**
1. **Improve Search Experience:**
   - Autocomplete dropdown
   - Highlight matching text
   - Show exercise count (e.g., "3 of 6 selected")

2. **Selected Exercises Display:**
   - Chip/badge style for each selected exercise
   - Remove button (X) on each chip
   - Show in grid or list
   - Visual feedback when removing

3. **Add Exercise Flow:**
   - Search input at top
   - Filtered list below
   - Click to add
   - Visual confirmation when added
   - Clear indication when at max (6)

4. **Empty States:**
   - Show message when no exercises selected
   - Show message when search returns no results
   - Show helpful hints (e.g., "Select a view to see available exercises")

---

### Step 9: Add View-Specific Labels and Units

**Tasks:**
1. **Display Metric Labels:**
   - Show what metric is being compared (e.g., "Tonnage", "Shot Distance", "Average Speed")
   - Display units if applicable (e.g., "ft", "sec", "min", "%")

2. **Y-Axis or Legend:**
   - For bar charts, show percentage scale (0-100%)
   - Show raw values alongside percentages (optional, in tooltip or label)

3. **View-Specific Formatting:**
   - Format numbers appropriately (decimals, rounding)
   - Add units to raw values if displayed
   - Ensure consistent formatting across exercises

---

### Step 10: Handle Edge Cases and Validation

**Tasks:**
1. **No Exercises Selected:**
   - Show empty state message
   - Disable skill map visualization
   - Show helpful prompt to add exercises

2. **No Data for Exercises:**
   - Show message: "No data found for selected exercises in this time period"
   - Allow changing time interval
   - Suggest trying different exercises

3. **Single Exercise Selected:**
   - Show 100% (it's the highest by default)
   - Or show message: "Add more exercises to compare"

4. **All Exercises Have Same Value:**
   - All show 100% (all are highest)
   - Or show message explaining they're equal

5. **Zero Values:**
   - Handle division by zero in percentage calculation
   - Show 0% for exercises with zero values
   - Show appropriate message if all are zero

6. **Mode/View Changes:**
   - Clear selected exercises when mode changes
   - Clear selected exercises when view changes (since exercise pool changes)
   - Show confirmation or auto-clear with message

---

### Step 11: Test Each View for Each Mode

**Tasks:**
1. **Test Lifting Mode:**
   - Performance View with 2-6 exercises
   - Tonnage View with 2-6 exercises
   - Verify calculations match documentation
   - Verify percentages are correct

2. **Test Basketball Mode:**
   - All 5 views
   - Test with exercises logged in different exercise types
   - Verify view restrictions work (can't add shooting exercise to Performance view)
   - Verify calculations for each view type

3. **Test Other Modes:**
   - Football (5 views)
   - Baseball (5 views)
   - Soccer (5 views)
   - Hockey (5 views)
   - Tennis (4 views)

4. **Test Time Intervals:**
   - 30 Days
   - 90 Days
   - 180 Days
   - 360 Days
   - Verify data is pulled from correct time range

5. **Test Edge Cases:**
   - No data
   - Single exercise
   - All same values
   - Zero values
   - Max exercises (6)
   - Switching modes/views

---

### Step 12: Polish & Refine (After Functionality Confirmed)

**Tasks:**
1. **Improve UI/UX:**
   - Better selectors/dropdowns
   - Smooth animations
   - Loading states
   - Error messages
   - Empty states with helpful messages
   - Better visual hierarchy

2. **Enhance Visualization:**
   - Better styling for bars/chart
   - Color coding (highest = different color)
   - Animations when data loads
   - Tooltips showing raw values
   - Better spacing and typography

3. **Performance Optimization:**
   - Cache exercise lists
   - Optimize queries
   - Debounce search input
   - Memoize calculations

4. **Accessibility:**
   - Screen reader support
   - Proper labels
   - Keyboard navigation
   - Color contrast

---

## Code Organization

### New Files to Create:

**Hooks:**
- `hooks/useSkillMapData.ts` - Skill map data fetching and calculation

**API Functions (Modify Existing):**
- `lib/api/progress-view-calculations.ts` - Add interval-based calculation functions

**Screen Files (Update Existing):**
- `app/(tabs)/meals/skill-map.tsx` - Complete implementation

### Files to Reuse:

**Existing Utilities:**
- `lib/api/progress-views.ts` - View configurations (already exists)
- `lib/api/exercise-filtering.ts` - Exercise filtering by view (already exists)
- `lib/api/progress-view-calculations.ts` - View calculations (modify to add interval versions)

---

## Key Technical Considerations

### 1. View System Reuse
- Skill Map uses exact same view logic as Progress Graphs
- Views restrict exercise pool (not the other way around)
- Same calculation formulas, just applied to entire interval

### 2. Time Interval Handling
- Data is from entire time interval (not bucketed)
- Start date = today - timeInterval days
- End date = today
- All workouts in this range are included

### 3. Exercise Selection
- Max 6 exercises
- Must match view's exercise type restriction
- Fuzzy matching for exercise names
- Prevent duplicates

### 4. Percentage Calculation
- Always relative to highest value
- Highest = 100%
- Others = (value / highest) × 100
- Handle edge cases (zero, same values)

### 5. Data Aggregation
- Need efficient queries for large datasets
- Consider caching for frequently accessed data
- Batch queries where possible
- Use existing exercise type detection

### 6. Mode/View Changes
- Clearing selected exercises when mode/view changes is important
- Exercise pool changes, so previous selections may be invalid
- Show clear feedback to user

---

## Implementation Order

### Recommended Sequence:

1. **Data Hook (Steps 1-2)**
   - Create `useSkillMapData` hook
   - Adapt view calculations for entire interval
   - Test with sample data

2. **Basic UI (Steps 3-4)**
   - Build skeleton UI
   - Implement exercise selection
   - Connect to data hook

3. **Visualization (Steps 5-7)**
   - Implement percentage calculations
   - Build basic bar chart
   - Connect data to visualization

4. **Enhancement (Steps 8-9)**
   - Improve exercise selection UI
   - Add labels and units
   - Handle edge cases

5. **Testing (Step 10)**
   - Test all views for all modes
   - Test edge cases
   - Verify calculations

6. **Polish (Step 11)**
   - Improve UI/UX
   - Add animations
   - Optimize performance

---

## Dependencies & Prerequisites

### Database:
- ✅ `workouts` table - Already exists
- ✅ `workout_exercises` table - Already exists
- ✅ `workout_sets` table - Already exists

### Existing Utilities:
- ✅ View configuration system (`progress-views.ts`)
- ✅ Exercise filtering by view (`exercise-filtering.ts`)
- ✅ View calculation functions (`progress-view-calculations.ts`)
- ✅ Exercise type detection
- ✅ Mode mapping functions
- ✅ Fuzzy exercise matching

### New Requirements:
- ⚠️ Interval-based view calculations (adapt existing)
- ⚠️ Percentage calculation logic
- ⚠️ Multi-exercise selection UI
- ⚠️ Skill map visualization component

---

## Testing Strategy

### Functional Testing:
- Test each view for each mode
- Test time intervals (30/90/180/360)
- Test exercise selection (add, remove, max 6)
- Test percentage calculations
- Test edge cases (no data, single exercise, same values, zero values)

### UI/UX Testing:
- Test exercise selection flow
- Test mode/view changes
- Test visualization rendering
- Test responsive design
- Test loading/error states

### Performance Testing:
- Test with large datasets
- Test query performance
- Test rendering performance
- Test memory usage

---

## Notes & Considerations

1. **Reusability:** Skill Map heavily reuses Progress Graph logic, which is good for consistency and maintainability.

2. **User Experience:** The flow (mode → view → exercises) is different from Progress Graphs, so UI should make this clear.

3. **Visualization Choice:** Start with simple horizontal bar chart, can enhance later with more sophisticated visualizations.

4. **Data Accuracy:** Ensure calculations match Progress Graph calculations exactly (just applied to entire interval).

5. **Edge Cases:** Handle gracefully - show helpful messages, don't crash on edge cases.

6. **Premium Feature:** Remember this is a premium feature - ensure premium gating is in place (likely already handled in main progress tab screen).

---

## Example Data Flow

### User Flow:
1. User opens Skill Map screen
2. User selects "Lifting" mode
3. System shows available views: ["Performance", "Tonnage"]
4. User selects "Tonnage" view
5. System fetches available exercises (only "exercise" type exercises from lifting mode)
6. User searches and adds "Bench Press"
7. User searches and adds "Squat"
8. User searches and adds "Deadlift"
9. System calculates:
   - Bench Press: 10000 (tonnage for 90 days)
   - Squat: 7000 (tonnage for 90 days)
   - Deadlift: 8000 (tonnage for 90 days)
10. System finds highest: 10000 (Bench Press)
11. System calculates percentages:
    - Bench Press: 100% (10000/10000)
    - Squat: 70% (7000/10000)
    - Deadlift: 80% (8000/10000)
12. UI displays skill map with bars showing relative comparison

---

## Next Steps

1. Review this plan with user
2. Start with Step 1 (Data Hook)
3. Build incrementally, test each component
4. Move to next step after confirming previous step works
5. Iterate on UI/UX after functionality is confirmed

---

**End of Skill Map Implementation Plan**
