# Implementation Roadmap

PHASE 0 – Reconnect Supabase & Establish Backend Architecture
Step 0.1 – Reconnect Supabase to the Expo app

Plain English

Reconnect the existing Supabase project to this repo and set up a clean, centralized API layer so all future backend work flows through it.

Code instructions

ENV + config

Add .env values (ask Luke for keys, do not commit them):

EXPO_PUBLIC_SUPABASE_URL

EXPO_PUBLIC_SUPABASE_ANON_KEY

Create lib/supabase.ts (or reuse existing if present):

// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});


If there’s already a similar file, reuse and standardize it instead of creating a new one.

Auth context hook

Create providers/AuthProvider.tsx if not present:

Wrap app with Supabase auth listener.

Expose user, session, signIn, signOut, signUp helpers.

In app/_layout.tsx, wrap the app with <AuthProvider> (around existing providers like ModeProvider, MealsProvider).

Do NOT yet build sign-up flow UI.
Only ensure the client can talk to Supabase and supabase.auth.getSession() works.

Functionality check

Add a simple temporary debug screen or logging in an existing screen to:

Fetch supabase.auth.getSession() and console.log it.

Verify no runtime errors.

Confirm Supabase URL/key are correct (no network errors).

Step 0.2 – Inspect existing Supabase schema and reconcile with doc

Plain English

Look at existing tables in Supabase (from previous Stage A/B1/B2 work) and reconcile them with this documentation. We’ll extend/adjust the schema, not blindly replace.

Code instructions

In Supabase dashboard:

Go to Database → Table editor and list existing tables (e.g., profiles, workouts, workout_items, meals, meal_items, runs, highlights, follows, ai_messages, etc. if present).

In the repo:

Look for any supabase/migrations or SQL files used previously.

Create a markdown doc in the repo: docs/schema-inventory.md that lists:

Existing tables + key columns.

Gaps vs. this documentation (e.g., no games table yet, no practices table, no creator_codes table, etc.).

Functionality check

Ensure docs/schema-inventory.md is committed.

Luke can skim it and confirm it matches his memory of Stage A/B1/B2.

PHASE 1 – Core Data Model (Supabase Database)

Goal: Define/extend the database to support everything in the doc, even if some pieces are wired later.

Implement via Supabase migrations (SQL) – not ad-hoc manual table editing.

Step 1.1 – User & profile / account state

Plain English

Model users, their profile, premium status, creator status, chosen sports, and discount/creator codes. This supports almost every feature later.

Code instructions (SQL-ish)

In a new migration:

Profiles

If profiles already exists, extend it; otherwise create:

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text default '',
  sports text[] not null default '{}',  -- ['workout','basketball',...]
  primary_sport text,                   -- optional
  profile_image_url text,
  is_premium boolean not null default false,
  is_creator boolean not null default false,
  premium_expires_at timestamptz,       -- for time-limited promos if needed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


Add trigger to set id on insert from auth.uid() and update updated_at.

Account plan & codes

Add tables for codes and sign-up tracking:

create type app_plan as enum (
  'free',
  'premium',
  'creator'
);

alter table profiles
  add column if not exists plan app_plan not null default 'free';

create table if not exists promoter_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  type text not null check (type in ('creator_signup', 'premium_discount')),
  creator_profile_id uuid references profiles(id),
  discount_percent int check (discount_percent between 0 and 100),
  duration_days int,  -- e.g. 30 days of discount
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists profile_code_uses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  promoter_code_id uuid not null references promoter_codes(id),
  used_at timestamptz default now(),
  constraint uniq_profile_code unique (profile_id, promoter_code_id)
);


This allows:

Creator activation code (type = creator_signup).

Premium discount codes (type = premium_discount).

Stripe & actual billing will come later; these flags just tell the app what to show/unlock.

Functionality check

Use Supabase SQL editor to insert a test user row (or use existing auth.users) and:

Confirm profiles row auto-creates or can be inserted.

Manually insert a promoter_codes row and profile_code_uses row and ensure constraints work.

Step 1.2 – Workouts, sets, and exercise types (all sport modes)

Plain English

Model workouts and their exercises/sets in a generic way that supports:

Mode: workout, basketball, football, baseball, soccer, hockey, tennis, running.

Exercise types and specific metrics (reps, weight, time, distance, etc.).

Fuzzy exercise names.

Aggregation for graphs later.

Code instructions (SQL)

Workout table

create type sport_mode as enum (
  'workout',
  'basketball',
  'football',
  'baseball',
  'soccer',
  'hockey',
  'tennis',
  'running'
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode sport_mode not null,
  name text not null,
  performed_at date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


Exercise types

create type exercise_type as enum (
  'exercise',   -- reps, weight
  'shooting',   -- attempted, made
  'drill',      -- reps, time_min or reps, completed
  'sprints',    -- reps, distance, avg_time_sec
  'hitting',    -- reps, avg_distance
  'fielding',   -- reps, distance
  'rally'       -- points, time_min
);


Workout exercises

create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  exercise_type exercise_type not null,
  -- "name" the user typed for the exercise (fuzzy search)
  name text not null,
  created_at timestamptz default now()
);


Workout sets

Use one flexible table; many columns nullable, but constrained by exercise_type in the app layer:

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_exercises(id) on delete cascade,
  set_index int not null,  -- 0-based or 1-based order
  reps numeric,
  weight numeric,
  attempted numeric,
  made numeric,
  percentage numeric,     -- optional precomputed
  distance numeric,
  time_min numeric,
  avg_time_sec numeric,
  completed boolean,
  points numeric,
  created_at timestamptz default now()
);


Running workouts

