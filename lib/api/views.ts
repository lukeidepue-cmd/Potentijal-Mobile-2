// lib/api/views.ts
// User-built Views for the Progress Graph. Each view = (preset, stat-formula,
// aggregation) and renders 6 time-bucket data points across a chosen timeframe.

import { supabase } from '../supabase';

/** How the chosen stat names combine into a single per-set value. */
export type ViewOperation = 'multiply' | 'divide';

/** How multiple set-values inside one time bucket collapse to the Y value. */
export type ViewAggregation = 'highest' | 'total' | 'average';

/** Timeframes the graph supports. 7-day was dropped because 7/6 isn't a clean
 *  bucket size; all surviving timeframes divide evenly into 6 buckets. */
export type ViewDays = 30 | 90 | 180 | 360;

export const VIEW_DAYS_OPTIONS: ViewDays[] = [30, 90, 180, 360];
export const VIEW_BUCKETS = 6;

export interface ExerciseView {
  id: string;
  name: string;
  presetId: string;
  presetName: string;
  /** Stat names used in the formula, in order. Must match names on the preset. */
  statNames: string[];
  operation: ViewOperation;
  aggregation: ViewAggregation;
  createdAt: string;
  updatedAt: string;
}

interface ViewRow {
  id: string;
  name: string;
  preset_id: string;
  stat_names: string[];
  operation: ViewOperation;
  aggregation: ViewAggregation;
  created_at: string;
  updated_at: string;
  preset: { name: string } | null;
}

