-- =====================================================
-- Initial Schema Migration
-- Creates all tables according to the app documentation
-- =====================================================

-- Enable required extensions
create extension if not exists "pg_trgm"; -- For fuzzy text matching

-- =====================================================
-- Step 1.1: User & Profile / Account State
-- =====================================================

-- Create app_plan enum for user subscription plans
create type app_plan as enum ('free', 'premium', 'creator');

-- Profiles table - stores user profile information
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text default '',
  sports text[] not null default '{}',  -- Array of sports: ['workout','basketball',...]
  primary_sport text,                    -- Optional primary sport
  profile_image_url text,
  is_premium boolean not null default false,
  is_creator boolean not null default false,
  plan app_plan not null default 'free',
  premium_expires_at timestamptz,        -- For time-limited promos
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to automatically update updated_at timestamp
-- Drop existing function if it exists (triggers will be recreated)
drop function if exists update_updated_at_column() cascade;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop existing triggers if they exist, then recreate
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function update_updated_at_column();

-- Trigger to automatically create profile when user signs up
-- Drop existing trigger and function if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'User')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Promoter codes table - for creator codes and discount codes
create table if not exists public.promoter_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  type text not null check (type in ('creator_signup', 'premium_discount')),
  creator_profile_id uuid references public.profiles(id),
  discount_percent int check (discount_percent between 0 and 100),
  duration_days int,  -- e.g. 30 days of discount
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Track which codes users have used
create table if not exists public.profile_code_uses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  promoter_code_id uuid not null references public.promoter_codes(id),
  used_at timestamptz default now(),
  constraint uniq_profile_code unique (profile_id, promoter_code_id)
);

-- =====================================================
-- Step 1.2: Workouts, Sets, and Exercise Types
-- =====================================================

-- Sport mode enum
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

-- Exercise type enum
create type exercise_type as enum (
  'exercise',   -- reps, weight
  'shooting',   -- attempted, made
  'drill',      -- reps, time_min or reps, completed
  'sprints',    -- reps, distance, avg_time_sec
  'hitting',    -- reps, avg_distance
  'fielding',   -- reps, distance
  'rally'       -- points, time_min
);

-- Workouts table
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode sport_mode not null,
  name text not null,
  performed_at date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists update_workouts_updated_at on public.workouts;
create trigger update_workouts_updated_at
  before update on public.workouts
  for each row
  execute function update_updated_at_column();

-- Workout exercises table
create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_type exercise_type not null,
  name text not null,  -- User-typed exercise name (for fuzzy search)
  created_at timestamptz default now()
);

-- Workout sets table - flexible schema for all exercise types
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  set_index int not null,  -- Order of set (1-based)
  -- Fields for different exercise types (nullable, validated in app layer)
  reps numeric,
  weight numeric,
  attempted numeric,
  made numeric,
  percentage numeric,     -- Optional precomputed percentage
  distance numeric,
  time_min numeric,
  avg_time_sec numeric,
  completed boolean,
  points numeric,
  created_at timestamptz default now()
);

-- Runs table for running mode
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  distance_miles numeric,
  time_min numeric,
  avg_pace_per_mile numeric, -- or compute in queries
  created_at timestamptz default now()
);

-- =====================================================
-- Step 1.3: Home Tab - Schedule, Goals, Games, Practices
-- =====================================================

-- Weekly schedules for workout & running modes
create table if not exists public.weekly_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode sport_mode not null,  -- 'workout' or 'running'
  week_start_date date not null, -- Monday or Sunday (be consistent)
  day_index int not null check (day_index between 0 and 6), -- 0=Sunday, 6=Saturday
  label text,  -- What user typed, e.g. 'Leg Day', 'Rest'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_schedule_per_day unique (user_id, mode, week_start_date, day_index)
);

drop trigger if exists update_weekly_schedules_updated_at on public.weekly_schedules;
create trigger update_weekly_schedules_updated_at
  before update on public.weekly_schedules
  for each row
  execute function update_updated_at_column();

-- Weekly goals for sport modes
create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode sport_mode not null,        -- basketball, etc.
  name text not null,              -- e.g. '3 pointers made'
  target_value numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists update_weekly_goals_updated_at on public.weekly_goals;
create trigger update_weekly_goals_updated_at
  before update on public.weekly_goals
  for each row
  execute function update_updated_at_column();

-- Game result enum
create type game_result as enum ('win', 'loss', 'tie');

-- Games table
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode sport_mode not null,
  played_at date not null,
  result game_result,
  stats jsonb,   -- Flexible stats: points, rebounds, etc.
  notes text,
  created_at timestamptz default now()
);

