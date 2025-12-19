-- =====================================================
-- Phase 2: Backend Helpers for Graphs & Fuzzy Matching
-- RPC Functions for Progress Graphs and Fuzzy Search
-- =====================================================

-- =====================================================
-- Step 2.1: Fuzzy Name Matching Helper
-- =====================================================

-- This function searches for exercise names using fuzzy matching
-- Handles case differences, typos, and variations like "3 point shot" vs "3 point shooting"
create or replace function search_exercise_names(
  p_user_id uuid,
  p_mode sport_mode,
  p_query text,
  p_limit int default 10
)
returns table (exercise_name text, similarity float) as $$
begin
  return query
  select
    distinct lower(we.name) as exercise_name,
    greatest(
      similarity(lower(we.name), lower(p_query)),
      similarity(replace(lower(we.name), ' ', ''), replace(lower(p_query), ' ', ''))
    ) as sim
  from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
  where w.user_id = p_user_id
    and w.mode = p_mode
  group by lower(we.name)
  having max(
    greatest(
      similarity(lower(we.name), lower(p_query)),
      similarity(replace(lower(we.name), ' ', ''), replace(lower(p_query), ' ', ''))
    )
  ) > 0.2  -- Minimum similarity threshold (adjust as needed)
  order by sim desc
  limit p_limit;
end;
$$ language plpgsql stable;

-- =====================================================
-- Step 2.2: Progress Graph RPC for Workouts/Home Tabs
-- =====================================================

-- This function returns time-bucketed progress data for exercise graphs
-- Supports all sport modes and exercise types
create or replace function get_exercise_progress(
  p_user_id uuid,
  p_mode sport_mode,
  p_query text,
  p_metric text,       -- 'reps', 'weight', 'reps_x_weight', 'attempted', 'made', 'percentage', etc.
  p_days int           -- 7, 30, 90, 180, 360
)
returns table (
  bucket_index int,
  bucket_start date,
  bucket_end date,
  value numeric
) as $$
declare
  bucket_count int;
  bucket_size_days int;
  exercise_names text[];
  canonical_name text;
begin
  -- Determine bucket configuration based on p_days
  case p_days
    when 7 then
      bucket_count := 7;
      bucket_size_days := 1;
    when 30 then
      bucket_count := 4;
      bucket_size_days := 7;
    when 90 then
      bucket_count := 6;
      bucket_size_days := 15;
    when 180 then
      bucket_count := 6;
      bucket_size_days := 30;
    when 360 then
      bucket_count := 6;
      bucket_size_days := 60;
    else
      bucket_count := 7;
      bucket_size_days := 1;
  end case;

  -- Find matching exercise names using fuzzy search
  select array_agg(exercise_name)
  into exercise_names
  from search_exercise_names(p_user_id, p_mode, p_query, 5);

  -- Use the most similar match as canonical name
  if exercise_names is not null and array_length(exercise_names, 1) > 0 then
    canonical_name := exercise_names[1];
  else
    -- No matches found, return empty result
    return;
  end if;

  -- Return bucketed data
  return query
  with date_buckets as (
    select
      generate_series(
        (current_date - (bucket_count * bucket_size_days)::int)::date,
        current_date - 1,
        (bucket_size_days || ' days')::interval
      )::date as bucket_start
  ),
  buckets_with_index as (
    select
      row_number() over (order by bucket_start) - 1 as bucket_index,
      bucket_start,
      (bucket_start + (bucket_size_days - 1))::date as bucket_end
    from date_buckets
    where bucket_start <= current_date - 1
  ),
  set_metrics as (
    select
      w.performed_at,
      ws.*,
      case p_metric
        when 'reps' then ws.reps
        when 'weight' then ws.weight
        when 'reps_x_weight' then (ws.reps * ws.weight)
        when 'attempted' then ws.attempted
        when 'made' then ws.made
        when 'percentage' then 
          case when ws.attempted > 0 then (ws.made / ws.attempted * 100) else null end
        when 'distance' then ws.distance
        when 'time_min' then ws.time_min
        when 'avg_time_sec' then ws.avg_time_sec
        when 'completed' then case when ws.completed then 1 else 0 end
        when 'points' then ws.points
        else null
      end as metric_value
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
    where w.user_id = p_user_id
      and w.mode = p_mode
      -- Match ALL similar exercise names (not just exact match)
      -- Use fuzzy matching to include variations
      and (
        lower(we.name) = canonical_name
        or lower(we.name) = any(
          select exercise_name 
          from search_exercise_names(p_user_id, p_mode, p_query, 10)
        )
      )
      and w.performed_at >= (current_date - (bucket_count * bucket_size_days)::int)::date
  )
  select
    b.bucket_index,
    b.bucket_start,
    b.bucket_end,
    avg(sm.metric_value) as value
  from buckets_with_index b
  left join set_metrics sm on sm.performed_at >= b.bucket_start and sm.performed_at <= b.bucket_end
  group by b.bucket_index, b.bucket_start, b.bucket_end
  having avg(sm.metric_value) is not null
  order by b.bucket_index;
