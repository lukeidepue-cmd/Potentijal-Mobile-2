-- Track "trial one week remaining" email so we send it only once per user.
-- Used by trial-ending-soon Edge Function when premium_expires_at is ~7 days away.

alter table public.profiles
  add column if not exists trial_one_week_email_sent_at timestamptz;

comment on column public.profiles.trial_one_week_email_sent_at is 'When we sent the "trial one week remaining" Loops email (so we do not send twice).';
