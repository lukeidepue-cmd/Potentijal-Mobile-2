-- =====================================================
-- RADICAL FIX: Change return type to double precision
-- and use sum/count instead of avg() for better control
-- =====================================================

-- Drop and recreate the function with double precision return type
drop function if exists get_exercise_progress(uuid, sport_mode, text, text, int);

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
  value double precision
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
      case p_metric
        when 'reps' then coalesce(ws.reps, 0)::double precision
        when 'weight' then coalesce(ws.weight, 0)::double precision
        when 'reps_x_weight' then (coalesce(ws.reps, 0)::double precision * coalesce(ws.weight, 0)::double precision)
        when 'attempted' then coalesce(ws.attempted, 0)::double precision
        when 'made' then coalesce(ws.made, 0)::double precision
        when 'percentage' then 
          case 
            when coalesce(ws.attempted, 0) > 0 
            then (coalesce(ws.made, 0)::double precision / coalesce(ws.attempted, 0)::double precision * 100.0)
            else null::double precision
          end
        when 'distance' then coalesce(ws.distance, 0)::double precision
        when 'time_min' then coalesce(ws.time_min, 0)::double precision
        when 'avg_time_sec' then coalesce(ws.avg_time_sec, 0)::double precision
        when 'completed' then case when ws.completed then 1.0::double precision else 0.0::double precision end
        when 'points' then coalesce(ws.points, 0)::double precision
        else null::double precision
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
      -- Use sum/count instead of avg() for better type control
      case 
        when count(sm.metric_value) > 0 
        then (sum(sm.metric_value)::double precision / count(sm.metric_value)::double precision)
        else null::double precision
      end as avg_value
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
    coalesce(round(avg_value::numeric, 0)::double precision, 0.0::double precision) as value
  from bucketed_metrics
  where avg_value is not null
  order by bucket_index;
end;
$$ language plpgsql stable;