For running mode, use workouts with mode='running' but also a specific runs table if needed:

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  distance_miles numeric,
  time_min numeric,
  avg_pace_per_mile numeric, -- or compute in queries
  created_at timestamptz default now()
);


Functionality check

Insert one sample workout with:

mode = 'basketball'

two exercises: one exercise type, one shooting type

multiple sets each.

Confirm foreign keys and cascade delete behavior.

Step 1.3 – Home-tab schedule & weekly goals, games, practices

Plain English

Support:

Weekly schedule for workout mode & running mode.

Weekly goals for goals (e.g., “3 pointers made – 100”).

Logged games & practices for sports (for logging & History tab).

Code instructions (SQL)

Weekly schedule

create table if not exists weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode sport_mode not null,  -- 'workout' or 'running' for now
  week_start_date date not null, -- Monday or Sunday; choose and be consistent
  day_index int not null check (day_index between 0 and 6),
  label text,  -- what user typed, e.g. 'Leg Day', 'Rest'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_schedule_per_day unique (user_id, mode, week_start_date, day_index)
);


Weekly goals (basketball & other modes)

create table if not exists weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode sport_mode not null,        -- basketball, etc.
  name text not null,              -- e.g. '3 pointers made'
  target_value numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


We’ll compute progress later by aggregating matching workout_sets (with fuzzy name matching).

Games

create type game_result as enum ('win', 'loss', 'tie');

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode sport_mode not null,
  played_at date not null,
  result game_result,
  stats jsonb,   -- flexible stats fields like points, rebounds, etc.
  notes text,
  created_at timestamptz default now()
);


Practices

create table if not exists practices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mode sport_mode not null,
  practiced_at date not null,
  drill text,
  notes text,
  created_at timestamptz default now()
);


Functionality check

Manually insert:

A weekly goal.

A game and a practice entry.

Confirm all constraints and types behave as expected.

Step 1.4 – Meals / macros

Plain English

Support meals (breakfast/lunch/dinner/snacks), foods, macros per day, and graphs for macros.

Code instructions (SQL)

Meals & items

create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  type meal_type not null,
  created_at timestamptz default now(),
  constraint uniq_meal_per_type_per_day unique (user_id, date, type)
);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_name text not null,
  servings numeric not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fats numeric not null,
  sugar numeric not null,
  sodium numeric not null,
  barcode text,       -- optional
  external_food_id text, -- API id for future
  created_at timestamptz default now()
);


Daily burned calories & macro goals

create table if not exists daily_burned_calories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  calories numeric not null,
  created_at timestamptz default now(),
  constraint uniq_burn_per_day unique (user_id, date)
);

create table if not exists macro_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  calories numeric not null default 2500,
  protein numeric not null default 150,
  carbs numeric not null default 400,
  fats numeric not null default 100,
  sugar numeric not null default 80,
  sodium numeric not null default 2000,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


Treat macro goals as one active row per user, or add a is_active flag if you want history.

Functionality check

Insert a meal, two items, one burned calories record, and one macro goal row.

Write a quick SQL query to verify you can compute:

daily totals (sum of macros)

net calories (sum calories − burned).

Step 1.5 – Social & media (profile follows, highlights)

Plain English

Support:

Followers/following.

Highlights (videos) stored in Supabase storage.

Creator workouts viewing later.

Code instructions (SQL)

Follows

create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);


Highlights

create table if not exists highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  video_path text not null,   -- Supabase storage path
  created_at timestamptz default now()
);


Storage bucket

In Supabase → Storage, create a bucket highlights.

Set RLS so:

Anyone can read public highlight videos.

Only owner can upload/delete their own paths.

Functionality check

From SQL or Supabase UI:

Insert two follow rows.

Insert one highlight row.

Confirm reading them works.

PHASE 2 – Backend Helpers for Graphs & Fuzzy Matching

We’ll create Supabase RPC functions (Postgres functions) to encapsulate the heavy queries and fuzzy logic. Cursor should write them in SQL and call them from the app via supabase.rpc.

Step 2.1 – Fuzzy name matching helper

Plain English

We need fuzzy matching for:

Exercise names (progress graphs, weekly goals).

Food names (later for API search, but at least internal).

It must be tolerant to case differences, minor typos, “3 point shot” vs. “3 point shooting”.

Code instructions (SQL)

Enable the pg_trgm extension if not already:

create extension if not exists pg_trgm;


Create a helper function to search exercises by fuzzy name:

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
    lower(name) as exercise_name,
    greatest(
      similarity(lower(name), lower(p_query)),
      similarity(replace(lower(name), ' ', ''), replace(lower(p_query), ' ', ''))
    ) as sim
  from workout_exercises we
    join workouts w on w.id = we.workout_id
  where w.user_id = p_user_id
    and w.mode = p_mode
  group by lower(name)
  having max(similarity(lower(name), lower(p_query))) > 0.2 -- adjust threshold
  order by sim desc
  limit p_limit;
end;
$$ language plpgsql stable;


Functionality check

In SQL editor, call:

select * from search_exercise_names('<user-id>', 'basketball', '3 point shot');


Confirm it returns the intended names even with small spelling/case variations.

Step 2.2 – Progress graph RPC for workouts/home tabs

Plain English

Create one generic function that, given:

user

mode

exercise name query

metric (e.g., 'reps', 'weight', 'reps_x_weight', 'attempted', 'made', 'percentage', 'distance', 'time_min', etc.)

period (7, 30, 90, 180, 360 days)

returns 6 or fewer time-bucketed points ready to graph on the Y axis.

Code instructions (SQL)

Create an RPC like:

