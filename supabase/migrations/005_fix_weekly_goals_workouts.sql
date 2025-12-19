-- =====================================================
-- Fix: Weekly Goals "Workouts" Goal
-- Ensures "Workouts" goal counts workouts, not exercise sets
-- =====================================================

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
  return query
  with current_week_start as (
    -- Get Sunday of current week (dow 0 = Sunday)
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

