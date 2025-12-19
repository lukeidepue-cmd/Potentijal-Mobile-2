-- =====================================================
-- FINAL Comprehensive Fix: All RPC Type Errors
-- This migration ensures ALL numeric operations return numeric (double precision)
-- =====================================================

-- CRITICAL FIX: get_exercise_progress
-- The issue is that avg() can return real when input types are mixed
-- We must cast EVERYTHING to numeric explicitly, including the final avg() result
create or replace function get_exercise_progress(
  p_user_id uuid,
  p_mode sport_mode,
  p_query text,
  p_metric text,
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
  exercise_names text[];
  canonical_name text;
begin
  case p_days
    when 7 then bucket_count := 7; bucket_size_days := 1;
    when 30 then bucket_count := 4; bucket_size_days := 7;
    when 90 then bucket_count := 6; bucket_size_days := 15;
    when 180 then bucket_count := 6; bucket_size_days := 30;
    when 360 then bucket_count := 6; bucket_size_days := 60;
    else bucket_count := 7; bucket_size_days := 1;
  end case;

  select array_agg(exercise_name)
  into exercise_names
  from search_exercise_names(p_user_id, p_mode, p_query, 5);

  if exercise_names is not null and array_length(exercise_names, 1) > 0 then
    canonical_name := exercise_names[1];
  else
    return;
  end if;

  return query
  with date_buckets as (
    select generate_series(
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
      -- CRITICAL: Cast ALL metric values to numeric BEFORE any calculations
      case p_metric
        when 'reps' then coalesce(ws.reps, 0)::numeric
        when 'weight' then coalesce(ws.weight, 0)::numeric
        when 'reps_x_weight' then (coalesce(ws.reps, 0)::numeric * coalesce(ws.weight, 0)::numeric)
        when 'attempted' then coalesce(ws.attempted, 0)::numeric
        when 'made' then coalesce(ws.made, 0)::numeric
        when 'percentage' then 
          case 
            when coalesce(ws.attempted, 0) > 0 
            then (coalesce(ws.made, 0)::numeric / coalesce(ws.attempted, 0)::numeric * 100::numeric)
            else null::numeric
          end
        when 'distance' then coalesce(ws.distance, 0)::numeric
        when 'time_min' then coalesce(ws.time_min, 0)::numeric
        when 'avg_time_sec' then coalesce(ws.avg_time_sec, 0)::numeric
        when 'completed' then case when ws.completed then 1::numeric else 0::numeric end
        when 'points' then coalesce(ws.points, 0)::numeric
        else null::numeric
      end as metric_value
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
    where w.user_id = p_user_id
      and w.mode = p_mode
      and (
        lower(we.name) = canonical_name
        or lower(we.name) = any(
          select exercise_name 
          from search_exercise_names(p_user_id, p_mode, p_query, 10)
        )
      )
      and w.performed_at >= (current_date - (bucket_count * bucket_size_days)::int)::date
      and w.performed_at < current_date
  ),
  bucketed_metrics as (
    select
      bwi.bucket_index,
      bwi.bucket_start,
      bwi.bucket_end,
      -- CRITICAL: Cast avg() result to numeric explicitly
      avg(sm.metric_value)::numeric as avg_value
    from buckets_with_index bwi
    left join set_metrics sm on 
      sm.performed_at >= bwi.bucket_start 
      and sm.performed_at <= bwi.bucket_end
      and sm.metric_value is not null
    group by bwi.bucket_index, bwi.bucket_start, bwi.bucket_end
  )
  select
    bucket_index,
    bucket_start,
    bucket_end,
    -- CRITICAL: Final cast to ensure numeric type
    coalesce(round(avg_value), 0)::numeric as value
  from bucketed_metrics
  where avg_value is not null
  order by bucket_index;
end;
$$ language plpgsql stable;

-- Fix get_weekly_goal_progress to ensure all numeric operations are properly cast
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
  select user_id, mode, name, target_value
  into v_user_id, v_mode, v_goal_name, v_target
  from public.weekly_goals
  where id = p_goal_id;

  if v_user_id is null then
    return;
  end if;

  select array_agg(exercise_name)
  into exercise_names
  from search_exercise_names(v_user_id, v_mode, v_goal_name, 10);

  return query
  with current_week_start as (
    select (current_date - extract(dow from current_date)::int)::date as week_start
  ),
  goal_metrics as (
    select
      case
        when lower(v_goal_name) ilike '%workout%' and lower(v_goal_name) not ilike '%exercise%' then
          (select count(distinct w.id)::numeric
           from public.workouts w
           cross join current_week_start cws
           where w.user_id = v_user_id
             and w.mode = v_mode
             and w.performed_at >= cws.week_start
             and w.performed_at < (cws.week_start + 7))
        else
          (select sum(
            case
              when v_goal_name ilike '%made%' then coalesce(ws.made, 0)::numeric
              when v_goal_name ilike '%attempted%' then coalesce(ws.attempted, 0)::numeric
              else coalesce(ws.reps, 0)::numeric
            end
          )::numeric
          from public.workout_sets ws
          join public.workout_exercises we on we.id = ws.workout_exercise_id
          join public.workouts w on w.id = we.workout_id
          cross join current_week_start cws
          where w.user_id = v_user_id
            and w.mode = v_mode
            and (
              exercise_names is null 
              or array_length(exercise_names, 1) = 0
              or lower(we.name) = any(exercise_names)
              or similarity(lower(we.name), lower(v_goal_name)) > 0.15
            )
            and w.performed_at >= cws.week_start
            and w.performed_at < (cws.week_start + 7))
      end::numeric as total_value
  )
  select
    coalesce(gm.total_value, 0::numeric) as current_value,
    v_target as target_value,
    v_goal_name as goal_name
  from goal_metrics gm;
end;
$$ language plpgsql stable;