create or replace function get_exercise_progress(
  p_user_id uuid,
  p_mode sport_mode,
  p_query text,
  p_metric text,       -- 'reps', 'weight', 'reps_x_weight', 'attempted', ...
  p_days int           -- 7, 30, 90, 180, 360
)
returns table (
  bucket_index int,
  bucket_start date,
  bucket_end date,
  value numeric
) as $$
declare
  -- compute number of buckets & bucket length based on p_days
begin
  -- 7 days -> 7 buckets of 1 day
  -- 30 days -> 4 buckets of 7-8 days
  -- 90 days -> 6 buckets of 15 days
  -- 180 days -> 6 buckets of 30 days
  -- 360 days -> 6 buckets of 60 days

  -- 1. resolve canonical exercise name via search_exercise_names().
  -- 2. select sets for that user, mode, exercise name, and date in window.
  -- 3. compute metric per set:
  --    - reps: reps
  --    - weight: weight
  --    - reps_x_weight: reps * weight
  --    - attempted: attempted
  --    - made: made
  --    - percentage: (made / attempted) * 100
  --    - distance: distance
  --    - time_min: time_min
  --    - avg_time_sec: avg_time_sec
  --    - points: points
  -- 4. group by bucket_index and return avg() of metric.
end;
$$ language plpgsql stable;


Cursor should implement the full logic inside the function, using the schema from Phase 1.

Functionality check

Insert test data (like your bench press example) and call:

select * from get_exercise_progress('<user-id>', 'workout', 'bench press', 'reps_x_weight', 30);


Confirm bucket counts & values match the expected averages.

Step 2.3 – Meals progress graph RPC

Plain English

A similar RPC that:

Aggregates daily macros across meals & burned calories.

Groups into 7, 30, 90, 180, 360-day buckets.

Uses metric: 'calories', 'protein', 'carbs', 'fats', 'sugar', 'sodium'.

Code instructions

Create:

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
begin
  -- Implementation:
  -- 1. For each date in the window, sum macros from meal_items.
  -- 2. For calories, subtract burned calories if stored separately.
  -- 3. Group into buckets and return avg(value) per bucket.
end;
$$ language plpgsql stable;


Functionality check

Insert some meal_items and daily_burned_calories entries.

Query get_macro_progress with 30 days and confirm expected averages.

PHASE 3 – Workout Tab (frontend wiring + backend integration)

We now wire the Workout tab UI to Supabase.

Step 3.1 – Create a TypeScript API layer for workouts

Plain English

Create a small TypeScript API module that the Workout tab uses to:

Create a workout.

Add exercises and sets.

Save & finalize workout.

Fetch a completed workout (for History).

Code instructions

Create lib/api/workouts.ts with functions:

import { supabase } from '../supabase';
import { SportMode, ExerciseType } from '../types'; // define enums/types

export async function createWorkout(params: {
  mode: SportMode;
  name: string;
  performedAt?: string; // ISO date
}) { /* insert into workouts, return id */ }

export async function addExercise(params: {
  workoutId: string;
  exerciseType: ExerciseType;
  name: string;
}) { /* insert into workout_exercises */ }

export async function upsertSets(params: {
  exerciseId: string;
  sets: Array<{
    setIndex: number;
    reps?: number;
    weight?: number;
    attempted?: number;
    made?: number;
    distance?: number;
    timeMin?: number;
    avgTimeSec?: number;
    completed?: boolean;
    points?: number;
  }>;
}) { /* insert/update workout_sets rows */ }

export async function finalizeWorkout(workoutId: string) {
  // maybe just ensure everything is saved; nothing else to do yet
}

export async function getWorkoutWithDetails(workoutId: string) {
  // select from workouts + exercises + sets
}


Use this API in the Workout tab screens instead of any previous mock/local state save.

Do NOT

Rebuild the Workout tab UI layout. Just adapt the “Save Workout” flow to call these APIs.

Functionality check

In the Workout tab (all sport modes except running which may differ):

Start a workout.

Add exercises & sets.

Tap “Save Workout” → go to summary screen.

Tap “Finish Workout” → ensure a row appears in workouts, plus workout_exercises & workout_sets.

Confirm no crashes when many sets/exercises are added (maybe add a high but safe limit like 50 exercises × 20 sets each).

Step 3.2 – Build the “Saved Workout Overview” screen

Plain English

When the user taps “Save Workout”, you show a summary screen listing workout name + exercises + set counts, with options:

“Back to edit” (go back to edit workout screen).

“Finish Workout” (log it to History).

Code instructions

In app/(tabs)/workouts/ or wherever the routing currently lives:

Make sure the screen you described in Section 3 exists:

It reads workoutId from router params.

Calls getWorkoutWithDetails(workoutId) to display:

Workout name.

Each exercise name, type, and number of sets.

“Finish Workout” calls finalizeWorkout and then navigates back (or to History tab).

Functionality check

Start → add workout → “Save Workout” → overview screen → “Finish Workout”.

Verify that after finishing you can see it in the History tab list (in Phase 5 we’ll wire History in detail; for now, at least it exists in DB).

PHASE 4 – Home Tab: Weekly schedule, goals, games/practices, graphs

We’ll assume most UI is already built (except some screens) and we are wiring the backend + missing screens.

Step 4.1 – Weekly schedule (Workout & Running modes)

Plain English

Connect the +Schedule Week button to a backend that reads/writes weekly_schedules, and populate the 7-day lines on the home tab.

Code instructions

API helpers

Create lib/api/schedule.ts:

import { supabase } from '../supabase';
import { SportMode } from '../types';

