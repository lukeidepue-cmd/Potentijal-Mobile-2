-- =====================================================
-- NUCLEAR OPTION: Complete function replacement
-- Drop ALL versions and recreate from scratch
-- =====================================================

-- Drop ALL possible function signatures
drop function if exists get_exercise_progress(uuid, sport_mode, text, text, int);
drop function if exists get_exercise_progress(uuid, sport_mode, text, text, integer);
drop function if exists public.get_exercise_progress(uuid, sport_mode, text, text, int);
drop function if exists public.get_exercise_progress(uuid, sport_mode, text, text, integer);

-- Now create it fresh with explicit type casting
create function get_exercise_progress(
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
) 
language plpgsql
stable
as $$
declare
  bucket_count int;
  bucket_size_days int;
  exercise_names text[];
  canonical_name text;
  v_metric_value double precision;
begin
  -- Determine bucket configuration
  case p_days
    when 7 then bucket_count := 7; bucket_size_days := 1;
    when 30 then bucket_count := 4; bucket_size_days := 7;
    when 90 then bucket_count := 6; bucket_size_days := 15;
    when 180 then bucket_count := 6; bucket_size_days := 30;
    when 360 then bucket_count := 6; bucket_size_days := 60;
    else bucket_count := 7; bucket_size_days := 1;
  end case;

  -- Find matching exercise names
  select array_agg(exercise_name)
  into exercise_names
  from search_exercise_names(p_user_id, p_mode, p_query, 5);

  if exercise_names is null or array_length(exercise_names, 1) = 0 then
    return;
  end if;

  canonical_name := exercise_names[1];

  -- Return data with explicit double precision
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
      row_number() over (order by bucket_start) - 1::int as bucket_index,
      bucket_start::date as bucket_start,
      (bucket_start + (bucket_size_days - 1))::date as bucket_end
    from date_buckets
    where bucket_start <= current_date - 1
  ),
  raw_metrics as (
    select
      w.performed_at::date as performed_at,
      case p_metric
        when 'reps' then (coalesce(ws.reps, 0))::double precision
        when 'weight' then (coalesce(ws.weight, 0))::double precision
        when 'reps_x_weight' then ((coalesce(ws.reps, 0) * coalesce(ws.weight, 0)))::double precision
        when 'attempted' then (coalesce(ws.attempted, 0))::double precision
        when 'made' then (coalesce(ws.made, 0))::double precision
        when 'percentage' then 
          case 
            when (coalesce(ws.attempted, 0)) > 0 
            then ((coalesce(ws.made, 0)::double precision / coalesce(ws.attempted, 0)::double precision) * 100.0::double precision)
            else null::double precision
          end
        when 'distance' then (coalesce(ws.distance, 0))::double precision
        when 'time_min' then (coalesce(ws.time_min, 0))::double precision
        when 'avg_time_sec' then (coalesce(ws.avg_time_sec, 0))::double precision
        when 'completed' then case when ws.completed then 1.0::double precision else 0.0::double precision end
        when 'points' then (coalesce(ws.points, 0))::double precision
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
  aggregated as (
    select
      bwi.bucket_index::int,
      bwi.bucket_start::date,
      bwi.bucket_end::date,
      case 
        when count(rm.metric_value) > 0 
        then (sum(rm.metric_value)::double precision / count(rm.metric_value)::double precision)::double precision
        else null::double precision
      end as avg_val
    from buckets_with_index bwi
    left join raw_metrics rm on 
      rm.performed_at >= bwi.bucket_start 
      and rm.performed_at <= bwi.bucket_end
      and rm.metric_value is not null
    group by bwi.bucket_index, bwi.bucket_start, bwi.bucket_end
  )
  select
    aggregated.bucket_index::int,
    aggregated.bucket_start::date,
    aggregated.bucket_end::date,
    coalesce(round(aggregated.avg_val::numeric, 0)::double precision, 0.0::double precision) as value
  from aggregated
  where aggregated.avg_val is not null
  order by aggregated.bucket_index;
end;
$$;

-- Grant execute permission
grant execute on function get_exercise_progress(uuid, sport_mode, text, text, int) to authenticated;
grant execute on function get_exercise_progress(uuid, sport_mode, text, text, int) to anon;