function rowToView(row: ViewRow): ExerciseView {
  return {
    id: row.id,
    name: row.name,
    presetId: row.preset_id,
    presetName: row.preset?.name ?? '',
    statNames: row.stat_names,
    operation: row.operation,
    aggregation: row.aggregation,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Returns the current user's views, most recently created first.
 *  Joined with each view's preset so the chip label can show "Name (Preset)". */
export async function listViews(): Promise<{ data: ExerciseView[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };
    const { data, error } = await supabase
      .from('views')
      .select('id, name, preset_id, stat_names, operation, aggregation, created_at, updated_at, preset:exercise_presets(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return { data: null, error };
    // The Supabase join types return `preset` as an object/array depending on
    // PostgREST quirks; coerce defensively.
    const rows: ViewRow[] = (data || []).map((r: any) => ({
      ...r,
      preset: Array.isArray(r.preset) ? r.preset[0] ?? null : r.preset ?? null,
    }));
    return { data: rows.map(rowToView), error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function createView(params: {
  name: string;
  presetId: string;
  statNames: string[];
  operation: ViewOperation;
  aggregation: ViewAggregation;
}): Promise<{ data: ExerciseView | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const name = params.name.trim();
    if (!name) return { data: null, error: { message: 'View name is required' } };

    const statNames = params.statNames.map(s => s.trim()).filter(Boolean);
    if (statNames.length < 1 || statNames.length > 5) {
      return { data: null, error: { message: 'Pick 1 to 5 stats' } };
    }
    if (params.operation === 'divide' && statNames.length !== 2) {
      return { data: null, error: { message: 'Divide requires exactly 2 stats' } };
    }

    const { data, error } = await supabase
      .from('views')
      .insert({
        user_id: user.id,
        preset_id: params.presetId,
        name,
        stat_names: statNames,
        operation: params.operation,
        aggregation: params.aggregation,
      })
      .select('id, name, preset_id, stat_names, operation, aggregation, created_at, updated_at, preset:exercise_presets(name)')
      .single();

    if (error) return { data: null, error };
    const row: ViewRow = {
      ...(data as any),
      preset: Array.isArray((data as any).preset) ? (data as any).preset[0] ?? null : (data as any).preset ?? null,
    };
    return { data: rowToView(row), error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function deleteView(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.from('views').delete().eq('id', id);
    return { error };
  } catch (error: any) {
    return { error };
  }
}

// ============================================================================
//  Progress computation
// ============================================================================

export interface ViewProgressPoint {
  bucketIndex: number;
  /** YYYY-MM-DD (local) of the first day in the bucket, inclusive. */
  bucketStart: string;
  /** YYYY-MM-DD (local) of the last day in the bucket, inclusive. */
  bucketEnd: string;
  /** Aggregated value for this bucket, or null if no sets fell into it. */
  value: number | null;
}

/** Build the 6 time buckets for a given timeframe, ending today (inclusive). */
export function buildBuckets(days: ViewDays): Array<{ index: number; start: Date; end: Date }> {
  const bucketDays = days / VIEW_BUCKETS;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk backwards from today; bucket VIEW_BUCKETS-1 ends today.
  return Array.from({ length: VIEW_BUCKETS }, (_, i) => {
    const offsetFromToday = (VIEW_BUCKETS - 1 - i) * bucketDays;
    const end = new Date(today);
    end.setDate(today.getDate() - offsetFromToday);
    const start = new Date(end);
    start.setDate(end.getDate() - bucketDays + 1);
    return { index: i, start, end };
  });
}

function dateToLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Apply a view's formula to one set's stat values. Returns null when any
 *  required stat is missing/non-numeric, or when divide-by-zero. */
function computeSetValue(
  operation: ViewOperation,
  statNames: string[],
  statsForSet: Map<string, number>
): number | null {
  const values: number[] = [];
  for (const name of statNames) {
    const v = statsForSet.get(name);
    if (v == null || !isFinite(v)) return null;
    values.push(v);
  }
  if (operation === 'multiply') {
    return values.reduce((a, b) => a * b, 1);
  }
  if (operation === 'divide') {
    if (values.length !== 2 || values[1] === 0) return null;
    return values[0] / values[1];
  }
  return null;
}

function aggregateValues(values: number[], aggregation: ViewAggregation): number | null {
  if (values.length === 0) return null;
  if (aggregation === 'highest') return Math.max(...values);
  if (aggregation === 'total') return values.reduce((a, b) => a + b, 0);
  if (aggregation === 'average') return values.reduce((a, b) => a + b, 0) / values.length;
  return null;
}

/**
 * Fetch sets for the view's preset in the timeframe, compute the formula per
 * set, then aggregate per time bucket. Returns exactly VIEW_BUCKETS points.
 *
 * When `exerciseName` is provided, only sets logged under exercises with that
 * (case-insensitive) name are included — this is how the Progress Graph plots a
 * single exercise like "Sprint drill" rather than blending the whole preset.
 * Omit it to aggregate every exercise under the preset.
 *
 * Sets logged before migration 047 won't have preset_id and are silently
 * excluded — there's no name-matching fallback, intentionally.
 */
export async function getViewProgress(params: {
  view: ExerciseView;
  days: ViewDays;
  exerciseName?: string;
}): Promise<{ data: ViewProgressPoint[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const buckets = buildBuckets(params.days);
    const earliest = buckets[0].start;
    const latest = buckets[buckets.length - 1].end;

    const nameFilter = params.exerciseName?.trim().toLowerCase() || null;

    // 1. Find workout_exercises (within timeframe) tied to this preset. Use an
    //    inner join on workouts so we can filter by performed_at. When a single
    //    exercise is requested, narrow by name (case-insensitive) below.
    const { data: exerciseRows, error: exErr } = await supabase
      .from('workout_exercises')
      .select('id, name, workouts!inner(performed_at, user_id)')
      .eq('preset_id', params.view.presetId)
      .eq('workouts.user_id', user.id)
      .gte('workouts.performed_at', dateToLocalISO(earliest))
      .lte('workouts.performed_at', dateToLocalISO(latest));

    if (exErr) return { data: null, error: exErr };

    type ExRow = { id: string; name: string | null; workouts: { performed_at: string } | { performed_at: string }[] };
    const exercises: { id: string; performedAt: string }[] = (exerciseRows as ExRow[] || [])
      .filter(r => !nameFilter || (r.name || '').trim().toLowerCase() === nameFilter)
      .map(r => {
        const w = Array.isArray(r.workouts) ? r.workouts[0] : r.workouts;
        return { id: r.id, performedAt: w.performed_at };
      });

    // Empty-data short circuit — return all-null buckets so the graph renders
    // a clean empty state instead of staying in loading.
    if (exercises.length === 0) {
      return {
        data: buckets.map(b => ({
          bucketIndex: b.index,
          bucketStart: dateToLocalISO(b.start),
          bucketEnd: dateToLocalISO(b.end),
          value: null,
        })),
        error: null,
      };
    }

    const exerciseIds = exercises.map(e => e.id);
    const performedByExerciseId = new Map(exercises.map(e => [e.id, e.performedAt]));

    // 2. Pull all sets for those exercises.
    const { data: setRows, error: setErr } = await supabase
      .from('workout_sets')
      .select('id, workout_exercise_id')
      .in('workout_exercise_id', exerciseIds);
    if (setErr) return { data: null, error: setErr };

    type SetRow = { id: string; workout_exercise_id: string };
    const sets: { id: string; exerciseId: string; performedAt: string }[] = (setRows as SetRow[] || [])
      .map(s => ({
        id: s.id,
        exerciseId: s.workout_exercise_id,
        performedAt: performedByExerciseId.get(s.workout_exercise_id) || '',
      }))
      .filter(s => s.performedAt);

    if (sets.length === 0) {
      return {
        data: buckets.map(b => ({
          bucketIndex: b.index,
          bucketStart: dateToLocalISO(b.start),
          bucketEnd: dateToLocalISO(b.end),
          value: null,
        })),
        error: null,
      };
    }

    // 3. Pull workout_set_stats for those sets, filtered to just the names the
    //    view formula needs.
    const setIds = sets.map(s => s.id);
    const { data: statRows, error: statErr } = await supabase
      .from('workout_set_stats')
      .select('workout_set_id, stat_name, value')
      .in('workout_set_id', setIds)
      .in('stat_name', params.view.statNames);
    if (statErr) return { data: null, error: statErr };

    type StatRow = { workout_set_id: string; stat_name: string; value: number };
    const statsBySetId = new Map<string, Map<string, number>>();
    for (const row of (statRows as StatRow[] || [])) {
      let m = statsBySetId.get(row.workout_set_id);
      if (!m) {
        m = new Map();
        statsBySetId.set(row.workout_set_id, m);
      }
      m.set(row.stat_name, Number(row.value));
    }

    // 4. Compute per-set value and bin into buckets.
    const valuesByBucket: number[][] = buckets.map(() => []);
    for (const set of sets) {
      const statsForSet = statsBySetId.get(set.id);
      if (!statsForSet) continue;
      const value = computeSetValue(params.view.operation, params.view.statNames, statsForSet);
      if (value == null) continue;

      const [y, m, d] = set.performedAt.split('-').map(Number);
      const performedAt = new Date(y, m - 1, d);
      performedAt.setHours(0, 0, 0, 0);

      const bucket = buckets.find(b => performedAt >= b.start && performedAt <= b.end);
      if (!bucket) continue;
      valuesByBucket[bucket.index].push(value);
    }

    // 5. Aggregate per bucket.
    const result: ViewProgressPoint[] = buckets.map((b, i) => ({
      bucketIndex: b.index,
      bucketStart: dateToLocalISO(b.start),
      bucketEnd: dateToLocalISO(b.end),
      value: aggregateValues(valuesByBucket[i], params.view.aggregation),
    }));

    return { data: result, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

// ============================================================================
//  Skill Map — per-exercise comparison
//
//  Where getViewProgress aggregates ALL exercises under a preset and bins by
//  time, the Skill Map compares INDIVIDUAL exercise names against each other.
//  Same formula + aggregation as the view; the difference is the grouping key
//  (exercise name instead of time bucket).
// ============================================================================

/** One exercise's collapsed value for a view, over the whole timeframe. */
export interface ViewExerciseValue {
  /** The user-typed exercise name (workout_exercises.name). */
  exerciseName: string;
  /** View value for this exercise across the timeframe, or null if no usable
   *  sets (missing stats, divide-by-zero, or nothing logged). */
  value: number | null;
}

/**
 * List the distinct exercise names the user has logged under a preset.
 *
 * All-time (not timeframe-limited) so the selection list stays stable when the
 * user changes the timeframe on the Skill Map. Names are returned sorted
 * case-insensitively. Only exercises tied to the preset via preset_id are
 * included (pre-migration-047 rows without preset_id are excluded, same as the
 * Progress Graph).
 */
export async function listPresetExerciseNames(params: {
  presetId: string;
}): Promise<{ data: string[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('workout_exercises')
      .select('name, workouts!inner(user_id)')
      .eq('preset_id', params.presetId)
      .eq('workouts.user_id', user.id);

    if (error) return { data: null, error };

    const seen = new Map<string, string>(); // lowercased -> original casing
    for (const row of (data as { name: string | null }[] || [])) {
      const name = (row.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    }

    const names = Array.from(seen.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    return { data: names, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Compute one view value per selected exercise name, over the timeframe.
 *
 * For each exercise name: gather every set across the timeframe, apply the
 * view's per-set formula, then collapse to a single number using the view's own
 * aggregation (highest / total / average) — the same aggregation used per
 * time-bucket in getViewProgress, just grouped by exercise name instead.
 *
 * Returns one entry per requested name (value null when the exercise has no
 * usable data), in the same order the names were passed in.
 */
export async function getViewExerciseComparison(params: {
  view: ExerciseView;
  days: ViewDays;
  exerciseNames: string[];
}): Promise<{ data: ViewExerciseValue[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const requested = params.exerciseNames.map(n => n.trim()).filter(Boolean);
    if (requested.length === 0) return { data: [], error: null };

    // Map a lowercased name back to the canonical casing the caller passed, so
    // results echo the user's selection regardless of historical casing drift.
    const canonicalByLower = new Map<string, string>();
    for (const n of requested) {
      const key = n.toLowerCase();
      if (!canonicalByLower.has(key)) canonicalByLower.set(key, n);
    }

    const buckets = buildBuckets(params.days);
    const earliest = buckets[0].start;
    const latest = buckets[buckets.length - 1].end;

    // 1. Exercises under this preset, in timeframe, matching the selected names.
    const { data: exerciseRows, error: exErr } = await supabase
      .from('workout_exercises')
      .select('id, name, workouts!inner(performed_at, user_id)')
      .eq('preset_id', params.view.presetId)
      .eq('workouts.user_id', user.id)
      .gte('workouts.performed_at', dateToLocalISO(earliest))
      .lte('workouts.performed_at', dateToLocalISO(latest));

    if (exErr) return { data: null, error: exErr };

    type ExRow = { id: string; name: string | null; workouts: { performed_at: string } | { performed_at: string }[] };
    // Keep only exercises whose name matches one of the requested names, and
    // remember which canonical name each exercise id belongs to.
    const nameByExerciseId = new Map<string, string>();
    for (const r of (exerciseRows as ExRow[] || [])) {
      const key = (r.name || '').trim().toLowerCase();
      const canonical = canonicalByLower.get(key);
      if (canonical) nameByExerciseId.set(r.id, canonical);
    }

    const emptyResult = (): ViewExerciseValue[] =>
      requested.map(n => ({ exerciseName: n, value: null }));

    if (nameByExerciseId.size === 0) {
      return { data: emptyResult(), error: null };
    }

    const exerciseIds = Array.from(nameByExerciseId.keys());

    // 2. Sets for those exercises.
    const { data: setRows, error: setErr } = await supabase
      .from('workout_sets')
      .select('id, workout_exercise_id')
      .in('workout_exercise_id', exerciseIds);
    if (setErr) return { data: null, error: setErr };

    type SetRow = { id: string; workout_exercise_id: string };
    const setExerciseId = new Map<string, string>();
    for (const s of (setRows as SetRow[] || [])) {
      setExerciseId.set(s.id, s.workout_exercise_id);
    }
    const setIds = Array.from(setExerciseId.keys());
    if (setIds.length === 0) {
      return { data: emptyResult(), error: null };
    }

    // 3. Stats for those sets, limited to the names the view formula needs.
    const { data: statRows, error: statErr } = await supabase
      .from('workout_set_stats')
      .select('workout_set_id, stat_name, value')
      .in('workout_set_id', setIds)
      .in('stat_name', params.view.statNames);
    if (statErr) return { data: null, error: statErr };

    type StatRow = { workout_set_id: string; stat_name: string; value: number };
    const statsBySetId = new Map<string, Map<string, number>>();
    for (const row of (statRows as StatRow[] || [])) {
      let m = statsBySetId.get(row.workout_set_id);
      if (!m) {
        m = new Map();
        statsBySetId.set(row.workout_set_id, m);
      }
      m.set(row.stat_name, Number(row.value));
    }

    // 4. Per-set value, grouped by canonical exercise name.
    const valuesByName = new Map<string, number[]>();
    for (const [setId, exerciseId] of setExerciseId) {
      const canonical = nameByExerciseId.get(exerciseId);
      if (!canonical) continue;
      const statsForSet = statsBySetId.get(setId);
      if (!statsForSet) continue;
      const value = computeSetValue(params.view.operation, params.view.statNames, statsForSet);
      if (value == null) continue;
      const list = valuesByName.get(canonical) || [];
      list.push(value);
      valuesByName.set(canonical, list);
    }

    // 5. Collapse each name with the view's own aggregation.
    const result: ViewExerciseValue[] = requested.map(name => ({
      exerciseName: name,
      value: aggregateValues(valuesByName.get(name) || [], params.view.aggregation),
    }));

    return { data: result, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