export async function getWeeklySchedule(params: {
  mode: SportMode;
  weekStartDate: string; // ISO date
}) { /* select from weekly_schedules */ }

export async function upsertWeeklySchedule(params: {
  mode: SportMode;
  weekStartDate: string;
  items: Array<{ dayIndex: number; label: string | null }>;
}) {
  // upsert rows: insert new or update existing for each dayIndex
}


Schedule screen

Connect the existing “+Schedule Week” screen (which you said isn’t built yet) or create it:

It shows inputs for current week and next week.

On save, calls upsertWeeklySchedule for each week.

On the Home Workout & Running tabs:

On mount, call getWeeklySchedule for current week and feed UI.

Determine check/X/green/red logic later in Step 4.4 when we connect logged workouts.

Functionality check

Manually schedule a week.

Reload app:

Ensure the weekly schedule lines show text + dates correctly.

Confirm DB rows are created/updated.

Step 4.2 – Weekly goals (Basketball & other sport modes)

Plain English

Wire the +Add Weekly Goal button to weekly_goals and show progress bars updating when user logs related exercises.

Code instructions

API helpers

lib/api/goals.ts:

import { supabase } from '../supabase';
import { SportMode } from '../types';

export async function createWeeklyGoal(params: {
  mode: SportMode;
  name: string;
  targetValue: number;
}) { /* insert into weekly_goals */ }

export async function listWeeklyGoals(params: {
  mode: SportMode;
}) { /* select weekly_goals for this user + mode */ }

export async function getWeeklyGoalProgress(params: {
  goalId: string;
}) {
  // Call a Supabase RPC that:
  // 1. Uses the goal name to fuzzy-match related exercises.
  // 2. Sums matching metrics for the current week.
}


RPC for goal progress (SQL)

Add a function similar to get_exercise_progress, but:

Hard-code period = current week (start of week → today).

Use the goal’s name to fuzzy-match exercise names (via search_exercise_names).

Decide a metric:

For goals like “3 pointers made”, use made for shooting type.

You can inspect the goal name to infer metric (e.g., contains “made”, “attempted”, etc.), or require the first matching exercise type to decide.

Return current_value (number achieved this week).

UI wiring

On Basketball Home tab:

Display list of goals fetched via listWeeklyGoals.

For each, call getWeeklyGoalProgress and show:

current_value/targetValue

progress bar filled current_value / targetValue.

Functionality check

Create a goal “3 pointers made – 100”.

Log a workout with shooting exercise named something like “3 point shot” with made = 20.

Confirm the goal updates to 20/100 and bar to 20%.

Step 4.3 – Log Game / Log Practice screens (all modes except running/workout)

Plain English

Wire the game and practice logging screens to games and practices tables, and make sure History tab can see them later.

Code instructions

API

lib/api/games.ts:

export async function createGame(params: {
  mode: SportMode;
  playedAt: string;  // date
  result: 'win' | 'loss' | 'tie';
  stats: Record<string, number | string>;
  notes?: string;
}) { /* insert into games */ }


lib/api/practices.ts:

export async function createPractice(params: {
  mode: SportMode;
  practicedAt: string;
  drill: string;
  notes?: string;
}) { /* insert into practices */ }


Home tab wiring

For each sport mode that has +Add Game / +Add Practice:

On save, call the respective API.

Then navigate back to Home or History.

Functionality check

Add a game & practice in Basketball mode.

Confirm rows exist in games & practices.

Later, History tab will surface them (Phase 5).

Step 4.4 – Home tab progress graphs (all sport modes)

Plain English

Hook each Home tab graph to:

The correct dropdown options.

The running / exercise / shooting / drill metrics.

The get_exercise_progress RPC.

Code instructions

Graph wrapper

Create a shared hook: hooks/useExerciseProgressGraph.ts:

import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';
import { SportMode } from '../types';

type Metric =
  | 'reps'
  | 'weight'
  | 'reps_x_weight'
  | 'attempted'
  | 'made'
  | 'percentage'
  | 'distance'
  | 'time_min'
  | 'avg_time_sec'
  | 'points';

export function useExerciseProgressGraph(params: {
  mode: SportMode;
  query: string;
  metric: Metric;
  days: 7 | 30 | 90 | 180 | 360;
}) {
  const [data, setData] = useState<Array<{
    bucketIndex: number;
    bucketStart: string;
    bucketEnd: string;
    value: number | null;
  }> | null>(null);

  useEffect(() => {
    if (!params.query) return;
    supabase
      .rpc('get_exercise_progress', {
        p_user_id: /* current user id */,
        p_mode: params.mode,
        p_query: params.query,
        p_metric: params.metric,
        p_days: params.days,
      })
      .then(({ data, error }) => {
        if (!error) setData(data ?? []);
      });
  }, [params.mode, params.query, params.metric, params.days]);

  return data;
}


Mode-specific dropdowns

In each Home tab (Workout, Basketball, Football, etc.), map:

Workout: ['Reps', 'Weight', 'Reps x Weight'] → metrics 'reps' | 'weight' | 'reps_x_weight'.

Basketball:

If primary type is exercise: same as workout.

If shooting: ['Attempted', 'Made', 'Percentage'] → 'attempted' | 'made' | 'percentage'.

If drill: ['Reps', 'Time (min)'] → 'reps' | 'time_min'.

Football:

exercise: same as workout.

drill: 'reps', 'completed' (we can use 'reps' or treat completed as count of completed sets).

sprints: 'reps', 'distance', 'avg_time_sec'.

Baseball:

exercise: same as workout.

hitting: 'reps', 'distance' (use distance field).

fielding: 'reps', 'distance'.

Soccer/Hockey:

exercise: same as workout.

