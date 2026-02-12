-- Store subscription expiration for "trial ending soon" emails and avoid sending duplicate trial emails.
-- Set by RevenueCat webhook when we receive expiration_at_ms; used by trial-ending-soon Edge Function.

alter table public.profiles
  add column if not exists premium_expires_at timestamptz,
  add column if not exists trial_ending_email_sent_at timestamptz;

comment on column public.profiles.premium_expires_at is 'When the current premium period ends (from RevenueCat webhook). Used for trial-ending-soon emails.';
comment on column public.profiles.trial_ending_email_sent_at is 'When we last sent a "trial ending soon" Loops email for this profile (so we do not send twice).';