end;
$$ language plpgsql stable;

-- Special function for running mode (uses runs table instead of workout_sets)
create or replace function get_running_progress(
  p_user_id uuid,
  p_metric text,       -- 'distance_miles', 'avg_pace_per_mile', 'time_min'
  p_days int           -- 7, 30, 90, 180, 360
)
returns table (
  bucket_index int,
  bucket_start date,
  bucket_end date,
  value numeric
) as $$
declare
  bucket_count int;
  bucket_size_days int;
begin
  -- Determine bucket configuration
  case p_days
    when 7 then
      bucket_count := 7;
      bucket_size_days := 1;
    when 30 then
      bucket_count := 4;
      bucket_size_days := 7;
    when 90 then
      bucket_count := 6;
      bucket_size_days := 15;
    when 180 then
      bucket_count := 6;
      bucket_size_days := 30;
    when 360 then
      bucket_count := 6;
      bucket_size_days := 60;
    else
      bucket_count := 7;
      bucket_size_days := 1;
  end case;

  return query
  with date_buckets as (
    select
      generate_series(
        (current_date - (bucket_count * bucket_size_days)::int)::date,
        current_date - 1,
        (bucket_size_days || ' days')::interval
      )::date as bucket_start
  ),
  buckets_with_index as (
    select
      row_number() over (order by bucket_start) - 1 as bucket_index,
      bucket_start,
      (bucket_start + (bucket_size_days - 1))::date as bucket_end
    from date_buckets
    where bucket_start <= current_date - 1
  ),
  run_metrics as (
    select
      w.performed_at,
      r.*,
      case p_metric
        when 'distance_miles' then r.distance_miles
        when 'avg_pace_per_mile' then r.avg_pace_per_mile
        when 'time_min' then r.time_min
        else null
      end as metric_value
    from public.runs r
    join public.workouts w on w.id = r.workout_id
    where w.user_id = p_user_id
      and w.mode = 'running'
      and w.performed_at >= (current_date - (bucket_count * bucket_size_days)::int)::date
  )
  select
    b.bucket_index,
    b.bucket_start,
    b.bucket_end,
    avg(rm.metric_value) as value
  from buckets_with_index b
  left join run_metrics rm on rm.performed_at >= b.bucket_start and rm.performed_at <= b.bucket_end
  group by b.bucket_index, b.bucket_start, b.bucket_end
  having avg(rm.metric_value) is not null
  order by b.bucket_index;
end;
$$ language plpgsql stable;

-- =====================================================
-- Step 2.3: Meals Progress Graph RPC
-- =====================================================

-- This function returns time-bucketed macro progress data
create or replace function get_macro_progress(
  p_user_id uuid,
  p_metric text,  -- 'calories', 'protein', 'carbs', 'fats', 'sugar', 'sodium'
  p_days int
)
returns table (
  bucket_index int,
  bucket_start date,
  bucket_end date,
  value numeric
) as $$
declare
  bucket_count int;
  bucket_size_days int;