drill: 'reps', 'time_min'.

shooting: 'reps', 'distance'.

Tennis:

exercise: same as workout.

drill: 'reps', 'time_min'.

rally: 'points', 'time_min'.

Running Home:

No exercise name search; graph based on runs data and metrics 'distance_miles', 'avg_pace_per_mile', 'time_min'.

Implement a separate RPC like get_running_progress.

Functionality check

For at least one mode (Workout & Basketball) and one exercise, log data and verify:

Changing left dropdown changes Y-axis values.

Changing right dropdown changes bucket counts.

Empty intervals show no points (not zeros).

Step 4.5 – Weekly schedule green/red check logic

Plain English

Determine per-day:

If a schedule entry exists and is not “rest”, and at least one workout is logged that day in that mode → ✅ + green.

If a schedule entry exists and is not “rest”, but no workout logged that day in that mode → ❌ + red.

If schedule entry is blank or some fuzzy form of “rest” and no workout → ✅.

If schedule is rest and workout exists, treat as ✅ (user went above and beyond).

Code instructions

In lib/api/schedule.ts, add a helper:

export async function getScheduleWithStatus(params: {
  mode: SportMode;
  weekStartDate: string;
}) {
  // 1. fetch weekly_schedules.
  // 2. fetch workouts for that week in that mode.
  // 3. For each dayIndex:
  //    - find label
  //    - find workouts with performed_at = that day
  //    - isRest = label is null or fuzzy-matches 'rest', 'rest day', etc.
  //    - status: 'completed' | 'missed' | 'rest'.
}


Fuzzy rest check: lowercase label, trim, remove punctuation, check if it contains "rest".

Functionality check

Set schedule for a week.

Log workouts on some days.

Confirm colors/check/X match the rules.

PHASE 5 – Meals Tab
Step 5.1 – Date picker + daily state

Plain English

Make the date header work:

Tap date → open date picker UI (already or to be implemented).

When date changes, reload that day’s meals, macros, burned calories.

Code instructions

In app/(tabs)/meals/index.tsx:

Add state selectedDate (default = today).

On date change, call a helper:

import { getMealsForDate, getMacroTotalsForDate } from '../../lib/api/meals';


In lib/api/meals.ts:

export async function getMealsForDate(date: string) {
  // fetch meals + meal_items for user & date
}

export async function getMacroTotalsForDate(date: string) {
  // sum macros from meal_items for that date
  // subtract daily_burned_calories if exists
}


Functionality check

Select a date.

Add some meals/items.

Change date → verify UI changes.

Return to original date → confirm data restored.

Step 5.2 – “+Add to Breakfast/Lunch/Dinner/Snacks” flow

Plain English

Wire the “Add to [Meal]” flow from search → food detail → add to meal → update macros.

Code instructions

API to upsert meal and add item

export async function addFoodToMeal(params: {
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food: {
    name: string;
    servings: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    sugar: number;
    sodium: number;
    barcode?: string;
    externalId?: string;
  };
}) {
  // 1. ensure meals row exists for (user, date, type).
  // 2. insert meal_items row.
}


Search screen

If you already have a search screen (likely), use it to:

Display mock or local list now; later we’ll integrate Spoonacular / Food API.

On selecting a food, navigate to the “Food detail” screen, passing macros & name.

On that detail screen:

Let the user adjust “servings” (up to 999).

When they tap “Add to [Meal]”, call addFoodToMeal.

Then navigate back to Meals tab.

Functionality check

Add a couple of foods to breakfast and lunch.

Verify meal lists & per-meal calories.

Confirm totals and bars update.

Step 5.3 – Burned calories + macro goals

Plain English

Wire the “Burned Calories” input and “Edit Macro Goals” screen to their tables.

Code instructions

In lib/api/meals.ts:

export async function upsertBurnedCalories(params: {
  date: string;
  calories: number;
}) { /* insert/update daily_burned_calories */ }

export async function getMacroGoals() { /* fetch macro_goals row or default */ }

export async function updateMacroGoals(goals: {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sugar: number;
  sodium: number;
}) { /* update macro_goals */ }


Hook:

Burned calories input → upsertBurnedCalories.

“Edit Macro Goals” screen → getMacroGoals & updateMacroGoals.

Macro display section reads both getMacroTotalsForDate + getMacroGoals.

Functionality check

Log 2000 calories eaten and 200 burned → net 1800.

Change macro goals from defaults → see updated goal numbers and bars.

Step 5.4 – Meals progress graph

Plain English

Reuse graph pattern, calling get_macro_progress RPC.

Code instructions

Create hooks/useMacroProgressGraph.ts to wrap get_macro_progress.

Map left dropdown (“Calories”, “Protein”, …) to metrics 'calories' | 'protein' | ....

Right dropdown same as other graphs (7,30,90,180,360 days).

Functionality check

Log macros across several days.

Verify graph shows average per interval as described.

Step 5.5 – Barcode scanner integration (partial)

Plain English

You already have a barcode scanner screen. Now connect it to the Meals flow so that scanning a barcode:

Looks up a food (for now, maybe just stub/mock).

Navigates to the food detail screen with that food prefilled.

Code instructions

In scanner screen:

On barcode detection, call a stub helper:

import { findFoodByBarcode } from '../../lib/api/food';

const food = await findFoodByBarcode(barcodeData);


Implement findFoodByBarcode with fake or local data for now, but keep the shape you’ll use when connecting Spoonacular or other API.

Then navigate to the same food detail screen used by “Add to Breakfast/Lunch/Dinner/Snacks”.

Functionality check

Simulate scanning a known test barcode.

Confirm app navigates to the food detail screen with correct data.

