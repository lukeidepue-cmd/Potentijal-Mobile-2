-- =====================================================
-- Phase 2.5: Fixes for Fuzzy Matching & Missing Features
-- Based on detailed documentation analysis
-- =====================================================

-- =====================================================
-- Fix 1: Improve fuzzy matching threshold (more lenient)
-- =====================================================

-- Lower the threshold from 0.2 to 0.15 for EXTREMELY fuzzy matching
-- as emphasized in documentation
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
      similarity(replace(lower(we.name), ' ', ''), replace(lower(p_query), ' ', '')),
      -- Also check without common suffixes/prefixes for better matching
      similarity(
        regexp_replace(lower(we.name), '(made|attempted|shot|shooting|point|points)', '', 'g'),
        regexp_replace(lower(p_query), '(made|attempted|shot|shooting|point|points)', '', 'g')
      )
    ) as sim
  from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
  where w.user_id = p_user_id
    and w.mode = p_mode
  group by lower(we.name)
  having max(
    greatest(
      similarity(lower(we.name), lower(p_query)),
      similarity(replace(lower(we.name), ' ', ''), replace(lower(p_query), ' ', '')),
      similarity(
        regexp_replace(lower(we.name), '(made|attempted|shot|shooting|point|points)', '', 'g'),
        regexp_replace(lower(p_query), '(made|attempted|shot|shooting|point|points)', '', 'g')
      )
    )
  ) > 0.15  -- Lowered from 0.2 for EXTREMELY fuzzy matching
  order by sim desc
  limit p_limit;
end;
$$ language plpgsql stable;

-- =====================================================
-- Fix 2: Add function to detect primary exercise type
-- =====================================================

-- This function determines what exercise type an exercise name is primarily tracked under
-- Returns the most common exercise_type for that name
create or replace function get_primary_exercise_type(
  p_user_id uuid,
  p_mode sport_mode,
  p_query text
)
returns exercise_type as $$
declare
  v_exercise_type exercise_type;
  exercise_names text[];
  canonical_name text;
begin
  -- Find matching exercise names using fuzzy search
  select array_agg(exercise_name)
  into exercise_names
  from search_exercise_names(p_user_id, p_mode, p_query, 5);

  -- Use the most similar match as canonical name
  if exercise_names is not null and array_length(exercise_names, 1) > 0 then
    canonical_name := exercise_names[1];
  else
    -- No matches found, return 'exercise' as default
    return 'exercise';
  end if;

  -- Find the most common exercise_type for this name
  select we.exercise_type
  into v_exercise_type
  from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
  where w.user_id = p_user_id
    and w.mode = p_mode
    and lower(we.name) = canonical_name
  group by we.exercise_type
  order by count(*) desc
  limit 1;

  -- Return the most common type, or 'exercise' as default
  return coalesce(v_exercise_type, 'exercise');
end;
$$ language plpgsql stable;

-- =====================================================
-- Fix 3: Fix weekly goals to match ALL similar exercises
-- =====================================================

-- The documentation says weekly goals should match ALL similar exercises
-- and sum across all of them, not just the first match
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
begin
  -- Get goal details
  select user_id, mode, name, target_value
  into v_user_id, v_mode, v_goal_name, v_target
  from public.weekly_goals
  where id = p_goal_id;

  if v_user_id is null then
    return;
  end if;

  -- Find ALL matching exercise names using fuzzy search (not just one)
  select array_agg(exercise_name)
  into exercise_names
  from search_exercise_names(v_user_id, v_mode, v_goal_name, 10); -- Get more matches

  -- Calculate current week's progress
  -- Week starts on Sunday (matching schedule logic)
  -- Note: extract(dow from date) returns 0 for Sunday, 1 for Monday, etc.
  return query
  with current_week_start as (
    -- Get Sunday of current week (dow 0 = Sunday)
    -- If today is Sunday (dow = 0), subtract 0 days
    -- If today is Monday (dow = 1), subtract 1 day, etc.
    select (current_date - extract(dow from current_date)::int)::date as week_start
  ),
  goal_metrics as (
    select
      case
        -- Special case: "Workouts" goal counts number of workouts, not sets
        when lower(v_goal_name) ilike '%workout%' and lower(v_goal_name) not ilike '%exercise%' then
          (select count(distinct w.id)::numeric
           from public.workouts w
           cross join current_week_start cws
           where w.user_id = v_user_id
             and w.mode = v_mode
             and w.performed_at >= cws.week_start
             and w.performed_at < (cws.week_start + 7))
        else
          -- For exercise-based goals, sum the metric values
          (select sum(
            case
              -- For goals like "3 pointers made", use "made" field
              when v_goal_name ilike '%made%' then ws.made
              -- For goals like "3 pointers attempted", use "attempted" field
              when v_goal_name ilike '%attempted%' then ws.attempted
              -- Default to reps
              else ws.reps
            end
          )
          from public.workout_sets ws
          join public.workout_exercises we on we.id = ws.workout_exercise_id
          join public.workouts w on w.id = we.workout_id
          cross join current_week_start cws
          where w.user_id = v_user_id
            and w.mode = v_mode
            -- Match ALL similar exercise names (not just one)
            -- This allows matching "3 pointers", "3 point shot", "3 point shooting", etc.
            and (
              exercise_names is null 
              or array_length(exercise_names, 1) = 0
              or lower(we.name) = any(exercise_names)
              -- Also do fuzzy matching on the fly for better coverage
              or similarity(lower(we.name), lower(v_goal_name)) > 0.15
            )
            and w.performed_at >= cws.week_start
            and w.performed_at < (cws.week_start + 7))
      end as total_value
  )
  select
    coalesce(gm.total_value, 0::numeric) as current_value,
    v_target as target_value,
    v_goal_name as goal_name
  from goal_metrics gm;
end;
$$ language plpgsql stable;

-- =====================================================
-- Fix 4: Improve schedule rest detection (more fuzzy)
-- =====================================================

-- This will be handled in the TypeScript code, but we can add a helper function
-- for more consistent rest detection
create or replace function is_rest_day_label(p_label text)
returns boolean as $$
begin
  if p_label is null or trim(p_label) = '' then
    return true;
  end if;

  -- Normalize the label for fuzzy matching
  declare
    normalized_label text;
  begin
    normalized_label := lower(trim(regexp_replace(p_label, '[^a-z0-9 ]', '', 'g')));
    
    -- Check for rest variations
    return normalized_label ~ '^rest' or
           normalized_label ~ 'rest$' or
           normalized_label ~ ' rest ' or
           normalized_label = 'rest day' or
           normalized_label = 'restday' or
           normalized_label ~ '^day off' or
           normalized_label ~ 'off day$';
  end;
end;
$$ language plpgsql immutable;