begin
  -- Determine bucket configuration
  case p_days
    when 7 then
      bucket_count := 7;
      bucket_size_days := 1;
    when 30 then
      bucket_count := 4;
      bucket_size_days := 7;
    when 90 then
      bucket_count := 6;
      bucket_size_days := 15;
    when 180 then
      bucket_count := 6;
      bucket_size_days := 30;
    when 360 then
      bucket_count := 6;
      bucket_size_days := 60;
    else
      bucket_count := 7;
      bucket_size_days := 1;
  end case;

  return query
  with date_buckets as (
    select
      generate_series(
        (current_date - (bucket_count * bucket_size_days)::int)::date,
        current_date - 1,
        (bucket_size_days || ' days')::interval
      )::date as bucket_start
  ),
  buckets_with_index as (
    select
      row_number() over (order by bucket_start) - 1 as bucket_index,
      bucket_start,
      (bucket_start + (bucket_size_days - 1))::date as bucket_end
    from date_buckets
    where bucket_start <= current_date - 1
  ),
  daily_totals as (
    select
      m.date,
      sum(
        case p_metric
          when 'calories' then mi.calories * mi.servings
          when 'protein' then mi.protein * mi.servings
          when 'carbs' then mi.carbs * mi.servings
          when 'fats' then mi.fats * mi.servings
          when 'sugar' then mi.sugar * mi.servings
          when 'sodium' then mi.sodium * mi.servings
          else 0
        end
      ) as total_value,
      coalesce(dbc.calories, 0) as burned_calories
    from public.meals m
    join public.meal_items mi on mi.meal_id = m.id
    left join public.daily_burned_calories dbc on dbc.user_id = m.user_id and dbc.date = m.date
    where m.user_id = p_user_id
      and m.date >= (current_date - (bucket_count * bucket_size_days)::int)::date
    group by m.date, dbc.calories
  ),
  daily_net as (
    select
      date,
      case p_metric
        when 'calories' then total_value - burned_calories
        else total_value
      end as net_value
    from daily_totals
  )
  select
    b.bucket_index,
    b.bucket_start,
    b.bucket_end,
    avg(dn.net_value) as value
  from buckets_with_index b
  left join daily_net dn on dn.date >= b.bucket_start and dn.date <= b.bucket_end
  group by b.bucket_index, b.bucket_start, b.bucket_end
  having avg(dn.net_value) is not null
  order by b.bucket_index;
end;
$$ language plpgsql stable;

-- =====================================================
-- Helper Function: Get Weekly Goal Progress
-- =====================================================

-- This function calculates progress toward a weekly goal
-- Uses fuzzy matching to find related exercises
create or replace function get_weekly_goal_progress(
  p_goal_id uuid
)
returns table (
  current_value numeric,
  target_value numeric,
  goal_name text
) as $$
declare
  v_user_id uuid;
  v_mode sport_mode;
  v_goal_name text;
  v_target numeric;
  exercise_names text[];
  canonical_name text;
begin
  -- Get goal details
  select user_id, mode, name, target_value
  into v_user_id, v_mode, v_goal_name, v_target
  from public.weekly_goals
  where id = p_goal_id;

  if v_user_id is null then
    return;
  end if;

  -- Find matching exercise names using fuzzy search
  select array_agg(exercise_name)
  into exercise_names
  from search_exercise_names(v_user_id, v_mode, v_goal_name, 5);

  -- Use the most similar match
  if exercise_names is not null and array_length(exercise_names, 1) > 0 then
    canonical_name := exercise_names[1];
  else
    -- No matches, return zero progress
    return query select 0::numeric, v_target, v_goal_name;
    return;
  end if;

  -- Calculate current week's progress
  -- Week starts on Sunday (day 0)
  return query
  with current_week_start as (
    select date_trunc('week', current_date)::date as week_start
  ),
  goal_metrics as (
    select
      sum(
        case
          -- For goals like "3 pointers made", use "made" field
          when v_goal_name ilike '%made%' then ws.made
          -- For goals like "3 pointers attempted", use "attempted" field
          when v_goal_name ilike '%attempted%' then ws.attempted
          -- Default to reps
          else ws.reps
        end
      ) as total_value
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
    cross join current_week_start cws
    where w.user_id = v_user_id
      and w.mode = v_mode
      and lower(we.name) = canonical_name
      and w.performed_at >= cws.week_start
      and w.performed_at < (cws.week_start + 7)
  )
  select
    coalesce(gm.total_value, 0::numeric) as current_value,
    v_target as target_value,
    v_goal_name as goal_name
  from goal_metrics gm;
end;
$$ language plpgsql stable;