PHASE 6 – History Tab (Workouts, Practices, Games, Streaks)
Step 6.1 – Rename and reposition History tab

Plain English

Ensure the History tab is:

The 4th tab (middle right).

Named “History”.

Has hourglass icon.

Code instructions

In app/(tabs)/_layout.tsx or wherever the tab router is defined:

Move the History route to the 4th pos.

Update tab title to “History”.

Swap icon to hourglass (Ionicons or MaterialCommunityIcons).

Functionality check

Confirm tabs order: Home, Workouts, Meals, History, Profile.

Step 6.2 – History: Workouts list & detail

Plain English

Fully wire the existing “Workouts” History UI so all logged workouts appear, searchable, and clickable into read-only detail.

Code instructions

API helpers

lib/api/history.ts:

export async function listWorkouts(params: {
  search?: string;
  limit?: number;
}) {
  // search by workout name (fuzzy) and order by performed_at desc
}

export async function getWorkoutDetail(workoutId: string) {
  // same as getWorkoutWithDetails but read-only
}


Use ILIKE or similarity to implement fuzzy search on workouts.name.

UI wiring

History tab, drop-down “Workouts”:

On mount and when search text changes, call listWorkouts.

Render boxes with:

Date.

Workout name.

Sport mode icon.

Tap → navigate to a detail screen that uses getWorkoutDetail.

Functionality check

Create several workouts.

Search by partial name.

Confirm list updates.

Tap one → detail screen shows all exercises & sets read-only.

Step 6.3 – History: Practices & Games + streak counters

Plain English

Add the “Practices” & “Games” options to the dropdown and make them behave like described (lists, detail screens, streak boxes).

Code instructions

API

In lib/api/history.ts:

export async function listPractices(params: { limit?: number }) {
  // select practices for user ordered by practiced_at desc
}

export async function getPracticeDetail(id: string) {
  // select single practice row
}

export async function listGames(params: { limit?: number }) {
  // select games ordered by played_at desc
}

export async function getGameDetail(id: string) {
  // select single game row
}

export async function getHistoryStats(params: {
  kind: 'workouts' | 'practices' | 'games';
}) {
  // 1. total count
  // 2. streak:
  //    - workouts: consecutive days with at least one workout, ending today or last workout date.
  //    - practices: same logic on practices.
  //    - games: consecutive games with result='win', starting from most recent backward.
}


UI

Dropdown top-right of History tab:

Options: “Workouts”, “Practices”, “Games”.

When “Practices”:

Show list of practice boxes: date + mode icon.

Tap → read-only practice detail.

Bottom sticky bar:

Left: “Total Practices”.

Right: “Practice Streak”.

When “Games”:

Show list of game boxes: date + result + mode icon.

Tap → read-only game detail.

Bottom sticky bar:

Left: “Total Games”.

Right: “Win Streak”.

Functionality check

Log multiple workouts, practices, games across several days.

Verify counts and streak logic are correct.

Switch dropdown between modes without crashing.

PHASE 7 – Profile, Social, Highlights, Creator Workouts
Step 7.1 – Profile basics: display & edit

Plain English

Wire Profile tab to profiles & highlights & follows:

Display profile picture, display name, username, bio.

Show counts for followers, following, highlights.

Allow edit of display name / username / bio.

Handle unique username.

Code instructions

API

lib/api/profile.ts:

export async function getMyProfile() { /* from profiles */ }

export async function updateMyProfile(params: {
  displayName?: string;
  username?: string;
  bio?: string;
}) { /* update profiles row */ }

export async function getProfileStats(profileId: string) {
  // counts: followers, following, highlights
}


UI

Profile tab:

On mount, call getMyProfile & getProfileStats.

Use existing UI to show them.

“Edit Profile” screen:

Pre-fill existing values.

On save, call updateMyProfile.

Handle Supabase unique username error with a user-friendly message.

Functionality check

Change username & bio; verify DB updates and UI reflects.

Step 7.2 – Highlights: upload, view, delete

Plain English

Implement:

Selecting multiple videos from camera roll.

Uploading to Supabase highlights bucket.

Creating highlights rows.

Viewing them full-screen with scroll.

Deleting via trash icon (only for own profile).

Code instructions

API

lib/api/highlights.ts:

import { supabase } from '../supabase';
import * as FileSystem from 'expo-file-system';

export async function uploadHighlights(files: Array<{ uri: string }>) {
  // for each file:
  // 1. generate a path like `${userId}/${uuid}.mp4`
  // 2. upload to storage bucket 'highlights'
  // 3. insert row into highlights table
}

export async function listHighlights(profileId: string) {
  // select from highlights where user_id = profileId, order by created_at desc
}

export async function deleteHighlight(id: string) {
  // find highlight row, delete storage object & row
}


UI

“Add Highlights” button:

Opens media picker, gets selected video URIs.

Calls uploadHighlights.

Refresh highlights list.

Highlights preview row in Profile:

taps → full-screen video view with vertical scroll.

In full-screen:

Show trash icon only if viewing own profile.

On delete, call deleteHighlight and update list.

Functionality check

Add 2+ highlights.

Scroll through them full-screen.

Delete one, ensure it disappears and storage is cleaned.

Step 7.3 – Find Friends & Creators, follow/unfollow

Plain English

Implement a screen where:

Users can search by username/display name.

See recommended users (best effort: most followed + shared followers).

Follow/unfollow users.

Show a golden glow for creators.

Code instructions

API

lib/api/social.ts:

export async function searchProfiles(query: string) {
  // search display_name and username (ILIKE or similarity)
}