-- Practices table
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode sport_mode not null,
  practiced_at date not null,
  drill text,
  notes text,
  created_at timestamptz default now()
);

-- =====================================================
-- Step 1.4: Meals / Macros
-- =====================================================

-- Meal type enum
create type meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- Meals table
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  type meal_type not null,
  created_at timestamptz default now(),
  constraint uniq_meal_per_type_per_day unique (user_id, date, type)
);

-- Meal items table
create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_name text not null,
  servings numeric not null,
  calories numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fats numeric not null,
  sugar numeric not null,
  sodium numeric not null,
  barcode text,       -- Optional barcode
  external_food_id text, -- API id for future food API integration
  created_at timestamptz default now()
);

-- Daily burned calories
create table if not exists public.daily_burned_calories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  calories numeric not null,
  created_at timestamptz default now(),
  constraint uniq_burn_per_day unique (user_id, date)
);

-- Macro goals (one active set per user)
create table if not exists public.macro_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  calories numeric not null default 2500,
  protein numeric not null default 150,
  carbs numeric not null default 400,
  fats numeric not null default 100,
  sugar numeric not null default 80,
  sodium numeric not null default 2000,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_macro_goals_per_user unique (user_id)
);

drop trigger if exists update_macro_goals_updated_at on public.macro_goals;
create trigger update_macro_goals_updated_at
  before update on public.macro_goals
  for each row
  execute function update_updated_at_column();

-- =====================================================
-- Step 1.5: Social & Media (Profile Follows, Highlights)
-- =====================================================

-- Follows table (many-to-many relationship)
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

-- Highlights table (videos stored in Supabase Storage)
create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_path text not null,   -- Supabase storage path
  created_at timestamptz default now()
);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.promoter_codes enable row level security;
alter table public.profile_code_uses enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.runs enable row level security;
alter table public.weekly_schedules enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.games enable row level security;
alter table public.practices enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.daily_burned_calories enable row level security;
alter table public.macro_goals enable row level security;
alter table public.follows enable row level security;
alter table public.highlights enable row level security;

-- Profiles: Users can read their own profile, update their own
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Profiles: Anyone can view other profiles (for social features)
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

-- Workouts: Users can manage their own workouts
create policy "Users can manage own workouts"
  on public.workouts for all
  using (auth.uid() = user_id);

-- Workout exercises and sets: Users can manage their own
create policy "Users can manage own workout exercises"
  on public.workout_exercises for all
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can manage own workout sets"
  on public.workout_sets for all
  using (
    exists (
      select 1 from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id
      and w.user_id = auth.uid()
    )
  );

-- Similar policies for other user-owned tables
create policy "Users can manage own runs"
  on public.runs for all
  using (
    exists (
      select 1 from public.workouts
      where workouts.id = runs.workout_id
      and workouts.user_id = auth.uid()
    )
  );

create policy "Users can manage own weekly schedules"
  on public.weekly_schedules for all
  using (auth.uid() = user_id);

create policy "Users can manage own weekly goals"
  on public.weekly_goals for all
  using (auth.uid() = user_id);

create policy "Users can manage own games"
  on public.games for all
  using (auth.uid() = user_id);

create policy "Users can manage own practices"
  on public.practices for all
  using (auth.uid() = user_id);

create policy "Users can manage own meals"
  on public.meals for all
  using (auth.uid() = user_id);

create policy "Users can manage own meal items"
  on public.meal_items for all
  using (
    exists (
      select 1 from public.meals
      where meals.id = meal_items.meal_id
      and meals.user_id = auth.uid()
    )
  );

create policy "Users can manage own burned calories"
  on public.daily_burned_calories for all
  using (auth.uid() = user_id);

create policy "Users can manage own macro goals"
  on public.macro_goals for all
  using (auth.uid() = user_id);

-- Follows: Users can manage their own follows
create policy "Users can manage own follows"
  on public.follows for all
  using (auth.uid() = follower_id);

-- Highlights: Users can manage their own, anyone can view
create policy "Users can manage own highlights"
  on public.highlights for all
  using (auth.uid() = user_id);

create policy "Anyone can view highlights"
  on public.highlights for select
  using (true);

-- Promoter codes: Anyone can read active codes (for validation)
create policy "Anyone can view active promoter codes"
  on public.promoter_codes for select
  using (is_active = true);

-- Profile code uses: Users can view their own
create policy "Users can view own code uses"
  on public.profile_code_uses for select
  using (auth.uid() = profile_id);

