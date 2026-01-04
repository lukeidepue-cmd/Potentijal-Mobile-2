-- Migration 016: Settings Tables
-- Creates all tables needed for the Settings section (Section 10)
-- Includes: user preferences, privacy settings, blocked users, AI trainer settings, nutrition settings

-- =====================================================
-- User Preferences Table
-- =====================================================
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Theme & Display
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  units_weight text not null default 'lbs' check (units_weight in ('lbs', 'kg')),
  units_distance text not null default 'miles' check (units_distance in ('miles', 'km')),
  language text default 'en',
  date_format text default 'MM/DD/YYYY',
  
  -- Training Preferences
  default_workout_mode text, -- References sport_mode enum
  weekly_goal_reset_day int check (weekly_goal_reset_day between 0 and 6), -- 0 = Sunday, 6 = Saturday
  
  -- Progress Graph Defaults
  progress_graph_default_time_range text default '30 Days' check (progress_graph_default_time_range in ('7 Days', '30 Days', '90 Days', '180 Days', '360 Days')),
  progress_graph_default_metric_per_sport jsonb default '{}', -- { "basketball": "Reps", "workout": "Reps x Weight" }
  
  -- History Preferences
  auto_archive_old_workouts boolean default false,
  show_practices boolean default true,
  show_games boolean default true,
  
  -- Notification Preferences (stored as JSONB for flexibility)
  notification_preferences jsonb default '{
    "push_enabled": true,
    "workout_reminders": true,
    "practice_reminders": true,
    "goal_reminders": true,
    "social_follower": true,
    "social_highlight_views": true,
    "ai_trainer_insights": true
  }'::jsonb,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_user_preferences unique (user_id)
);

-- =====================================================
-- User Privacy Settings Table
-- =====================================================
create table if not exists public.user_privacy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Privacy Toggles
  is_private_account boolean not null default false,
  who_can_see_profile text not null default 'everyone' check (who_can_see_profile in ('everyone', 'followers', 'none')),
  who_can_see_highlights text not null default 'everyone' check (who_can_see_highlights in ('everyone', 'followers', 'none')),
  
  -- Discovery Settings
  who_can_find_me text not null default 'everyone' check (who_can_find_me in ('everyone', 'followers', 'none')),
  who_can_follow_me text not null default 'everyone' check (who_can_follow_me in ('everyone', 'none')),
  suggest_me_to_others boolean not null default true,
  
  -- Email Visibility
  email_visibility text not null default 'private' check (email_visibility in ('public', 'private')),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_user_privacy_settings unique (user_id)
);

-- =====================================================
-- Blocked Users Table
-- =====================================================
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  constraint uniq_block unique (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

-- =====================================================
-- AI Trainer Settings Table
-- =====================================================
create table if not exists public.ai_trainer_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- AI Trainer Controls
  enabled boolean not null default true,
  personality text not null default 'balanced' check (personality in ('strict', 'balanced', 'supportive')),
  
  -- Data Access Permissions
  data_access_permissions jsonb default '{
    "use_workouts": true,
    "use_games": true,
    "use_practices": true
  }'::jsonb,
  
  -- Injury & Limitations
  injury_limitation_notes text,
  
  -- Memory Settings
  persistent_memory_enabled boolean not null default true,
  ai_memory_notes jsonb default '[]'::jsonb, -- Array of saved AI notes/memories
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_ai_trainer_settings unique (user_id)
);

-- =====================================================
-- Nutrition Settings Table
-- =====================================================
create table if not exists public.nutrition_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Reset Time
  reset_time_type text not null default 'midnight' check (reset_time_type in ('midnight', 'custom')),
  custom_reset_hour int check (custom_reset_hour between 0 and 23),
  custom_reset_minute int check (custom_reset_minute between 0 and 59),
  
  -- Preferred Units
  preferred_units text default 'imperial' check (preferred_units in ('imperial', 'metric')),
  
  -- Barcode Scanning
  barcode_scanning_enabled boolean not null default true,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint uniq_nutrition_settings unique (user_id)
);

-- =====================================================
-- Triggers for updated_at
-- =====================================================
drop trigger if exists update_user_preferences_updated_at on public.user_preferences;
create trigger update_user_preferences_updated_at
  before update on public.user_preferences
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_user_privacy_settings_updated_at on public.user_privacy_settings;
create trigger update_user_privacy_settings_updated_at
  before update on public.user_privacy_settings
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_ai_trainer_settings_updated_at on public.ai_trainer_settings;
create trigger update_ai_trainer_settings_updated_at
  before update on public.ai_trainer_settings
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_nutrition_settings_updated_at on public.nutrition_settings;
create trigger update_nutrition_settings_updated_at
  before update on public.nutrition_settings
  for each row
  execute function update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all settings tables
alter table public.user_preferences enable row level security;
alter table public.user_privacy_settings enable row level security;
alter table public.blocked_users enable row level security;
alter table public.ai_trainer_settings enable row level security;
alter table public.nutrition_settings enable row level security;

-- User Preferences: Users can manage their own
create policy "Users can manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id);

-- Privacy Settings: Users can manage their own
create policy "Users can manage own privacy settings"
  on public.user_privacy_settings for all
  using (auth.uid() = user_id);

-- Blocked Users: Users can manage their own blocks
create policy "Users can manage own blocked users"
  on public.blocked_users for all
  using (auth.uid() = blocker_id);

-- Blocked Users: Users can see if they are blocked (for privacy checks)
create policy "Users can see if they are blocked"
  on public.blocked_users for select
  using (auth.uid() = blocked_id);

-- AI Trainer Settings: Users can manage their own
create policy "Users can manage own AI trainer settings"
  on public.ai_trainer_settings for all
  using (auth.uid() = user_id);

-- Nutrition Settings: Users can manage their own
create policy "Users can manage own nutrition settings"
  on public.nutrition_settings for all
  using (auth.uid() = user_id);

-- =====================================================
-- Indexes for Performance
-- =====================================================
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);
create index if not exists idx_user_privacy_settings_user_id on public.user_privacy_settings(user_id);
create index if not exists idx_blocked_users_blocker_id on public.blocked_users(blocker_id);
create index if not exists idx_blocked_users_blocked_id on public.blocked_users(blocked_id);
create index if not exists idx_ai_trainer_settings_user_id on public.ai_trainer_settings(user_id);
create index if not exists idx_nutrition_settings_user_id on public.nutrition_settings(user_id);