export async function listRecommendedProfiles() {
  // simple implementation:
  // - top N profiles ordered by follower_count (precomputed view) OR
  // - random sample
}

export async function follow(profileId: string) {
  // insert into follows
}

export async function unfollow(profileId: string) {
  // delete from follows
}

export async function getFollowers(profileId: string) { /* optionally later */ }
export async function getFollowing(profileId: string) { /* optionally later */ }


You can create a Postgres view for profile_follower_counts for efficient ordering.

UI

“Find Friends and Creators” screen:

At top: search bar.

Body: list of users (recommendations or search results).

Each row: profile picture (with golden glow if is_creator = true), display name, follow/unfollow button.

Functionality check

Create 2–3 test profiles.

Follow/unfollow between them.

Confirm counts and recommended list update.

Step 7.4 – Creator workouts & “Copy workout” (premium-gated)

Plain English

On a Creator’s profile:

Show a “View Creator Workouts” button.

If viewer is premium:

Tap → see Creator’s workout history.

Tap a workout → see details with “Copy” button.

“Copy” starts a new workout for the viewing user with same exercises but no sets’ values.

If viewer is not premium:

Button is greyed with lock & shows premium pop-up.

Code instructions

API

Extend lib/api/history.ts:

export async function listWorkoutsForProfile(params: {
  profileId: string;
  limit?: number;
}) {
  // workouts where user_id = profileId
}


lib/api/workouts.ts:

export async function copyWorkoutSkeleton(params: {
  sourceWorkoutId: string;
}) {
  // 1. fetch workout_exercises of source workout.
  // 2. create new workout for current user with same mode & name (maybe add '(Copied)' suffix).
  // 3. for each exercise, create new workout_exercises with same type & name BUT no sets.
  // return new workoutId
}


UI

On profile screen:

If is_creator = true:

Show “View Creator Workouts” button.

Check current user’s is_premium or plan:

If not premium → greyed out with lock; on tap, show premium modal.

If premium → on tap, navigate to a list of the creator’s workouts (reuse History list style).

On Creator workout detail:

Show “Copy” button except for running mode workouts.

On tap:

Call copyWorkoutSkeleton.

Navigate to Workout tab with new workout loaded for editing.

Functionality check

Make one profile creator & premium.

From another premium account:

View Creator profile → see enabled button.

Copy workout → ensure new workout appears with same exercises, empty sets.

From non-premium:

See locked button and proper modal.

PHASE 8 – Premium & Codes (without Stripe)
Step 8.1 – Premium flags & feature gates

Plain English

Use profiles.plan, is_premium, is_creator to control:

Log Game/Practice.

AI Trainer.

Add Highlights.

Meals progress graph.

View Creator Workouts.

Add More Sports.

Code instructions

Feature gating hook

hooks/useFeatures.ts:

import { useProfile } from './useProfile'; // a hook that returns my profile

export function useFeatures() {
  const { profile } = useProfile();
  const isPremium = profile?.plan === 'premium' || profile?.is_premium;
  const isCreator = !!profile?.is_creator;

  return {
    isPremium,
    isCreator,
    canLogGames: isPremium,
    canLogPractices: isPremium,
    canUseAITrainer: isPremium,
    canAddHighlights: isPremium,
    canSeeMealsGraph: isPremium,
    canViewCreatorWorkouts: isPremium,
    canAddMoreSports: isPremium, // plus maybe creator
  };
}


UI

Wherever features are described as premium in your doc:

If not allowed:

Grey out section.

Show lock icon.

On tap → show “Upgrade to Premium” modal that navigates to a stub “Purchase Premium” screen.

Functionality check

Manually toggle plan in DB between free and premium and confirm UI changes correctly.

Step 8.2 – Creator codes & signup discount codes (without Stripe)

Plain English

Implement:

A settings screen where Luke can input creator activation codes to flip is_creator and grant free premium.

A sign-up creator code field that:

Logs which code was used.

Would affect pricing (once Stripe is added).

Code instructions

Settings: activate creator code

API in lib/api/codes.ts:

export async function redeemCreatorCode(code: string) {
  // 1. lookup promoter_codes where code = code and type='creator_signup' and is_active=true
  // 2. if found:
  //    - set profiles.is_creator=true
  //    - set profiles.plan='creator'
  //    - insert into profile_code_uses
  // return success/error
}


Settings screen UI:

Text input “Creator Code”.

“Redeem” button → calls redeemCreatorCode.

Sign-up: premium discount code (backend part)

When user signs up and lands on the “premium upsell” screen:

Allow them to type “creator code” there as well.

In the code (once Stripe is implemented), you’ll check:

promoter_codes with type='premium_discount'.

If valid:

Mark a pending discount for the payment. For now:

Insert profile_code_uses.

Maybe store premium_expires_at for free discount period.

For now, just store that the code was used; pricing is manual until Stripe integration.

Admin code creation

You will manually create codes in Supabase:

Insert rows into promoter_codes with appropriate code, type, etc.

Functionality check

Create a test creator code and discount code in DB.

Redeem them via app.

Confirm profile’s flags & profile_code_uses rows update as expected.

PHASE 9 – AI Trainer (AI Coach)

We’ll implement the skeleton so it’s fully wired, but the actual LLM provider can be swapped.

Step 9.1 – Data aggregation for AI Trainer

Plain English

Create a backend endpoint (Supabase Edge Function or API route) that:

Given a user id, fetches:

Profile (sports, plan).

Recent workouts (names, sets).

Recent games/practices & notes.

Recent meals/macros.

Summarizes it into JSON or text for the AI.

Code instructions

Supabase Edge Function (recommended, TypeScript):

Create function ai_trainer_context:

