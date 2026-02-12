-- Store whether current premium period is trial or paid (normal). Used so we send:
-- trial_ending_soon only for free trial ending in 1 day; trial_one_week_remaining only for paid subscription renewing in ~1 week.
-- Set by RevenueCat webhook from event.period_type (TRIAL -> trial, NORMAL/INTRO/etc. -> normal).

alter table public.profiles
  add column if not exists premium_period_type text;

comment on column public.profiles.premium_period_type is 'Current period: trial (free trial) or normal (paid). From RevenueCat period_type. Drives which reminder emails we send.';
