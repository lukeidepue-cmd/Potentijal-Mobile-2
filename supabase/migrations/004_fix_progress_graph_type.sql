-- =====================================================
-- Fix: Progress Graph Type Error
-- Fixes "Returned type real does not match expected type double precision"
-- =====================================================

-- The issue is that some calculations return 'real' instead of 'numeric'
-- We need to explicitly cast all calculations to numeric

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
        when 'reps' then ws.reps::numeric
        when 'weight' then ws.weight::numeric
        when 'reps_x_weight' then (ws.reps::numeric * ws.weight::numeric)
        when 'attempted' then ws.attempted::numeric
        when 'made' then ws.made::numeric
        when 'percentage' then 
          case when ws.attempted > 0 then (ws.made::numeric / ws.attempted::numeric * 100::numeric) else null::numeric end
        when 'distance' then ws.distance::numeric
        when 'time_min' then ws.time_min::numeric
        when 'avg_time_sec' then ws.avg_time_sec::numeric
        when 'completed' then case when ws.completed then 1::numeric else 0::numeric end
        when 'points' then ws.points::numeric
        else null::numeric
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
      and w.performed_at < current_date
  ),
  bucketed_metrics as (
    select
      bwi.bucket_index,
      bwi.bucket_start,
      bwi.bucket_end,
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
    coalesce(round(avg_value), 0)::numeric as value
  from bucketed_metrics
  where avg_value is not null
  order by bucket_index;
end;
$$ language plpgsql stable;