Input: JWT (user context).

Steps:

Fetch profile from profiles.

Fetch last N workouts/practices/games/meals (e.g., last 30 days).

Build a summarized object like:

{
  "profile": { ... },
  "recent_workouts": [ ... ],
  "recent_games": [ ... ],
  "recent_practices": [ ... ],
  "macro_summary": { ... }
}


Return JSON.

Client helper

lib/api/ai.ts:

export async function getAITrainerContext() {
  // call edge function 'ai_trainer_context'
}

export async function sendAITrainerMessage(params: {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
}) {
  // call another edge function 'ai_trainer_chat' which:
  // 1. calls getAITrainerContext internally.
  // 2. calls the LLM provider (OpenAI / etc.) with system prompt including context.
  // For now, you can stub the LLM call if needed.
}


Functionality check

Call ai_trainer_context for a test user to verify JSON structure.

Step 9.2 – AI Trainer UI & premium gate

Plain English

Implement:

A sticky circle button only on Home tabs.

On tap: open full-screen chat with messages.

If user isn’t premium: show locked pop-up instead of opening chat.

Code instructions

Create AI Trainer component:

// components/AITrainerButton.tsx
const AITrainerButton = () => {
  const { canUseAITrainer } = useFeatures();
  const router = useRouter();

  const handlePress = () => {
    if (!canUseAITrainer) {
      // show premium modal
    } else {
      router.push('/ai-trainer');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      {/* circle UI */}
    </TouchableOpacity>
  );
};


Add this component to Home layouts only.

Create app/ai-trainer.tsx:

Chat UI:

Local state of message list.

On send:

Append user message.

Call sendAITrainerMessage.

Append assistant response.

Back arrow to return to Home.

Functionality check

For premium user:

Tap AI button → chat appears, stub response works.

For free user:

Tap AI button → locked modal, no chat.

PHASE 10 – Auth & Signup Flow (last, per your preference)

Now that backend is largely ready, wire the full sign-up/login/initialization flow, but do not rebuild core tabs.

Step 10.1 – Sign Up & Log In screens

Plain English

Implement start screens:

Logo.

“Sign Up” (above) and “Log In” buttons.

Email/password or OAuth (Apple, Google, maybe others).

“Don’t have an account? Sign Up” small link on Log In.

“Already have an account? Log In” on Sign Up.

Code instructions

Create app/auth/ folder with:

index.tsx – landing with two big buttons.

login.tsx – email/password login + link to sign-up.

sign-up.tsx – email/password sign up + Apple/Google buttons.

Use Supabase auth:

supabase.auth.signUp({ email, password, options: { data: { username, display_name } }});
supabase.auth.signInWithPassword({ email, password });
supabase.auth.signInWithOAuth({ provider: 'apple' | 'google' });


Ensure profiles row is created via trigger or follow-up insert.

Functionality check

Create new user via signup.

Log out/log in.

Confirm profiles row exists and core tabs working.

Step 10.2 – Sport selection during signup

Plain English

As part of onboarding:

After account creation, ask user to select up to 2 sports (Workout, Running, Basketball, Football, Baseball, Soccer, Hockey, Tennis).

Save to profiles.sports and maybe primary_sport.

Default Home tab mode to their first selected sport; only show those modes in the sport mode switcher.

Code instructions

On sign-up success:

Navigate to app/auth/select-sports.tsx.

UI:

List all sports with toggles; enforce max 2 selected.

On “Continue”:

Call updateMyProfile with sports: string[] and primary_sport.

Functionality check

Create a new user with only basketball + workout.

Check:

Sport mode dropdown shows only these two.

Home & Workout tabs behave accordingly.

Step 10.3 – Premium upsell screen during onboarding

Plain English

After sport selection:

Show upsell screen for Premium.

Offer text field for creator code (discount code).

“Continue without Premium” button.

Code instructions

Screen app/auth/premium-upsell.tsx:

Creator code input.

“Apply code” button:

Calls a code validation API (like redeemPremiumSignupCode in lib/api/codes.ts) which:

Validates promoter_codes with type='premium_discount'.

Stores profile_code_uses.

Possibly sets a pending_discount flag (for future Stripe integration).

“Purchase Premium” button:

For now: stub and set profiles.plan='premium' manually.

Mark this code as TODO – connect Stripe later.

“Continue without Premium” navigates to main app.

Functionality check

Go through onboarding with and without using a code.

Verify profile flags and profile_code_uses rows.

Step 10.4 – Settings screen

Plain English

Implement a Settings tab/screen (accessible via gear icon) that allows:

View/change email (if possible).

Change password (via Supabase).

Manage sports:

For free plan: show chosen sports (max 2), no adding.

For premium: allow adding more sports.

Enter Creator code.

View plan status (free, premium, creator).

Log out.

Code instructions

Create app/settings.tsx (or nested under Profile).

Use existing hooks & APIs:

updateMyProfile for sports.

redeemCreatorCode for creator code.

supabase.auth.signOut() for logout.

Functionality check

Switch between free/premium/creator in DB and confirm Settings adjusts.

Update sports from Settings and verify Home/Workout tabs reflect new modes.

LAST PIECE – Frequent Functionality Checks (for Cursor)

Cursor, after each step or small group of steps, you should:

Run the app in Expo Go and manually use the feature you just wired:

For DB features: confirm records appear in Supabase.

For graphs: validate values with a small set of known numbers.

Watch the console for errors and fix them before moving on.

Keep a running docs/implementation-log.md noting:

Which steps are complete.

Any deviations from this roadmap.

Known TODOs (especially Stripe/real AI provider wiring)

This file will guide the implementation process step by step.

